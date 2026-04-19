import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listStudentsByOwner,
  listStudentsByDiscipline,
  createStudent,
  updateStudent,
  archiveStudent,
  linkStudentToDiscipline,
  unlinkStudentFromDiscipline,
  bulkImportStudents,
  type BulkImportResult,
} from './student-repo';
import { useAuth } from '@/features/auth/lib/use-auth';
import type { StudentInput, ParsedRow } from '@/core/domain/student';

const KEYS = {
  all: ['students'] as const,
  byOwner: (uid: string) => ['students', 'owner', uid] as const,
  byDiscipline: (disciplineId: string) =>
    ['students', 'discipline', disciplineId] as const,
};

// ---------------------------------------------------------------------------
// Todos os alunos do professor
// ---------------------------------------------------------------------------
export function useMyStudents() {
  const { user, isProfessor } = useAuth();
  return useQuery({
    queryKey: user ? KEYS.byOwner(user.uid) : ['students', 'owner', 'anonymous'],
    queryFn: () => {
      if (!user) throw new Error('Não autenticado');
      return listStudentsByOwner(user.uid);
    },
    enabled: !!user && isProfessor,
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Alunos vinculados a uma disciplina
// ---------------------------------------------------------------------------
export function useStudentsByDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? KEYS.byDiscipline(disciplineId)
      : ['students', 'discipline', 'none'],
    queryFn: () =>
      disciplineId ? listStudentsByDiscipline(disciplineId) : Promise.resolve([]),
    enabled: !!disciplineId,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Criar aluno + linkar a uma disciplina
// ---------------------------------------------------------------------------
export function useCreateStudent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { input: StudentInput; disciplineId: string }) => {
      if (!user) throw new Error('Não autenticado');
      const studentId = await createStudent(user.uid, params.input);
      await linkStudentToDiscipline({
        ownerUid: user.uid,
        disciplineId: params.disciplineId,
        studentId,
        studentName: params.input.name,
      });
      return studentId;
    },
    onSuccess: (_, variables) => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(variables.disciplineId) });
    },
  });
}

export function useUpdateStudent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; patch: Partial<StudentInput> }) =>
      updateStudent(params.id, params.patch),
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useArchiveStudent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveStudent,
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUnlinkStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { disciplineId: string; studentId: string }) =>
      unlinkStudentFromDiscipline(params.disciplineId, params.studentId),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(variables.disciplineId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Importação em lote
// ---------------------------------------------------------------------------
export function useBulkImportStudents() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<
    BulkImportResult,
    Error,
    {
      disciplineId: string;
      rowsToCreate: ParsedRow[];
      existingStudentIdsToLink: Array<{ id: string; name: string }>;
    }
  >({
    mutationFn: async (params) => {
      if (!user) throw new Error('Não autenticado');
      return bulkImportStudents({
        ownerUid: user.uid,
        disciplineId: params.disciplineId,
        rowsToCreate: params.rowsToCreate,
        existingStudentIdsToLink: params.existingStudentIdsToLink,
      });
    },
    onSuccess: (_, variables) => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(variables.disciplineId) });
    },
  });
}
