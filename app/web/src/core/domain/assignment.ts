import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Atividade (Trabalho ou AECO).
 * Um aluno entrega arquivos/URLs vinculados a uma assignment.
 *
 * A IA usa a rubrica da disciplina (0–10) e o resultado é escalado pra
 * `maxScore` da atividade no momento do grading.
 */

export const AssignmentKindSchema = z.enum(['trabalho', 'aeco']);
export type AssignmentKind = z.infer<typeof AssignmentKindSchema>;

export const AssignmentModeSchema = z.enum(['individual', 'group']);
export type AssignmentMode = z.infer<typeof AssignmentModeSchema>;

export const AssignmentStatusSchema = z.enum(['draft', 'open', 'closed']);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const AcceptedFormatsSchema = z
  .object({
    file: z.boolean(),
    url: z.boolean(),
  })
  .refine((v) => v.file || v.url, {
    message: 'Aceite ao menos um formato (arquivo ou URL)',
  });
export type AcceptedFormats = z.infer<typeof AcceptedFormatsSchema>;

export const AssignmentSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  disciplineId: z.string().min(1),
  termId: z.string().min(1),

  kind: AssignmentKindSchema,
  title: z.string().min(2).max(120),
  description: z.string().max(2000).nullable(),

  /** Nota máxima da atividade (ex: 8 pra trabalho, 2 pra AECO). */
  maxScore: z.number().min(0.5).max(100),

  mode: AssignmentModeSchema,
  /** Só faz sentido se mode === 'group'. Default 5. */
  maxGroupSize: z.number().int().min(2).max(10),

  accepts: AcceptedFormatsSchema,

  dueAt: z.instanceof(Timestamp).nullable(),
  status: AssignmentStatusSchema,

  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const AssignmentInputSchema = z
  .object({
    disciplineId: z.string().min(1, 'Selecione uma disciplina'),
    termId: z.string().min(1, 'Selecione uma etapa'),
    kind: AssignmentKindSchema,
    title: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120),
    description: z.string().max(2000).optional().nullable(),
    maxScore: z.number().min(0.5).max(100),
    mode: AssignmentModeSchema,
    maxGroupSize: z.number().int().min(2).max(10).optional(),
    accepts: AcceptedFormatsSchema,
    dueAt: z.instanceof(Timestamp).nullable().optional(),
    status: AssignmentStatusSchema.default('open'),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'group' && (v.maxGroupSize ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Grupo precisa de tamanho ≥ 2',
        path: ['maxGroupSize'],
      });
    }
  });
export type AssignmentInput = z.infer<typeof AssignmentInputSchema>;

export const KIND_LABELS: Record<AssignmentKind, string> = {
  trabalho: 'Trabalho',
  aeco: 'AECO',
};

export const KIND_DEFAULT_SCORE: Record<AssignmentKind, number> = {
  trabalho: 8,
  aeco: 2,
};
