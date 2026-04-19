import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeSubmissionsByDiscipline,
  getSubmissionById,
  publishGrade,
  rejectSubmission,
  reprocessSubmission,
  getSubmissionDownloadUrl,
  type ReviewPayload,
} from './submission-repo';
import type { Submission, SubmissionStatus } from '@/core/domain/submission';
import { useAuth } from '@/features/auth/lib/use-auth';

const KEYS = {
  byDiscipline: (d: string, s?: SubmissionStatus) => ['submissions', 'discipline', d, s ?? 'all'] as const,
  byId: (id: string) => ['submissions', id] as const,
  downloadUrl: (id: string) => ['submission-url', id] as const,
};

/**
 * Hook real-time: escuta mudanças de submissions de uma disciplina.
 * TanStack Query + onSnapshot combinados: cacheKey usado apenas pra
 * persistir entre mounts, mas a fonte é o listener em useEffect.
 */
export function useSubmissionsByDiscipline(
  disciplineId: string | null,
  status?: SubmissionStatus,
) {
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!disciplineId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeSubmissionsByDiscipline({
      disciplineId,
      ...(status !== undefined ? { status } : {}),
      onChange: (subs) => {
        setData(subs);
        setLoading(false);
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });
    return () => unsub();
  }, [disciplineId, status]);

  return { data, isLoading: loading, error };
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.byId(id) : ['submissions', 'none'],
    queryFn: () => (id ? getSubmissionById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useSubmissionDownloadUrl(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.downloadUrl(id) : ['submission-url', 'none'],
    queryFn: () => (id ? getSubmissionDownloadUrl(id) : Promise.resolve('')),
    enabled: !!id,
    staleTime: 4 * 60_000, // signed URL é válida 5min — refresca 1min antes
    refetchInterval: 4 * 60_000,
    refetchOnWindowFocus: false,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export function usePublishGrade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { submissionId: string; review: ReviewPayload }) => {
      if (!user) throw new Error('Não autenticado');
      await publishGrade({
        submissionId: params.submissionId,
        reviewedByUid: user.uid,
        review: params.review,
      });
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS.byId(variables.submissionId) });
    },
  });
}

export function useRejectSubmission() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { submissionId: string; reason: string }) => {
      if (!user) throw new Error('Não autenticado');
      await rejectSubmission({
        submissionId: params.submissionId,
        reviewedByUid: user.uid,
        reason: params.reason,
      });
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS.byId(variables.submissionId) });
    },
  });
}

export function useReprocessSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reprocessSubmission,
    onSuccess: (_, submissionId) => {
      void qc.invalidateQueries({ queryKey: KEYS.byId(submissionId) });
    },
  });
}
