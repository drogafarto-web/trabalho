import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schemas de domínio para alunos.
 * Fonte canônica: docs/04_schema_json.md §4 e §5.
 *
 * Nota: o aluno é um registro por professor (ownerUid).
 * O vínculo com disciplina é feito pela coleção /discipline_students.
 * Mesmo aluno pode estar em várias disciplinas.
 *
 * Convenção: nome sempre em UPPERCASE (consistente com disciplina).
 */

export const StudentSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  name: z.string().min(2).max(80),
  email: z.string().email().nullable(),
  note: z.string().max(500).nullable(),
  archivedAt: z.instanceof(Timestamp).nullable(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Student = z.infer<typeof StudentSchema>;

export const StudentInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .transform((s) => s.trim().toUpperCase()),
  email: z
    .string()
    .email('E-mail inválido')
    .nullable()
    .or(z.literal('').transform(() => null)),
  note: z.string().max(500).nullable().or(z.literal('').transform(() => null)),
});
export type StudentInput = z.infer<typeof StudentInputSchema>;

// ---------------------------------------------------------------------------
// Junction: discipline_students
// ---------------------------------------------------------------------------
export const DisciplineStudentSchema = z.object({
  disciplineId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(2),
  ownerUid: z.string().min(1),
  addedAt: z.instanceof(Timestamp),
});
export type DisciplineStudent = z.infer<typeof DisciplineStudentSchema>;

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
export function normalizeStudentName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Gera ID composto da junction (determinístico — evita duplicatas). */
export function makeDisciplineStudentId(
  disciplineId: string,
  studentId: string,
): string {
  return `${disciplineId}_${studentId}`;
}

// ---------------------------------------------------------------------------
// Parser de importação (texto colado ou CSV)
// ---------------------------------------------------------------------------

export interface ParsedRow {
  name: string;
  email: string | null;
  note: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: Array<{ line: number; input: string; reason: string }>;
  duplicatesInInput: string[];
}

/**
 * Parser de texto colado: um-nome-por-linha, sem header.
 * Ignora linhas vazias. Trim + uppercase.
 */
export function parseTextList(raw: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseResult['errors'] = [];
  const seen = new Set<string>();
  const duplicatesInInput: string[] = [];

  const lines = raw.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const name = normalizeStudentName(trimmed);

    if (name.length < 2) {
      errors.push({ line: idx + 1, input: trimmed, reason: 'Nome muito curto' });
      return;
    }
    if (name.length > 80) {
      errors.push({ line: idx + 1, input: trimmed, reason: 'Nome muito longo (max 80)' });
      return;
    }

    if (seen.has(name)) {
      duplicatesInInput.push(name);
      return;
    }
    seen.add(name);
    rows.push({ name, email: null, note: null });
  });

  return { rows, errors, duplicatesInInput };
}

/**
 * Parser de CSV simples: colunas name, email?, note?
 * Aceita separador ',' ou ';'. Primeira linha pode ser header.
 */
export function parseCsv(raw: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseResult['errors'] = [];
  const seen = new Set<string>();
  const duplicatesInInput: string[] = [];

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows, errors, duplicatesInInput };
  }

  // Detecta separador na primeira linha
  const firstLine = lines[0] ?? '';
  const separator = firstLine.includes(';') ? ';' : ',';

  // Detecta header (se a primeira coluna for "name" ou "nome")
  const firstCells = firstLine.split(separator).map((c) => c.trim().toLowerCase());
  const startIdx = ['name', 'nome', 'aluno'].includes(firstCells[0] ?? '') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]!;
    const cells = line.split(separator).map((c) => c.trim().replace(/^"|"$/g, ''));
    const [rawName, rawEmail, rawNote] = cells;

    const lineNumber = i + 1;

    if (!rawName) {
      errors.push({ line: lineNumber, input: line, reason: 'Nome vazio' });
      continue;
    }

    const name = normalizeStudentName(rawName);
    if (name.length < 2 || name.length > 80) {
      errors.push({
        line: lineNumber,
        input: line,
        reason: 'Nome com tamanho inválido (2-80 chars)',
      });
      continue;
    }

    let email: string | null = null;
    if (rawEmail && rawEmail.trim()) {
      const parsedEmail = z.string().email().safeParse(rawEmail.trim());
      if (!parsedEmail.success) {
        errors.push({
          line: lineNumber,
          input: line,
          reason: `E-mail inválido: ${rawEmail}`,
        });
        continue;
      }
      email = parsedEmail.data;
    }

    const note = rawNote && rawNote.trim() ? rawNote.trim() : null;

    if (seen.has(name)) {
      duplicatesInInput.push(name);
      continue;
    }
    seen.add(name);

    rows.push({ name, email, note });
  }

  return { rows, errors, duplicatesInInput };
}

// ---------------------------------------------------------------------------
// Diff de importação vs existentes
// ---------------------------------------------------------------------------
export interface ImportDiff {
  toCreate: ParsedRow[];
  alreadyExist: ParsedRow[];
  emailConflicts: Array<{
    incoming: ParsedRow;
    existing: { name: string; email: string | null };
  }>;
}

/**
 * Compara lista importada com alunos já cadastrados do professor.
 * - Match por nome (UPPERCASE)
 * - Se nome existe + email divergente → conflito (pede decisão manual)
 */
export function diffImport(
  parsed: ParsedRow[],
  existing: Pick<Student, 'name' | 'email'>[],
): ImportDiff {
  const byName = new Map<string, Pick<Student, 'name' | 'email'>>();
  for (const e of existing) byName.set(e.name, e);

  const toCreate: ParsedRow[] = [];
  const alreadyExist: ParsedRow[] = [];
  const emailConflicts: ImportDiff['emailConflicts'] = [];

  for (const row of parsed) {
    const match = byName.get(row.name);
    if (!match) {
      toCreate.push(row);
      continue;
    }

    // Match por nome
    if (row.email && match.email && row.email !== match.email) {
      emailConflicts.push({ incoming: row, existing: match });
    } else {
      alreadyExist.push(row);
    }
  }

  return { toCreate, alreadyExist, emailConflicts };
}
