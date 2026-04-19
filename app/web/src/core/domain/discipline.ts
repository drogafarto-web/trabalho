import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schemas de domínio para disciplinas.
 * Fonte canônica: docs/04_schema_json.md §3.
 *
 * Regras não-óbvias:
 *  - Soma dos pesos da rubrica deve ser EXATAMENTE 10 (validação F-PR-04)
 *  - `customRules` é sanitizado server-side antes de ir para o prompt Gemini
 *  - `rubric.version` é bump-ado a cada edição (copy-on-write nas submissões)
 */

export const COURSES = ['Farmácia', 'Biomedicina', 'Outro'] as const;
export type Course = (typeof COURSES)[number];

export const PERIODS = [
  '1º', '2º', '3º', '4º', '5º',
  '6º', '7º', '8º', '9º', '10º',
] as const;
export type Period = (typeof PERIODS)[number];

// ---------------------------------------------------------------------------
// Critério (item da rubrica)
// ---------------------------------------------------------------------------
export const CriterionSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, 'Use apenas letras minúsculas, números e _')
    .min(2)
    .max(40),
  description: z.string().min(3).max(200),
  weight: z.number().int().min(0).max(10),
  order: z.number().int().nonnegative(),
});
export type Criterion = z.infer<typeof CriterionSchema>;

// ---------------------------------------------------------------------------
// Pergunta (item do questionário)
// ---------------------------------------------------------------------------
export const QuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(3).max(300),
  order: z.number().int().nonnegative(),
});
export type Question = z.infer<typeof QuestionSchema>;

// ---------------------------------------------------------------------------
// Rubrica (agrega critérios + perguntas + regras custom)
// ---------------------------------------------------------------------------
export const RubricSchema = z
  .object({
    criteria: z.array(CriterionSchema).min(2, 'Mínimo 2 critérios').max(10, 'Máximo 10 critérios'),
    questions: z.array(QuestionSchema).min(1, 'Mínimo 1 pergunta').max(10, 'Máximo 10 perguntas'),
    customRules: z.string().max(2000).nullable(),
    version: z.number().int().nonnegative(),
  })
  .superRefine((rubric, ctx) => {
    const sum = rubric.criteria.reduce((s, c) => s + c.weight, 0);
    if (sum !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Soma dos pesos deve ser exatamente 10 (atual: ${sum})`,
        path: ['criteria'],
      });
    }
  });
export type Rubric = z.infer<typeof RubricSchema>;

// ---------------------------------------------------------------------------
// Discipline (documento completo em /disciplines)
// ---------------------------------------------------------------------------
export const DisciplineSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  name: z.string().min(3, 'Mínimo 3 caracteres').max(80),
  code: z
    .string()
    .regex(/^[A-Z]{3,5}-\d{4}\.\d$/, 'Formato: PARA-2026.1 (3-5 letras, ano, semestre)'),
  course: z.enum(COURSES),
  period: z.enum(PERIODS),
  semester: z.string().regex(/^\d{4}\.\d$/, 'Formato: 2026.1'),
  rubric: RubricSchema,
  deadline: z.instanceof(Timestamp).nullable(),
  deletedAt: z.instanceof(Timestamp).nullable(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Discipline = z.infer<typeof DisciplineSchema>;

// ---------------------------------------------------------------------------
// Entrada de formulário (o que o usuário preenche)
// Converte para Discipline no server-side, timestamps são adicionados lá.
// ---------------------------------------------------------------------------
export const DisciplineInputSchema = z.object({
  /** Sempre uppercase (convenção diário escolar). */
  name: z
    .string()
    .min(3)
    .max(80)
    .transform((s) => s.trim().toUpperCase()),
  code: z.string().regex(/^[A-Z]{3,5}-\d{4}\.\d$/),
  course: z.enum(COURSES),
  period: z.enum(PERIODS),
  semester: z.string().regex(/^\d{4}\.\d$/),
  rubric: RubricSchema,
});
export type DisciplineInput = z.infer<typeof DisciplineInputSchema>;

// ---------------------------------------------------------------------------
// Utilitário: gera código default a partir do nome + semestre
//   "Parasitologia Clínica" + "2026.1" → "PARA-2026.1"
// ---------------------------------------------------------------------------
export function suggestCode(name: string, semester: string): string {
  const firstWord = name.trim().split(/\s+/)[0] ?? '';
  const prefix = firstWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
  const safeSemester = /^\d{4}\.\d$/.test(semester) ? semester : '';
  return prefix && safeSemester ? `${prefix}-${safeSemester}` : '';
}

// ---------------------------------------------------------------------------
// Utilitário: rubrica default para uma nova disciplina
// ---------------------------------------------------------------------------
export function defaultRubric(): Rubric {
  return {
    criteria: [
      {
        id: crypto.randomUUID(),
        name: 'conteudo_tecnico',
        description: 'Profundidade técnica e correção do conteúdo',
        weight: 4,
        order: 0,
      },
      {
        id: crypto.randomUUID(),
        name: 'estrutura_apresentacao',
        description: 'Organização, clareza e coerência textual',
        weight: 3,
        order: 1,
      },
      {
        id: crypto.randomUUID(),
        name: 'referencias_fundamentacao',
        description: 'Qualidade das referências e fundamentação científica',
        weight: 3,
        order: 2,
      },
    ],
    questions: [
      {
        id: crypto.randomUUID(),
        text: 'Qual a principal conclusão do trabalho?',
        order: 0,
      },
    ],
    customRules: null,
    version: 0,
  };
}
