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

/**
 * URL submetida como entrega (ex: link de YouTube).
 * `kind` é inferido client-side; mantido no doc pra reprocessamento futuro
 * não precisar re-detectar.
 */
export const SUBMITTED_URL_KINDS = ['youtube'] as const;
export const SubmittedUrlKindSchema = z.enum(SUBMITTED_URL_KINDS);
export type SubmittedUrlKind = z.infer<typeof SubmittedUrlKindSchema>;

export const SubmittedUrlSchema = z.object({
  url: z.string().url('URL inválida'),
  kind: SubmittedUrlKindSchema,
});
export type SubmittedUrl = z.infer<typeof SubmittedUrlSchema>;

/** Payload mínimo que o aluno preenche no form. */
export const SubmissionInputSchema = z.object({
  disciplineId: z.string().min(1, 'Selecione uma disciplina'),
  assignmentId: z.string().min(1, 'Selecione uma atividade'),
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
  /** Nota da rubrica (0-10). Base universal — usada em KPIs/médias. */
  finalScore: z.number(),
  /**
   * Nota escalada pelo `maxScore` da atividade (0-maxScore). Opcional porque
   * submissões pré-Fase 4 não têm. Exibir junto ao finalScore quando presente.
   */
  scaledScore: z.number().optional(),
  /** Valor de referência usado no escalamento. Snapshot do assignment.maxScore. */
  maxScore: z.number().optional(),
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
 *
 * Uma submissão tem `file` OU `submittedUrl` — não ambos. Submissões pré-Fase 4.3
 * têm `file` obrigatório; o `nullable()` é pra compat com entregas por URL
 * (YouTube etc) sem forçar upload de placeholder.
 */
export const SubmissionSchema = z
  .object({
    id: z.string().min(1),
    shortId: z.string().regex(/^TRAB-[A-Z2-9]{4}$/),
    disciplineId: z.string().min(1),
    disciplineOwnerUid: z.string().min(1),
    assignmentId: z.string().min(1),
    rubricVersion: z.number().int().nonnegative(),
    students: z.array(SubmissionStudentRefSchema).min(1).max(3),
    submitter: SubmitterSchema,
    file: SubmissionFileSchema.nullable(),
    submittedUrl: SubmittedUrlSchema.nullable().optional(),
    status: SubmissionStatusSchema,
    ai: AiDataSchema,
    review: ReviewDataSchema,
    plagiarism: PlagiarismSchema,
    submittedAt: z.instanceof(Timestamp),
    updatedAt: z.instanceof(Timestamp),
  })
  .refine((s) => s.file !== null || (s.submittedUrl != null && s.submittedUrl.url), {
    message: 'Submissão precisa ter arquivo ou URL',
    path: ['file'],
  });
export type Submission = z.infer<typeof SubmissionSchema>;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export const ACCEPTED_FORMATS_LABEL = 'PDF, DOCX, JPG ou PNG';

export const MAX_FILE_SIZE_BYTES = 45 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 45;

export function isAcceptedMime(mime: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'jpg', 'jpeg', 'png'] as const;

/**
 * Valida por mime + fallback pra extensão. Windows ocasionalmente reporta
 * docx como `application/octet-stream`, o que quebraria a validação por mime só.
 */
export function isAcceptedFile(file: File): boolean {
  if (isAcceptedMime(file.type)) return true;
  const ext = fileExtension(file.name);
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
}

export function fileExtension(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m ? (m[1]?.toLowerCase() ?? '') : '';
}

// ---------------------------------------------------------------------------
// Detecção de URL de YouTube
// ---------------------------------------------------------------------------
const YOUTUBE_REGEX =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[\w-]+/i;

export function detectUrlKind(rawUrl: string): SubmittedUrlKind | null {
  const trimmed = rawUrl.trim();
  if (YOUTUBE_REGEX.test(trimmed)) return 'youtube';
  return null;
}

export function URL_KIND_LABEL(kind: SubmittedUrlKind): string {
  switch (kind) {
    case 'youtube':
      return 'YouTube';
  }
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
