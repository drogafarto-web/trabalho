import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/lib/use-auth';
import { getLlmConfig, setLlmConfig, type LlmConfigInput, type LlmProvider } from './llm-config-repo';
import { listProviderModels, ProviderListError, type ProviderModel } from './llm-models-service';

const KEY = ['config', 'llm'] as const;

export function useLlmConfig() {
  const { isProfessor } = useAuth();
  return useQuery({
    queryKey: KEY,
    queryFn: getLlmConfig,
    enabled: isProfessor,
    staleTime: 30_000,
  });
}

/**
 * Lista modelos disponíveis pra (provider, apiKey) consultando direto a API
 * do provider. Debounce 500ms para não disparar a cada keystroke.
 *
 * Retorna `failureReason` legível quando a chamada falha (key inválida,
 * CORS, network) — caller decide se cai pra input livre.
 */
export function useProviderModels(provider: LlmProvider, apiKey: string) {
  const debouncedKey = useDebounced(apiKey, 500);
  const enabled = debouncedKey.trim().length >= 20;

  const query = useQuery<ProviderModel[], ProviderListError>({
    queryKey: ['llm-models', provider, debouncedKey],
    queryFn: ({ signal }) => listProviderModels(provider, debouncedKey, signal),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  return {
    ...query,
    failureReason: query.error?.reason ?? null,
    failureMessage: query.error?.message ?? null,
  };
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useUpdateLlmConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: LlmConfigInput) => {
      if (!user) throw new Error('Não autenticado');
      await setLlmConfig(input, user.uid);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
