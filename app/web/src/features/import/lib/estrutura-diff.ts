/**
 * Diff engine da estrutura — compara parsed vs existente + resolve refs.
 *
 * Política: **create-or-skip only**. Se já existe (match por chave natural),
 * marca unchanged. Updates ficam pra v2 — reduz risco de sobrescrever
 * rubricas/descrições editadas à mão por engano.
 *
 * IDs de entidades novas são gerados client-side (via doc().id) pra
 * permitir referenciamento entre batches do commit.
 */

import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Assignment } from '@/core/domain/assignment';
import type { Discipline } from '@/core/domain/discipline';
import type { Term } from '@/core/domain/term';
import type { EstruturaDiff } from './types.js';
import type { EstruturaParseResult } from './estrutura-parser.js';

export interface EstruturaContext {
  ownerUid: string;
  existingDisciplines: Discipline[];
  existingTerms: Term[];
  existingAssignments: Assignment[];
}

const DISCIPLINES_COL = collection(db, 'disciplines');
const TERMS_COL = collection(db, 'terms');
const ASSIGNMENTS_COL = collection(db, 'assignments');

export function diffEstrutura(
  parsed: EstruturaParseResult,
  ctx: EstruturaContext,
): EstruturaDiff {
  // Mapas de lookup pra existentes
  const existingByCode = new Map<string, Discipline>();
  for (const d of ctx.existingDisciplines) existingByCode.set(d.code, d);

  const existingTermKey = (disciplineId: string, year: number, number: number) =>
    `${disciplineId}__${String(year)}__${String(number)}`;
  const existingTermMap = new Map<string, Term>();
  for (const t of ctx.existingTerms) {
    existingTermMap.set(existingTermKey(t.disciplineId, t.year, t.number), t);
  }

  const existingAssignmentKey = (
    disciplineId: string,
    termId: string,
    title: string,
  ) => `${disciplineId}__${termId}__${title.trim().toLowerCase()}`;
  const existingAssignmentMap = new Map<string, Assignment>();
  for (const a of ctx.existingAssignments) {
    existingAssignmentMap.set(
      existingAssignmentKey(a.disciplineId, a.termId, a.title),
      a,
    );
  }

  // -------------------------------------------------------------------------
  // Disciplines
  // -------------------------------------------------------------------------
  // Mapa: code → id (seja existente ou recém-gerado pra criar)
  const codeToDisciplineId = new Map<string, string>();
  for (const [code, d] of existingByCode) codeToDisciplineId.set(code, d.id);

  const disciplines: EstruturaDiff['disciplines'] = parsed.disciplines.map(
    (row) => {
      if (row.status === 'error' || !row.data) {
        return {
          kind: 'discipline',
          status: 'error',
          rowNumber: row.rowNumber,
          label: `Linha ${String(row.rowNumber)}`,
          data: null,
          reason: row.reason ?? 'erro de parse',
        };
      }
      const existing = existingByCode.get(row.data.code);
      const label = `${row.data.code} · ${row.data.name}`;

      if (existing) {
        return {
          kind: 'discipline',
          status: 'unchanged',
          rowNumber: row.rowNumber,
          label,
          data: row.data,
          existingId: existing.id,
        };
      }

      const newId = doc(DISCIPLINES_COL).id;
      codeToDisciplineId.set(row.data.code, newId);

      return {
        kind: 'discipline',
        status: 'create',
        rowNumber: row.rowNumber,
        label,
        data: row.data,
        existingId: newId, // "id alocado"
      };
    },
  );

  // -------------------------------------------------------------------------
  // Terms
  // -------------------------------------------------------------------------
  // Mapa: (disciplineId, year, number) → termId (existente ou novo)
  const termKey = (disciplineId: string, year: number, number: number) =>
    `${disciplineId}__${String(year)}__${String(number)}`;
  const allTermIds = new Map<string, string>();
  for (const [k, v] of existingTermMap) allTermIds.set(k, v.id);

  const terms: EstruturaDiff['terms'] = parsed.terms.map((row) => {
    if (row.status === 'error' || !row.data) {
      return {
        kind: 'term',
        status: 'error',
        rowNumber: row.rowNumber,
        label: `Linha ${String(row.rowNumber)}`,
        data: null,
        reason: row.reason ?? 'erro de parse',
      };
    }

    const disciplineId = codeToDisciplineId.get(row.data.disciplineCode);
    if (!disciplineId) {
      return {
        kind: 'term',
        status: 'error',
        rowNumber: row.rowNumber,
        label: `Linha ${String(row.rowNumber)}`,
        data: null,
        reason: `Disciplina "${row.data.disciplineCode}" não existe e não está sendo criada nesta planilha.`,
      };
    }

    const data = { ...row.data, disciplineId };
    const key = termKey(disciplineId, data.year, data.number);
    const existing = existingTermMap.get(key);
    const label = `${row.data.disciplineCode} · ${String(data.year)}/${String(data.number)}ª`;

    if (existing) {
      return {
        kind: 'term',
        status: 'unchanged',
        rowNumber: row.rowNumber,
        label,
        data,
        existingId: existing.id,
      };
    }

    const newId = doc(TERMS_COL).id;
    allTermIds.set(key, newId);

    return {
      kind: 'term',
      status: 'create',
      rowNumber: row.rowNumber,
      label,
      data,
      existingId: newId,
    };
  });

  // -------------------------------------------------------------------------
  // Assignments
  // -------------------------------------------------------------------------
  const assignments: EstruturaDiff['assignments'] = parsed.assignments.map(
    (row) => {
      if (row.status === 'error' || !row.data) {
        return {
          kind: 'assignment',
          status: 'error',
          rowNumber: row.rowNumber,
          label: `Linha ${String(row.rowNumber)}`,
          data: null,
          reason: row.reason ?? 'erro de parse',
        };
      }

      const disciplineId = codeToDisciplineId.get(row.data.disciplineCode);
      if (!disciplineId) {
        return {
          kind: 'assignment',
          status: 'error',
          rowNumber: row.rowNumber,
          label: `Linha ${String(row.rowNumber)}`,
          data: null,
          reason: `Disciplina "${row.data.disciplineCode}" não existe e não está sendo criada.`,
        };
      }

      const termId = allTermIds.get(
        termKey(disciplineId, row.data.termYear, row.data.termNumber),
      );
      if (!termId) {
        return {
          kind: 'assignment',
          status: 'error',
          rowNumber: row.rowNumber,
          label: `Linha ${String(row.rowNumber)}`,
          data: null,
          reason: `Etapa ${String(row.data.termYear)}/${String(row.data.termNumber)}ª de "${row.data.disciplineCode}" não existe e não está sendo criada.`,
        };
      }

      const data = { ...row.data, disciplineId, termId };
      const key = existingAssignmentKey(disciplineId, termId, data.title);
      const existing = existingAssignmentMap.get(key);
      const label = `${row.data.disciplineCode} · ${data.title}`;

      if (existing) {
        return {
          kind: 'assignment',
          status: 'unchanged',
          rowNumber: row.rowNumber,
          label,
          data,
          existingId: existing.id,
        };
      }

      const newId = doc(ASSIGNMENTS_COL).id;
      return {
        kind: 'assignment',
        status: 'create',
        rowNumber: row.rowNumber,
        label,
        data,
        existingId: newId,
      };
    },
  );

  return { disciplines, terms, assignments };
}
