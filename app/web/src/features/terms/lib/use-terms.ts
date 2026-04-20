import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/lib/use-auth';
import {
  archiveTerm,
  createTerm,
  createTermsBatch,
  deleteTerm,
  listTermsByDiscipline,
  listTermsByOwner,
  unarchiveTerm,
  updateTerm,
} from './term-repo';
import type { TermInput } from '@/core/domain/term';

const KEYS = {
  byDiscipline: (disciplineId: string) =>
    ['terms', 'discipline', disciplineId] as const,
  byOwner: (uid: string) => ['terms', 'owner', uid] as const,
};

export function useTermsByDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? KEYS.byDiscipline(disciplineId)
      : (['terms', 'discipline', 'none'] as const),
    queryFn: () =>
      disciplineId ? listTermsByDiscipline(disciplineId) : Promise.resolve([]),
    enabled: !!disciplineId,
    staleTime: 30_000,
  });
}

/**
 * Todas as etapas do professor em todas as disciplinas — usado apenas pelo
 * fluxo de "copiar etapas de outra disciplina". Fetched lazy (enabled controlado
 * pelo consumidor).
 */
export function useAllOwnerTerms(enabled: boolean) {
  const { user, isProfessor } = useAuth();
  return useQuery({
    queryKey: user ? KEYS.byOwner(user.uid) : (['terms', 'owner', 'anon'] as const),
    queryFn: () => {
      if (!user) throw new Error('Não autenticado');
      return listTermsByOwner(user.uid);
    },
    enabled: enabled && !!user && isProfessor,
    staleTime: 30_000,
  });
}

function invalidateTerms(
  qc: ReturnType<typeof useQueryClient>,
  disciplineId: string,
  uid: string | undefined,
) {
  void qc.invalidateQueries({ queryKey: KEYS.byDiscipline(disciplineId) });
  if (uid) void qc.invalidateQueries({ queryKey: KEYS.byOwner(uid) });
}

export function useCreateTerm(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TermInput) => {
      if (!user) throw new Error('Não autenticado');
      return createTerm(user.uid, disciplineId, input);
    },
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}

export function useCreateTermsBatch(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: TermInput[]) => {
      if (!user) throw new Error('Não autenticado');
      return createTermsBatch(user.uid, disciplineId, inputs);
    },
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}

export function useUpdateTerm(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; patch: Partial<TermInput> }) =>
      updateTerm(params.id, params.patch),
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}

export function useArchiveTerm(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveTerm,
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}

export function useUnarchiveTerm(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unarchiveTerm,
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}

export function useDeleteTerm(disciplineId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTerm,
    onSuccess: () => invalidateTerms(qc, disciplineId, user?.uid),
  });
}
