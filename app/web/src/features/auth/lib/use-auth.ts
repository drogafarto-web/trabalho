import { useCallback } from 'react';
import { useAuthStore } from './auth-store';
import { signInWithGoogle, signOut as doSignOut } from './auth-service';

/**
 * Hook de conveniência para ler e mutar auth state.
 *
 * login() apenas dispara o OAuth. A decisão de bootstrap/claim/redirect
 * acontece inteiramente no AuthProvider (ver components/AuthProvider.tsx).
 */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const email = useAuthStore((s) => s.email);
  const errorMessage = useAuthStore((s) => s.errorMessage);

  const setStatus = useAuthStore((s) => s.setStatus);
  const setError = useAuthStore((s) => s.setError);
  const reset = useAuthStore((s) => s.reset);

  const login = useCallback(async () => {
    setStatus('authenticating');
    try {
      await signInWithGoogle();
      // AuthProvider pega daqui — não fazemos bootstrap aqui
    } catch (err) {
      console.error('[auth] login error:', err);
      setError(err instanceof Error ? err.message : 'Falha na autenticação');
    }
  }, [setStatus, setError]);

  const logout = useCallback(async () => {
    await doSignOut();
    reset();
  }, [reset]);

  return {
    status,
    user,
    role,
    email,
    errorMessage,
    login,
    logout,
    isAuthenticated: status === 'authenticated',
    isProfessor: role === 'professor',
    isLoading:
      status === 'initializing' ||
      status === 'authenticating' ||
      status === 'bootstrapping',
  };
}
