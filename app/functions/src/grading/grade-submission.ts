import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../lib/logger.js';
import { performGrading } from './grade-submission-core.js';
import { acquireAssignmentLocks } from '../submissions/acquire-assignment-locks.js';
import { sendSubmissionReceipt } from '../email/send-submission-receipt.js';
import { RESEND_API_KEY } from '../email/resend-client.js';

/**
 * Todos os secrets são opcionais — o deploy não bloqueia se nenhum
 * estiver setado. Em runtime, o provider factory verifica se o
 * secret do provider ativo está presente; se não, retorna erro
 * amigável "provider não configurado".
 *
 * Isso permite deployar o app sem chaves e configurar depois via
 * Fase 9 (UI /config) ou CLI.
 */
/**
 * Estratégia de secrets:
 * - GEMINI_API_KEY: declarado via defineSecret — deploy exige que exista
 *   (o user já criou via `firebase functions:secrets:set`).
 * - Demais (GEMINI_MODEL, ANTHROPIC_*, QWEN_*, AI_PROVIDER): não
 *   declarados aqui. Se o user quiser ativar outro provider, precisa:
 *     1. Criar o secret via CLI
 *     2. Adicionar à lista abaixo
 *     3. Redeploy
 *   Ou esperar a Fase 9 (UI /config) que automatiza isso.
 */
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const ALL_SECRETS = [GEMINI_API_KEY, RESEND_API_KEY];

const REGION = 'southamerica-east1';

// ===========================================================================
//  Trigger automático: dispara ao criar submission com status WAITING_FOR_AI
// ===========================================================================
export const onSubmissionCreated = onDocumentCreated(
  {
    document: 'submissions/{submissionId}',
    region: REGION,
    secrets: ALL_SECRETS,
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  async (event) => {
    const submissionId = event.params['submissionId'];
    const data = event.data?.data();

    if (!submissionId) return;

    if (data?.['status'] !== 'WAITING_FOR_AI') {
      logger.info(
        { submissionId, status: data?.['status'] },
        '[trigger] submissão não está em WAITING_FOR_AI, ignorando',
      );
      return;
    }

    // Anti-duplicata em grupo: adquire locks antes de gradear.
    // Docs legados sem assignmentId (smoke tests pré-Fase 3) pulam locks.
    const assignmentId = typeof data?.['assignmentId'] === 'string'
      ? (data['assignmentId'] as string)
      : null;
    const rawStudents = Array.isArray(data?.['students']) ? data['students'] : [];
    const students = rawStudents
      .map((s: unknown) => {
        if (!s || typeof s !== 'object') return null;
        const obj = s as { id?: unknown; name?: unknown };
        if (typeof obj.id !== 'string' || typeof obj.name !== 'string') return null;
        return { id: obj.id, name: obj.name };
      })
      .filter((x): x is { id: string; name: string } => x !== null);
    const ownerUid = typeof data?.['disciplineOwnerUid'] === 'string'
      ? (data['disciplineOwnerUid'] as string)
      : null;
    const disciplineId = typeof data?.['disciplineId'] === 'string'
      ? (data['disciplineId'] as string)
      : null;

    if (assignmentId && ownerUid && disciplineId && students.length > 0) {
      const lockResult = await acquireAssignmentLocks({
        submissionId,
        assignmentId,
        ownerUid,
        disciplineId,
        students,
      });

      if (!lockResult.ok) {
        const db = getFirestore();
        const reason = lockResult.conflictStudentName
          ? `${lockResult.conflictStudentName} já entregou esta atividade em outra submissão.`
          : 'Aluno já entregou esta atividade em outra submissão.';
        logger.warn(
          {
            submissionId,
            assignmentId,
            conflictSubmissionId: lockResult.conflictSubmissionId,
          },
          '[trigger] conflito de lock — rejeitando submissão',
        );
        await db.collection('submissions').doc(submissionId).update({
          status: 'REJECTED',
          review: {
            reviewedAt: Timestamp.now(),
            reviewedByUid: null,
            finalEvaluation: null,
            professorFeedback: reason,
            manuallyAdjusted: false,
          },
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
    } else {
      logger.warn(
        { submissionId, hasAssignmentId: !!assignmentId },
        '[trigger] dados incompletos pra lock — pulando, prosseguindo com grading',
      );
    }

    // Envia recibo ao aluno — não-bloqueante. Falha aqui não interrompe grading.
    // Idempotência via `receipt_{submissionId}` no Resend evita duplicatas em retry.
    try {
      await sendSubmissionReceipt({ submissionId });
    } catch (receiptErr) {
      logger.warn(
        {
          submissionId,
          err: receiptErr instanceof Error ? receiptErr.message : String(receiptErr),
        },
        '[trigger] falha no envio do recibo — grading segue',
      );
    }

    logger.info({ submissionId }, '[trigger] iniciando grading automático');

    await performGrading({
      submissionId,
      actorUid: null, // system
    });
  },
);

// ===========================================================================
//  Callable manual: professor clica "Reprocessar" ou "Processar pendentes"
// ===========================================================================
const CallableInput = z.object({
  submissionId: z.string().min(1),
  force: z.boolean().default(false),
});

export const gradeSubmission = onCall(
  {
    region: REGION,
    secrets: ALL_SECRETS,
    timeoutSeconds: 300,
    memory: '1GiB',
    cors: true,
  },
  async (request) => {
    // 1. Auth: só professor
    if (!request.auth || request.auth.token['role'] !== 'professor') {
      throw new HttpsError('permission-denied', 'Somente professores.');
    }

    // 2. Valida input
    const parsed = CallableInput.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }
    const { submissionId, force } = parsed.data;

    // 3. Verifica ownership + status
    const db = getFirestore();
    const snap = await db.collection('submissions').doc(submissionId).get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Submissão não encontrada.');
    }

    const sub = snap.data() as {
      disciplineOwnerUid: string;
      status: string;
    };

    if (sub.disciplineOwnerUid !== request.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'Você não é dono desta disciplina.',
      );
    }

    // 4. Se não é force e já foi processado → bloqueia
    if (!force && sub.status !== 'WAITING_FOR_AI') {
      throw new HttpsError(
        'failed-precondition',
        `Submissão já foi processada (status: ${sub.status}). Use force=true para reprocessar.`,
      );
    }

    // 5. Se force: resetar status para WAITING_FOR_AI antes
    if (force) {
      await db.collection('submissions').doc(submissionId).update({
        status: 'WAITING_FOR_AI',
      });
    }

    // 6. Executa o grading (provider é determinado pelo env AI_PROVIDER)
    const result = await performGrading({
      submissionId,
      actorUid: request.auth.uid,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_CONFIGURED') {
        throw new HttpsError(
          'failed-precondition',
          'Nenhum provider de IA configurado. Acesse /config para configurar.',
        );
      }
      throw new HttpsError(
        'internal',
        `Falha ao processar: ${result.errorCode ?? 'UNKNOWN'}`,
      );
    }

    return {
      success: true,
      durationMs: result.durationMs,
      finalScore: result.finalScore,
    };
  },
);
