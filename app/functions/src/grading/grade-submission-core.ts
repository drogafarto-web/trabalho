import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../lib/logger.js';
import { extractContent } from './extract-content.js';
import { gradeWithGemini, GradingError } from './gemini-client.js';

/**
 * Core de correção — lê submissão + disciplina, chama Gemini, grava
 * resultado. Compartilhado entre trigger automático e callable manual
 * para retry.
 */

export interface CoreGradingResult {
  ok: boolean;
  durationMs: number;
  finalScore?: number;
  errorCode?: string;
}

export async function performGrading(params: {
  submissionId: string;
  apiKey: string;
  actorUid: string | null; // null = trigger automático
}): Promise<CoreGradingResult> {
  const { submissionId, apiKey, actorUid } = params;
  const db = getFirestore();
  const submissionRef = db.collection('submissions').doc(submissionId);
  const startedAt = Date.now();

  // 1. Marca como processando
  await submissionRef.update({
    status: 'AI_PROCESSING',
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    // 2. Lê submissão
    const snap = await submissionRef.get();
    if (!snap.exists) {
      throw new GradingError('UNKNOWN', `Submissão ${submissionId} não encontrada`);
    }
    const submission = snap.data() as {
      disciplineId: string;
      rubricVersion: number;
      file: { storagePath: string; mimeType: string };
    };

    // 3. Lê disciplina (com rubrica snapshot)
    const disciplineSnap = await db
      .collection('disciplines')
      .doc(submission.disciplineId)
      .get();
    if (!disciplineSnap.exists) {
      throw new GradingError('UNKNOWN', 'Disciplina não existe mais');
    }
    const discipline = disciplineSnap.data() as {
      name: string;
      course: string;
      rubric: {
        criteria: Array<{ name: string; description: string; weight: number }>;
        questions: Array<{ text: string }>;
        customRules: string | null;
      };
    };

    // 4. Extrai conteúdo do arquivo
    const content = await extractContent({
      storagePath: submission.file.storagePath,
      mimeType: submission.file.mimeType,
    });

    // 5. Chama Gemini
    const result = await gradeWithGemini({
      apiKey,
      ctx: {
        disciplineName: discipline.name,
        course: discipline.course,
        rubric: discipline.rubric,
      },
      content,
    });

    // 6. Grava avaliação + muda status
    await submissionRef.update({
      status: 'PENDING_REVIEW',
      ai: {
        processedAt: FieldValue.serverTimestamp(),
        model: result.model,
        durationMs: result.durationMs,
        extractedText: result.evaluation.texto_extraido.slice(0, 50_000),
        truncationNotice: result.truncationNotice,
        evaluation: {
          criterionScores: extractCriterionScores(
            result.evaluation.avaliacao,
            discipline.rubric.criteria.map((c) => c.name),
          ),
          finalScore: roundScore(result.evaluation.avaliacao['nota_final'] ?? 0),
          answers: result.evaluation.respostas,
          report: result.evaluation.relatorio,
        },
        error: null,
      },
      plagiarism: {
        aiProbability: roundScore(result.evaluation.plagio.indice_uso_ia, 2),
        similarityScore: 0, // preenchido na Fase 7 (F-SYS-02)
        topMatches: [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 7. Audit log
    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      actorUid: actorUid,
      actorRole: actorUid ? 'professor' : 'system',
      event: 'submission.graded_by_ai',
      targetType: 'submission',
      targetId: submissionId,
      metadata: {
        model: result.model,
        durationMs: result.durationMs,
        contentKind: content.kind,
        finalScore: result.evaluation.avaliacao['nota_final'],
      },
      ip: null,
      userAgent: null,
    });

    logger.info(
      {
        submissionId,
        durationMs: Date.now() - startedAt,
        finalScore: result.evaluation.avaliacao['nota_final'],
      },
      '[grading] success',
    );

    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      finalScore: result.evaluation.avaliacao['nota_final'],
    };
  } catch (err) {
    const errorCode = err instanceof GradingError ? err.code : 'UNKNOWN';
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error(
      { submissionId, errorCode, errorMessage },
      '[grading] failed',
    );

    // Volta status pra WAITING_FOR_AI e registra erro
    await submissionRef.update({
      status: 'WAITING_FOR_AI',
      ai: {
        processedAt: Timestamp.now(),
        error: errorMessage.slice(0, 500),
        evaluation: null,
        extractedText: null,
        truncationNotice: null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      actorUid,
      actorRole: actorUid ? 'professor' : 'system',
      event: 'submission.grading_failed',
      targetType: 'submission',
      targetId: submissionId,
      metadata: { errorCode, errorMessage: errorMessage.slice(0, 200) },
      ip: null,
      userAgent: null,
    });

    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      errorCode,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCriterionScores(
  avaliacao: Record<string, number>,
  criterionNames: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of criterionNames) {
    const v = avaliacao[name];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      out[name] = roundScore(v);
    }
  }
  return out;
}

function roundScore(n: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
