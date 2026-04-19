import { useEffect, useRef, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '../lib/auth-store';
import { refreshToken, bootstrapClaim } from '../lib/auth-service';

/**
 * AuthProvider — único ponto responsável pela máquina de estado de auth.
 *
 * Fluxo:
 *   1. onAuthStateChanged dispara com User (ou null)
 *   2. Lê claim atual do token
 *   3. Se NÃO tem claim de professor + email verified: tenta bootstrap
 *   4. Seta status final (authenticated | unauthorized)
 *
 * IMPORTANTE: login() do useAuth apenas chama signInWithPopup. Toda
 * a decisão de claim/bootstrap/redirect acontece AQUI, evitando race
 * conditions entre hook e provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const setRole = useAuthStore((s) => s.setRole);

  // Evita processar o mesmo user 2x (StrictMode dupla-monta)
  const processingUid = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        processingUid.current = null;
        setUser(null);
        setRole(null);
        setStatus('unauthenticated');
        return;
      }

      setUser(user);

      // Aluno anônimo: autenticado como student, sem precisar de claim
      if (user.isAnonymous) {
        setRole('student');
        setStatus('authenticated');
        return;
      }

      // Evita dupla execução no mesmo user (StrictMode / re-renders)
      if (processingUid.current === user.uid) return;
      processingUid.current = user.uid;

      await resolveProfessorClaim(user, { setRole, setStatus });
    });

    return () => {
      unsub();
    };
  }, [setUser, setStatus, setRole]);

  return <>{children}</>;
}

async function resolveProfessorClaim(
  user: User,
  actions: {
    setRole: (r: 'professor' | 'student' | null) => void;
    setStatus: (s: 'bootstrapping' | 'authenticated' | 'unauthorized' | 'error') => void;
  },
): Promise<void> {
  try {
    // 1. Checa se já tem claim (login subsequente)
    const current = await refreshToken(user);
    if (current.role === 'professor') {
      actions.setRole('professor');
      actions.setStatus('authenticated');
      return;
    }

    // 2. Primeira vez — tenta bootstrap
    actions.setStatus('bootstrapping');
    const result = await bootstrapClaim();

    if (!result.ok) {
      actions.setRole(null);
      actions.setStatus('unauthorized');
      return;
    }

    // 3. Refresh token para carregar a claim recém-concedida
    const refreshed = await refreshToken(user);
    if (refreshed.role === 'professor') {
      actions.setRole('professor');
      actions.setStatus('authenticated');
    } else {
      // Não deveria acontecer, mas por segurança
      actions.setRole(null);
      actions.setStatus('unauthorized');
    }
  } catch (err) {
    console.error('[auth] Erro ao resolver claim:', err);
    actions.setRole(null);
    actions.setStatus('unauthorized');
  }
}
