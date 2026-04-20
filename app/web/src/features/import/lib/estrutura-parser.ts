/**
 * Parser + validador da planilha `estrutura.xlsx`.
 *
 * Abas aceitas: Disciplinas, Etapas, Atividades (Leia-me é ignorada).
 * Cada linha vira um ParsedRow<T> com status 'ok' ou 'error' + razão.
 * Erros por linha NÃO abortam o parse — o preview mostra todos juntos.
 */

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import {
  DisciplineInputSchema,
  type Criterion,
  type Question,
  type Rubric,
} from '@/core/domain/discipline';
import {
  AssignmentInputSchema,
  KIND_DEFAULT_SCORE,
} from '@/core/domain/assignment';
import type {
  AssignmentRowData,
  DisciplineRowData,
  TermRowData,
} from './types.js';
import {
  asBool,
  asDate,
  asNumber,
  asString,
  type RawRow,
  type WorkbookData,
} from './xlsx-parser.js';

export type ParsedRow<T> =
  | { rowNumber: number; status: 'ok'; data: T }
  | { rowNumber: number; status: 'error'; data: null; reason: string };

export interface EstruturaParseResult {
  disciplines: ParsedRow<DisciplineRowData>[];
  terms: ParsedRow<TermRowData>[];
  assignments: ParsedRow<AssignmentRowData>[];
  globalErrors: string[];
}

const SHEET_ALIASES: Record<'disciplines' | 'terms' | 'assignments', string[]> = {
  disciplines: ['Disciplinas', 'disciplines', 'Disciplines'],
  terms: ['Etapas', 'terms', 'Terms'],
  assignments: ['Atividades', 'assignments', 'Assignments'],
};

export function parseEstruturaWorkbook(wb: WorkbookData): EstruturaParseResult {
  const globalErrors: string[] = [];

  const disciplinesRows = pickSheet(wb, SHEET_ALIASES.disciplines);
  const termsRows = pickSheet(wb, SHEET_ALIASES.terms);
  const assignmentsRows = pickSheet(wb, SHEET_ALIASES.assignments);

  if (!disciplinesRows && !termsRows && !assignmentsRows) {
    globalErrors.push(
      'Nenhuma aba reconhecida. Esperado: Disciplinas, Etapas, Atividades.',
    );
  }

  const disciplines = parseDisciplines(disciplinesRows ?? []);
  const terms = parseTerms(termsRows ?? []);
  const assignments = parseAssignments(assignmentsRows ?? []);

  return { disciplines, terms, assignments, globalErrors };
}

// ---------------------------------------------------------------------------
// Disciplinas
// ---------------------------------------------------------------------------
function parseDisciplines(rows: RawRow[]): ParsedRow<DisciplineRowData>[] {
  return rows
    .map((row, i) => {
      const rowNumber = i + 2; // header é linha 1
      if (isEmptyRow(row)) return null;

      const code = asString(row['code']);
      const name = asString(row['name']);
      const course = asString(row['course']);
      const period = asString(row['period']);
      const semester = asString(row['semester']);

      if (!code || !name) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: 'Linha sem code ou name — ignorada.',
        };
      }

      const rubric = buildRubric(row);
      if (rubric.error) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: rubric.error,
        };
      }

      const input = {
        name,
        code,
        course,
        period,
        semester,
        rubric: rubric.value,
      };

      const parsed = DisciplineInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: summarizeZodError(parsed.error),
        };
      }

      return {
        rowNumber,
        status: 'ok' as const,
        data: { ...parsed.data, code: parsed.data.code } as DisciplineRowData,
      };
    })
    .filter((x): x is ParsedRow<DisciplineRowData> => x !== null);
}

function buildRubric(
  row: RawRow,
): { value: Rubric; error?: undefined } | { error: string; value?: undefined } {
  const criteria: Criterion[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = asString(row[`criterio_${String(i)}_nome`]);
    const description = asString(row[`criterio_${String(i)}_descricao`]);
    const weight = asNumber(row[`criterio_${String(i)}_peso`]);
    if (!name && !description && weight == null) continue;
    if (!name || !description || weight == null) {
      return {
        error: `Critério ${String(i)} incompleto — preencha nome, descrição e peso (ou deixe tudo vazio).`,
      };
    }
    criteria.push({
      id: crypto.randomUUID(),
      name,
      description,
      weight: Math.round(weight),
      order: i - 1,
    });
  }

  if (criteria.length < 2) {
    return { error: 'A rubrica precisa de ao menos 2 critérios.' };
  }

  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  if (sum !== 10) {
    return { error: `Soma dos pesos = ${String(sum)}, esperado 10.` };
  }

  const questions: Question[] = [];
  for (let i = 1; i <= 3; i++) {
    const text = asString(row[`pergunta_${String(i)}`]);
    if (text) {
      questions.push({ id: crypto.randomUUID(), text, order: i - 1 });
    }
  }
  if (questions.length === 0) {
    // Pergunta mínima default — schema exige 1
    questions.push({
      id: crypto.randomUUID(),
      text: 'Qual a principal conclusão do trabalho?',
      order: 0,
    });
  }

  const customRules = asString(row['regras_customizadas']);

  return {
    value: {
      criteria,
      questions,
      customRules: customRules ?? null,
      version: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------
function parseTerms(rows: RawRow[]): ParsedRow<TermRowData>[] {
  return rows
    .map((row, i) => {
      const rowNumber = i + 2;
      if (isEmptyRow(row)) return null;

      const disciplineCode = asString(row['discipline_code']);
      const year = asNumber(row['year']);
      const number = asNumber(row['number']);
      const label = asString(row['label']);
      const startsAt = asDate(row['starts_at']);
      const endsAt = asDate(row['ends_at']);

      if (!disciplineCode || year == null || number == null) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: 'Linha precisa de discipline_code, year e number.',
        };
      }

      const input = {
        year: Math.round(year),
        number: Math.round(number),
        ...(label ? { label } : {}),
        startsAt: startsAt ? Timestamp.fromDate(startsAt) : null,
        endsAt: endsAt ? Timestamp.fromDate(endsAt) : null,
      };

      const data: TermRowData = {
        ...input,
        disciplineCode,
        disciplineId: null, // resolvido no diff
      };

      return { rowNumber, status: 'ok' as const, data };
    })
    .filter((x): x is ParsedRow<TermRowData> => x !== null);
}

// ---------------------------------------------------------------------------
// Atividades
// ---------------------------------------------------------------------------
function parseAssignments(rows: RawRow[]): ParsedRow<AssignmentRowData>[] {
  return rows
    .map((row, i) => {
      const rowNumber = i + 2;
      if (isEmptyRow(row)) return null;

      const disciplineCode = asString(row['discipline_code']);
      const termYear = asNumber(row['term_year']);
      const termNumber = asNumber(row['term_number']);
      const kindRaw = asString(row['kind'])?.toLowerCase();
      const title = asString(row['title']);
      const description = asString(row['description']);
      const maxScoreRaw = asNumber(row['max_score']);
      const modeRaw = asString(row['mode'])?.toLowerCase();
      const maxGroupSize = asNumber(row['max_group_size']);
      const acceptsFile = asBool(row['accepts_file']);
      const acceptsUrl = asBool(row['accepts_url']);
      const dueAt = asDate(row['due_at']);
      const statusRaw = asString(row['status'])?.toLowerCase();

      if (!disciplineCode || termYear == null || termNumber == null) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: 'Linha precisa de discipline_code + term_year + term_number.',
        };
      }
      if (!title) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: 'Linha sem title.',
        };
      }
      if (kindRaw !== 'trabalho' && kindRaw !== 'aeco') {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: `kind inválido: "${String(kindRaw)}". Use "trabalho" ou "aeco".`,
        };
      }
      const mode = modeRaw === 'group' ? 'group' : 'individual';
      const maxScore = maxScoreRaw ?? KIND_DEFAULT_SCORE[kindRaw];
      const status = ['draft', 'open', 'closed'].includes(statusRaw ?? '')
        ? (statusRaw as 'draft' | 'open' | 'closed')
        : 'open';

      const input = {
        disciplineId: 'resolved-at-diff', // placeholder pra validar schema, real vem depois
        termId: 'resolved-at-diff',
        kind: kindRaw,
        title,
        description: description ?? null,
        maxScore,
        mode,
        ...(mode === 'group' ? { maxGroupSize: maxGroupSize ?? 5 } : {}),
        accepts: {
          file: acceptsFile ?? true,
          url: acceptsUrl ?? false,
        },
        dueAt: dueAt ? Timestamp.fromDate(dueAt) : null,
        status,
      };

      const parsed = AssignmentInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          rowNumber,
          status: 'error' as const,
          data: null,
          reason: summarizeZodError(parsed.error),
        };
      }

      const data: AssignmentRowData = {
        ...parsed.data,
        disciplineCode,
        termYear: Math.round(termYear),
        termNumber: Math.round(termNumber),
        disciplineId: null,
        termId: null,
      };

      return { rowNumber, status: 'ok' as const, data };
    })
    .filter((x): x is ParsedRow<AssignmentRowData> => x !== null);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pickSheet(wb: WorkbookData, aliases: string[]): RawRow[] | null {
  for (const alias of aliases) {
    if (alias in wb && Array.isArray(wb[alias])) return wb[alias];
  }
  return null;
}

function isEmptyRow(row: RawRow): boolean {
  return Object.values(row).every((v) => v == null || v === '');
}

function summarizeZodError(err: z.ZodError): string {
  const issues = err.issues.slice(0, 3).map((i) => {
    const path = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
    return `${path}${i.message}`;
  });
  const extra = err.issues.length > 3 ? ` (+${String(err.issues.length - 3)})` : '';
  return issues.join('; ') + extra;
}
