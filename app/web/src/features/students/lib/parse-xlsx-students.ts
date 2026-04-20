/**
 * Parser de XLSX → ParseResult dos alunos.
 *
 * Lê só a aba `Alunos` (ou aliases) do template novo (aba única).
 * Não trata matrículas — a vinculação à disciplina é feita pelo caller
 * via `disciplineId` selecionado na UI.
 */

import { z } from 'zod';
import { parseXlsxFile, asString } from '@/features/import/lib/xlsx-parser';
import {
  normalizeStudentName,
  type ParseResult,
  type ParsedRow,
} from '@/core/domain/student';

const SHEET_ALIASES = ['Alunos', 'alunos', 'Students', 'students'];

const EmailSchema = z.string().email();

export async function parseXlsxStudentsFile(file: File): Promise<ParseResult> {
  const wb = await parseXlsxFile(file);

  let sheetName: string | null = null;
  for (const alias of SHEET_ALIASES) {
    if (alias in wb) {
      sheetName = alias;
      break;
    }
  }

  if (!sheetName) {
    return {
      rows: [],
      errors: [
        {
          line: 0,
          input: '',
          reason: 'Aba "Alunos" não encontrada. Use o template baixado.',
        },
      ],
      duplicatesInInput: [],
    };
  }

  const rawRows = wb[sheetName] ?? [];
  const rows: ParsedRow[] = [];
  const errors: ParseResult['errors'] = [];
  const seen = new Set<string>();
  const duplicatesInInput: string[] = [];

  rawRows.forEach((raw, idx) => {
    const lineNumber = idx + 2; // header é linha 1
    const isEmpty = Object.values(raw).every((v) => v == null || v === '');
    if (isEmpty) return;

    const rawName = asString(raw['name']);
    if (!rawName) {
      errors.push({
        line: lineNumber,
        input: JSON.stringify(raw),
        reason: 'Coluna `name` vazia',
      });
      return;
    }

    const name = normalizeStudentName(rawName);
    if (name.length < 2 || name.length > 80) {
      errors.push({
        line: lineNumber,
        input: rawName,
        reason: 'Nome com tamanho inválido (2-80 chars)',
      });
      return;
    }

    if (seen.has(name)) {
      duplicatesInInput.push(name);
      return;
    }
    seen.add(name);

    let email: string | null = null;
    const rawEmail = asString(raw['email']);
    if (rawEmail) {
      const parsed = EmailSchema.safeParse(rawEmail);
      if (!parsed.success) {
        errors.push({
          line: lineNumber,
          input: rawEmail,
          reason: `E-mail inválido: ${rawEmail}`,
        });
        return;
      }
      email = parsed.data;
    }

    const note = asString(raw['note']);

    rows.push({ name, email, note });
  });

  return { rows, errors, duplicatesInInput };
}
