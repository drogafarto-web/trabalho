import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/use-auth';
import { Button } from '@/shared/ui/Button';

export function UnauthorizedPage() {
  const { email, status, logout } = useAuth();
  const navigate = useNavigate();

  // Se o user deslogar por qualquer caminho, ir pra /login
  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login', { replace: true });
    }
  }, [status, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[480px] text-center">
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-danger/10 text-danger">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="font-display text-xl font-semibold tracking-tight">
          Acesso não autorizado
        </h1>

        <p className="mt-3 text-sm text-text-secondary">
          A conta <span className="font-mono text-text">{email ?? '—'}</span>{' '}
          não está cadastrada como professor neste sistema.
        </p>

        <div className="mt-8 rounded-lg border border-border bg-bg-surface p-5 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Se você é professor
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Peça ao administrador para adicionar seu e-mail à allowlist. Contato:{' '}
            <a
              href="mailto:drogafarto@gmail.com"
              className="text-primary hover:text-primary-hover"
            >
              drogafarto@gmail.com
            </a>
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={() => void handleLogout()}>
            Sair e tentar outra conta
          </Button>
        </div>
      </div>
    </main>
  );
}
