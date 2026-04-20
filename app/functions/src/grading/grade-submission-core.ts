import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../lib/logger.js';
import { extractContent } from './extract-content.js';
import { buildProvider, buildProviderFromConfig } from './providers/factory.js';
import { ProviderError } from './providers/types.js';
import { readLlmConfig } from '../admin/llm-config-store.js';
import { computeSimilarityForSubmission } from '../similarity/compute-similarity.js';

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
  actorUid: string | null; // null = trigger automático
}): Promise<CoreGradingResult> {
  const { submissionId, actorUid } = params;
  const db = getFirestore();
  const submissionRef = db.collection('submissions').doc(submissionId);
  const startedAt = Date.now();

  // 1. Constrói o provider ativo (Gemini, Anthropic ou Qwen).
  //    Prioridade: config gravado pela UI /config > env var (Secret Manager).
  const runtimeCfg = await readLlmConfig();
  const provider = runtimeCfg
    ? buildProviderFromConfig(runtimeCfg)
    : buildProvider();

  if (!provider.isConfigured()) {
    logger.warn(
      { submissionId, provider: provider.name },
      '[grading] provider não configurado, abortando',
    );
    await submissionRef.update({
      status: 'WAITING_FOR_AI',
      ai: {
        processedAt: Timestamp.now(),
        error: `Provider ${provider.name} sem credenciais. Configure no menu /config.`,
        evaluation: null,
        extractedText: null,
        truncationNotice: null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: false, durationMs: Date.now() - startedAt, errorCode: 'NOT_CONFIGURED' };
  }

  // 2. Marca como processando
  await submissionRef.update({
    status: 'AI_PROCESSING',
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    // 3. Lê submissão
    const snap = await submissionRef.get();
    if (!snap.exists) {
      throw new ProviderError('UNKNOWN', `Submissão ${submissionId} não encontrada`);
    }
    const submission = snap.data() as {
      disciplineId: string;
      assignmentId?: string;
      rubricVersion: number;
      file: { storagePath: string; mimeType: string } | null;
      submittedUrl?: { url: string; kind: 'youtube' } | null;
    };

    // Snapshot do maxScore pra escalamento. Submissões legadas sem
    // assignmentId → fallback 10 (nota fica igual à nota-rubrica).
    let maxScore = 10;
    if (submission.assignmentId) {
      const assignmentSnap = await db
        .collection('assignments')
        .doc(submission.assignmentId)
        .get();
      if (assignmentSnap.exists) {
        const data = assignmentSnap.data() as { maxScore?: number };
        if (typeof data.maxScore === 'number' && data.maxScore > 0) {
          maxScore = data.maxScore;
        }
      } else {
        logger.warn(
          { submissionId, assignmentId: submission.assignmentId },
          '[grading] assignment não encontrado — escalamento usa fallback 10',
        );
      }
    }

    // 4. Lê disciplina (com rubrica snapshot)
    const disciplineSnap = await db
      .collection('disciplines')
      .doc(submission.disciplineId)
      .get();
    if (!disciplineSnap.exists) {
      throw new ProviderError('UNKNOWN', 'Disciplina não existe mais');
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

    // 5. Extrai conteúdo (arquivo ou URL)
    if (!submission.file && !submission.submittedUrl) {
      throw new ProviderError(
        'UNSUPPORTED_CONTENT',
        'Submissão sem arquivo ou URL — dado inconsistente.',
      );
    }
    const content = submission.file
      ? await extractContent({
          kind: 'file',
          storagePath: submission.file.storagePath,
          mimeType: submission.file.mimeType,
        })
      : await extractContent({
          kind: 'url',
          url: submission.submittedUrl!.url,
          urlKind: submission.submittedUrl!.kind,
        });

    // 6. Chama o provider ativo
    const result = await provider.grade({
      ctx: {
        disciplineName: discipline.name,
        course: discipline.course,
        rubric: discipline.rubric,
      },
      content,
    });

    // 6. Grava avaliação + muda status
    const rubricScore = roundScore(result.evaluation.avaliacao['nota_final'] ?? 0);
    const scaledScore = roundScore((rubricScore * maxScore) / 10);
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
          finalScore: rubricScore,
          scaledScore,
          maxScore,
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

    // 7. Análise de similaridade entre grupos (F-SYS-02)
    // Não falha o grading se der erro — é auxiliar
    let similarityMaxJaccard = 0;
    try {
      const simResult = await computeSimilarityForSubmission({
        submissionId,
        disciplineId: submission.disciplineId,
        targetText: result.evaluation.texto_extraido,
      });
      similarityMaxJaccard = simResult.maxJaccard;
    } catch (simErr) {
      logger.warn(
        { submissionId, err: simErr instanceof Error ? simErr.message : String(simErr) },
        '[similarity] falha, seguindo sem bloquear grading',
      );
    }

    // 8. Audit log
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
        similarityMaxJaccard,
      },
      ip: null,
      userAgent: null,
    });

    logger.info(
      {
        submissionId,
        durationMs: Date.now() - startedAt,
        rubricScore,
        scaledScore,
        maxScore,
      },
      '[grading] success',
    );

    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      finalScore: rubricScore,
    };
  } catch (err) {
    const errorCode = err instanceof ProviderError ? err.code : 'UNKNOWN';
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
