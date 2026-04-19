import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDisciplinesByOwner,
  getDisciplineById,
  createDiscipline,
  updateDiscipline,
  archiveDiscipline,
  unarchiveDiscipline,
} from './discipline-repo';
import { useAuth } from '@/features/auth/lib/use-auth';
import type { DisciplineInput } from '@/core/domain/discipline';

const KEYS = {
  all: ['disciplines'] as const,
  byOwner: (uid: string) => ['disciplines', 'owner', uid] as const,
  byId: (id: string) => ['disciplines', 'id', id] as const,
};

// ---------------------------------------------------------------------------
// Lista disciplinas do professor autenticado
// ---------------------------------------------------------------------------
export function useMyDisciplines() {
  const { user, isProfessor } = useAuth();

  return useQuery({
    queryKey: user ? KEYS.byOwner(user.uid) : ['disciplines', 'owner', 'anonymous'],
    queryFn: () => {
      if (!user) throw new Error('Não autenticado');
      return listDisciplinesByOwner(user.uid);
    },
    enabled: !!user && isProfessor,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Busca disciplina por id
// ---------------------------------------------------------------------------
export function useDiscipline(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.byId(id) : ['disciplines', 'id', 'none'],
    queryFn: () => (id ? getDisciplineById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Criar disciplina
// ---------------------------------------------------------------------------
export function useCreateDiscipline() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: DisciplineInput) => {
      if (!user) throw new Error('Não autenticado');
      return createDiscipline(user.uid, input);
    },
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}

// ---------------------------------------------------------------------------
// Atualizar disciplina
// ---------------------------------------------------------------------------
export function useUpdateDiscipline() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      patch: Partial<DisciplineInput>;
      currentRubricVersion: number;
      rubricChanged: boolean;
    }) => {
      await updateDiscipline(
        params.id,
        params.patch,
        params.currentRubricVersion,
        params.rubricChanged,
      );
      return params.id;
    },
    onSuccess: (id) => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
      void qc.invalidateQueries({ queryKey: KEYS.byId(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Arquivar disciplina
// ---------------------------------------------------------------------------
export function useArchiveDiscipline() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: archiveDiscipline,
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}

export function useUnarchiveDiscipline() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: unarchiveDiscipline,
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: KEYS.byOwner(user.uid) });
    },
  });
}
