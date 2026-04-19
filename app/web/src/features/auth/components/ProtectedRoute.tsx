import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/use-auth';

/**
 * Envolve rotas que exigem role: professor.
 * Redireciona para /login se não autenticado, /nao-autorizado se sem claim.
 */
export function ProtectedRoute() {
  const { status, isProfessor } = useAuth();

  if (status === 'initializing' || status === 'authenticating' || status === 'bootstrapping') {
    return <FullPageLoader />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'unauthorized' || !isProfessor) {
    return <Navigate to="/nao-autorizado" replace />;
  }

  return <Outlet />;
}

function FullPageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg"
      role="status"
      aria-label="Carregando"
    >
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-6 w-6 animate-spin text-text-secondary"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs text-text-muted">carregando…</span>
      </div>
    </div>
  );
}
