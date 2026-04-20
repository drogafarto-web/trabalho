import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Etapa (1ª/2ª/3ª) — agrupador temporal de atividades dentro de uma disciplina.
 * Escopada por disciplina porque o professor pode lecionar em múltiplas
 * instituições com calendários diferentes; uma etapa global misturaria
 * calendários e quebraria o agrupamento de atividades.
 */

export const TermSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  disciplineId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  number: z.number().int().min(1).max(8),
  label: z.string().min(1).max(60),
  startsAt: z.instanceof(Timestamp).nullable(),
  endsAt: z.instanceof(Timestamp).nullable(),
  status: z.enum(['active', 'archived']),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Term = z.infer<typeof TermSchema>;

export const TermInputSchema = z
  .object({
    year: z.number().int().min(2020).max(2100),
    number: z.number().int().min(1).max(8),
    label: z.string().min(1).max(60).optional(),
    startsAt: z.instanceof(Timestamp).nullable().optional(),
    endsAt: z.instanceof(Timestamp).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.startsAt && v.endsAt && v.endsAt.toMillis() < v.startsAt.toMillis()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fim deve ser depois do início',
        path: ['endsAt'],
      });
    }
  });
export type TermInput = z.infer<typeof TermInputSchema>;

export function defaultTermLabel(number: number, year: number): string {
  const ord = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª'][number - 1] ?? `${number}ª`;
  return `${ord} etapa ${year}`;
}
