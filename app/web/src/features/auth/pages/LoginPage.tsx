import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/use-auth';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function LoginPage() {
  const { status, login, isLoading } = useAuth();

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/nao-autorizado" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 inline-flex h-10 w-10 items-center justify-center rounded bg-text font-display text-md font-bold text-bg">
            c
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            controle<span className="text-text-muted">.ia</span>
          </h1>
          <p className="mt-3 text-sm text-text-secondary">Acesso restrito ao professor</p>
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-6 shadow-subtle">
          <GoogleSignInButton onClick={() => void login()} loading={isLoading} />

          {status === 'error' && (
            <p className="mt-4 text-center text-xs text-danger" role="alert">
              Falha na autenticação. Tente novamente.
            </p>
          )}

          {status === 'bootstrapping' && (
            <p className="mt-4 text-center text-xs text-text-muted" role="status">
              Verificando suas permissões…
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-text-muted">
          Sou aluno,{' '}
          <a href="/" className="text-primary hover:text-primary-hover">
            quero entregar trabalho
          </a>
        </p>
      </div>
    </main>
  );
}
