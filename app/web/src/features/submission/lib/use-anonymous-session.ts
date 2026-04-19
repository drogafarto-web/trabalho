import { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/features/auth/lib/auth-store';

/**
 * Garante uma sessão anônima ao montar o componente. Se já há qualquer
 * usuário (anônimo ou professor), não faz nada. O aluno nunca vê tela
 * de login — auth acontece transparente.
 */
export function useAnonymousSession() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'initializing') return; // AuthProvider ainda resolvendo
    if (user) return; // já autenticado

    signInAnonymously(auth).catch((err) => {
      console.error('[anon auth] falha:', err);
      setError('Não foi possível iniciar sessão. Verifique sua conexão.');
    });
  }, [status, user]);

  return {
    ready: !!user,
    error,
  };
}
