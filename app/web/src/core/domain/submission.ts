import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schemas da submissão (trabalho entregue).
 * Fonte canônica: docs/04_schema_json.md §6.
 *
 * Fase 4 trata apenas da CRIAÇÃO (aluno enviando). Campos de
 * avaliação (ai, review, plagiarism) são zerados/null — preenchidos
 * nas Fases 5 (IA) e 6 (review).
 */

export const SubmissionStatusSchema = z.enum([
  'WAITING_FOR_AI',
  'AI_PROCESSING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionStudentRefSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(2)
    .max(80)
    .transform((s) => s.trim().toUpperCase()),
});
export type SubmissionStudentRef = z.infer<typeof SubmissionStudentRefSchema>;

export const SubmitterSchema = z.object({
  whatsapp: z
    .string()
    .regex(
      /^(\+?55)?\d{10,11}$/,
      'WhatsApp inválido — use DDD + número (ex: 31999999999)',
    ),
  email: z.string().email('E-mail inválido'),
});
export type Submitter = z.infer<typeof SubmitterSchema>;

export const SubmissionFileSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(45 * 1024 * 1024),
});
export type SubmissionFile = z.infer<typeof SubmissionFileSchema>;

/** Payload mínimo que o aluno preenche no form (3 passos). */
export const SubmissionInputSchema = z.object({
  disciplineId: z.string().min(1, 'Selecione uma disciplina'),
  students: z
    .array(SubmissionStudentRefSchema)
    .min(1, 'Adicione pelo menos 1 aluno')
    .max(3, 'Máximo 3 alunos por grupo'),
  submitter: SubmitterSchema,
});
export type SubmissionInput = z.infer<typeof SubmissionInputSchema>;

// ---------------------------------------------------------------------------
// AI evaluation (preenchido na Fase 5)
// ---------------------------------------------------------------------------
export const EvaluationSchema = z.object({
  criterionScores: z.record(z.string(), z.number()),
  finalScore: z.number(),
  answers: z.array(z.string()),
  report: z.string(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const AiDataSchema = z
  .object({
    processedAt: z.instanceof(Timestamp).nullable().optional(),
    model: z.string().optional(),
    durationMs: z.number().nullable().optional(),
    extractedText: z.string().nullable().optional(),
    truncationNotice: z.string().nullable().optional(),
    evaluation: EvaluationSchema.nullable().optional(),
    error: z.string().nullable().optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Review (preenchido quando professor publica ou devolve — Fase 6)
// ---------------------------------------------------------------------------
export const ReviewDataSchema = z
  .object({
    reviewedAt: z.instanceof(Timestamp).nullable().optional(),
    reviewedByUid: z.string().nullable().optional(),
    finalEvaluation: EvaluationSchema.nullable().optional(),
    professorFeedback: z.string().nullable().optional(),
    manuallyAdjusted: z.boolean().optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Plagiarism (preenchido na Fase 5/7)
// ---------------------------------------------------------------------------
export const PlagiarismSchema = z
  .object({
    aiProbability: z.number().optional(),
    similarityScore: z.number().optional(),
    topMatches: z
      .array(z.object({ submissionId: z.string(), jaccard: z.number() }))
      .optional(),
  })
  .optional();

/**
 * Documento completo como fica no Firestore após criação + avaliação + review.
 */
export const SubmissionSchema = z.object({
  id: z.string().min(1),
  shortId: z.string().regex(/^TRAB-[A-Z2-9]{4}$/),
  disciplineId: z.string().min(1),
  disciplineOwnerUid: z.string().min(1),
  rubricVersion: z.number().int().nonnegative(),
  students: z.array(SubmissionStudentRefSchema).min(1).max(3),
  submitter: SubmitterSchema,
  file: SubmissionFileSchema,
  status: SubmissionStatusSchema,
  ai: AiDataSchema,
  review: ReviewDataSchema,
  plagiarism: PlagiarismSchema,
  submittedAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Submission = z.infer<typeof SubmissionSchema>;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export const MAX_FILE_SIZE_BYTES = 45 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 45;

export function isAcceptedMime(mime: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

export function fileExtension(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m ? (m[1]?.toLowerCase() ?? '') : '';
}

// ---------------------------------------------------------------------------
// Sanitização de nome de arquivo pro Storage path
// ---------------------------------------------------------------------------
export function sanitizeFileName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .slice(0, 100);
}
