import type { Submission } from '@/core/domain/submission';
import type { Discipline } from '@/core/domain/discipline';

/**
 * Derivadores puros para os 3 tipos de visualização de relatórios.
 * Dados vêm de submissions da disciplina (via listener já existente).
 */

// ---------------------------------------------------------------------------
// Por aluno (explode grupos — cada aluno vira uma linha)
// ---------------------------------------------------------------------------
export interface StudentRow {
  studentId: string;
  studentName: string;
  submissionId: string;
  shortId: string;
  finalScore: number | null;
  status: Submission['status'];
  submittedAt: Date;
  groupSize: number;
}

export function deriveByStudent(submissions: Submission[]): StudentRow[] {
  const rows: StudentRow[] = [];
  for (const s of submissions) {
    const finalScore = s.review?.finalEvaluation?.finalScore ?? null;
    for (const st of s.students) {
      rows.push({
        studentId: st.id,
        studentName: st.name,
        submissionId: s.id,
        shortId: s.shortId,
        finalScore,
        status: s.status,
        submittedAt: s.submittedAt.toDate(),
        groupSize: s.students.length,
      });
    }
  }
  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'pt-BR'));
}

// ---------------------------------------------------------------------------
// Por grupo (uma linha por submission, com todos os alunos juntos)
// ---------------------------------------------------------------------------
export interface GroupRow {
  submissionId: string;
  shortId: string;
  studentNames: string[];
  finalScore: number | null;
  status: Submission['status'];
  submittedAt: Date;
}

export function deriveByGroup(submissions: Submission[]): GroupRow[] {
  return submissions
    .map((s) => ({
      submissionId: s.id,
      shortId: s.shortId,
      studentNames: s.students.map((st) => st.name),
      finalScore: s.review?.finalEvaluation?.finalScore ?? null,
      status: s.status,
      submittedAt: s.submittedAt.toDate(),
    }))
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

// ---------------------------------------------------------------------------
// Por critério (heatmap: alunos nas linhas, critérios nas colunas)
// ---------------------------------------------------------------------------
export interface CriterionMatrix {
  studentRows: Array<{
    studentId: string;
    studentName: string;
    scores: Record<string, number | null>; // key = criterion.name
    finalScore: number | null;
  }>;
  criteria: Array<{ name: string; description: string; weight: number }>;
}

export function deriveByCriterion(
  submissions: Submission[],
  discipline: Discipline | null,
): CriterionMatrix {
  if (!discipline) {
    return { studentRows: [], criteria: [] };
  }

  const criteria = discipline.rubric.criteria.map((c) => ({
    name: c.name,
    description: c.description,
    weight: c.weight,
  }));

  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      scores: Record<string, number | null>;
      finalScore: number | null;
    }
  >();

  for (const s of submissions) {
    const finalScore = s.review?.finalEvaluation?.finalScore ?? null;
    const criterionScores = s.review?.finalEvaluation?.criterionScores ?? {};

    for (const st of s.students) {
      // Se o aluno aparecer em múltiplas submissões, pega a última
      const existing = studentMap.get(st.id);
      if (existing && existing.finalScore != null && finalScore == null) continue;

      const scores: Record<string, number | null> = {};
      for (const c of criteria) {
        scores[c.name] = criterionScores[c.name] ?? null;
      }

      studentMap.set(st.id, {
        studentId: st.id,
        studentName: st.name,
        scores,
        finalScore,
      });
    }
  }

  const studentRows = Array.from(studentMap.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName, 'pt-BR'),
  );

  return { studentRows, criteria };
}

// ---------------------------------------------------------------------------
// Exportação CSV (Excel-BR: BOM UTF-8 + ;)
// ---------------------------------------------------------------------------
export function buildCsvByStudent(
  rows: StudentRow[],
  discipline: Discipline | null,
): string {
  const headers = ['DISCIPLINA', 'ALUNO', 'GRUPO', 'PROTOCOLO', 'STATUS', 'NOTA FINAL'];
  const lines: string[] = [headers.join(';')];

  for (const r of rows) {
    const nota = r.finalScore != null ? r.finalScore.toFixed(1).replace('.', ',') : '';
    lines.push(
      [
        discipline?.name ?? '',
        `"${r.studentName}"`,
        r.groupSize,
        r.shortId,
        r.status,
        nota,
      ].join(';'),
    );
  }

  // BOM UTF-8 no início para Excel-BR reconhecer acentos
  return '\uFEFF' + lines.join('\n');
}

export function buildCsvByCriterion(
  matrix: CriterionMatrix,
  discipline: Discipline | null,
): string {
  const headers = ['DISCIPLINA', 'ALUNO', ...matrix.criteria.map((c) => c.name.toUpperCase()), 'NOTA FINAL'];
  const lines: string[] = [headers.join(';')];

  for (const row of matrix.studentRows) {
    const cells = [
      discipline?.name ?? '',
      `"${row.studentName}"`,
      ...matrix.criteria.map((c) => {
        const v = row.scores[c.name];
        return v != null ? v.toFixed(1).replace('.', ',') : '';
      }),
      row.finalScore != null ? row.finalScore.toFixed(1).replace('.', ',') : '',
    ];
    lines.push(cells.join(';'));
  }

  return '\uFEFF' + lines.join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
