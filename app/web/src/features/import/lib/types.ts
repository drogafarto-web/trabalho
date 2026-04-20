/**
 * Tipos compartilhados do pipeline de import XLSX.
 *
 * Fluxo: XLSX → parse → validate (Zod) → diff (vs existente) → preview → commit
 */

import type { DisciplineInput } from '@/core/domain/discipline';
import type { TermInput } from '@/core/domain/term';
import type { AssignmentInput } from '@/core/domain/assignment';
import type { StudentInput } from '@/core/domain/student';

export type EntityKind =
  | 'discipline'
  | 'term'
  | 'assignment'
  | 'student'
  | 'enrollment';

export type RowStatus = 'create' | 'update' | 'unchanged' | 'error';

/** Entry por linha, pronta pro preview. */
export interface DiffEntry<TData = unknown> {
  kind: EntityKind;
  status: RowStatus;
  /** Número da linha na planilha (1-indexed, incluindo header). */
  rowNumber: number;
  /** Resumo curto pra UI (ex: "PARA-2026.1 · Parasitologia Clínica"). */
  label: string;
  /** Dados parseados + validados, prontos pra gravar. Null se status=error. */
  data: TData | null;
  /** Id do doc existente (se for update/unchanged). */
  existingId?: string;
  /** Mensagem de erro/conflito (se status=error). */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Estrutura (disciplinas + etapas + atividades)
// ---------------------------------------------------------------------------

/** Row dado da aba Disciplinas — depois do Zod, vira DisciplineInput puro. */
export type DisciplineRowData = DisciplineInput & {
  /** Código serve como "chave externa" nas abas Etapas e Atividades. */
  code: string;
};

/** Row dado da aba Etapas — precisa resolver disciplineCode → disciplineId. */
export interface TermRowData extends TermInput {
  disciplineCode: string;
  /** Resolvido no diff (referência a disciplina existente OU recém-parseada). */
  disciplineId: string | null;
}

/**
 * Row dado da aba Atividades. `disciplineId`/`termId` do AssignmentInput são
 * resolvidos no diff — Omit pra poder redefinir como nullable até a resolução.
 */
export interface AssignmentRowData
  extends Omit<AssignmentInput, 'disciplineId' | 'termId'> {
  disciplineCode: string;
  termYear: number;
  termNumber: number;
  disciplineId: string | null;
  termId: string | null;
}

export interface EstruturaDiff {
  disciplines: DiffEntry<DisciplineRowData>[];
  terms: DiffEntry<TermRowData>[];
  assignments: DiffEntry<AssignmentRowData>[];
}

// ---------------------------------------------------------------------------
// Alunos (alunos + matrículas)
// ---------------------------------------------------------------------------

export type StudentRowData = StudentInput;

export interface EnrollmentRowData {
  disciplineCode: string;
  studentName: string;
  /** Resolvidos no diff. */
  disciplineId: string | null;
  studentId: string | null;
}

export interface AlunosDiff {
  students: DiffEntry<StudentRowData>[];
  enrollments: DiffEntry<EnrollmentRowData>[];
}

// ---------------------------------------------------------------------------
// Resultado do commit
// ---------------------------------------------------------------------------

export interface ImportCommitResult {
  created: {
    disciplines?: number;
    terms?: number;
    assignments?: number;
    students?: number;
    enrollments?: number;
  };
  updated: {
    disciplines?: number;
    terms?: number;
    assignments?: number;
    students?: number;
  };
  skipped: number;
  durationMs: number;
}
