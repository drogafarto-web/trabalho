import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/lib/use-auth';
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  listAssignmentsByDiscipline,
  listAssignmentsByOwner,
  updateAssignment,
} from './assignment-repo';
import type { AssignmentInput } from '@/core/domain/assignment';

const KEYS = {
  byDiscipline: (id: string) => ['assignments', 'discipline', id] as const,
  byOwner: (uid: string) => ['assignments', 'owner', uid] as const,
  byId: (id: string) => ['assignments', 'id', id] as const,
};

export function useAssignmentsByDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? KEYS.byDiscipline(disciplineId)
      : (['assignments', 'discipline', 'none'] as const),
    queryFn: () =>
      disciplineId ? listAssignmentsByDiscipline(disciplineId) : Promise.resolve([]),
    enabled: !!disciplineId,
    staleTime: 15_000,
  });
}

export function useMyAssignments() {
  const { user, isProfessor } = useAuth();
  return useQuery({
    queryKey: user ? KEYS.byOwner(user.uid) : (['assignments', 'owner', 'anon'] as const),
    queryFn: () => {
      if (!user) throw new Error('Não autenticado');
      return listAssignmentsByOwner(user.uid);
    },
    enabled: !!user && isProfessor,
    staleTime: 30_000,
  });
}

export function useAssignment(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.byId(id) : (['assignments', 'id', 'none'] as const),
    queryFn: () => (id ? getAssignmentById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignmentInput) => {
      if (!user) throw new Error('Não autenticado');
      return createAssignment(user.uid, input);
    },
    onSuccess: (_id, input) => {
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(input.disciplineId) });
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}

export function useUpdateAssignment(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; patch: Partial<AssignmentInput> }) =>
      updateAssignment(params.id, params.patch),
    onSuccess: (_, params) => {
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(disciplineId) });
      void qc.invalidateQueries({ queryKey: KEYS.byId(params.id) });
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}

export function useDeleteAssignment(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(disciplineId) });
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}
