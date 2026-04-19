import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../lib/logger.js';
import { performGrading } from './grade-submission-core.js';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REGION = 'southamerica-east1';

// ===========================================================================
//  Trigger automático: dispara ao criar submission com status WAITING_FOR_AI
// ===========================================================================
export const onSubmissionCreated = onDocumentCreated(
  {
    document: 'submissions/{submissionId}',
    region: REGION,
    secrets: [GEMINI_API_KEY],
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

    logger.info({ submissionId }, '[trigger] iniciando grading automático');

    await performGrading({
      submissionId,
      apiKey: GEMINI_API_KEY.value(),
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
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 300,
    memory: '1GiB',
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

    // 6. Executa o grading
    const result = await performGrading({
      submissionId,
      apiKey: GEMINI_API_KEY.value(),
      actorUid: request.auth.uid,
    });

    if (!result.ok) {
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
