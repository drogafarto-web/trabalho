import { useAuth } from '@/features/auth/lib/use-auth';
import { Button } from '@/shared/ui/Button';
import { env } from '@/lib/env';

/**
 * Dashboard stub — será substituído na Fase 6 (F-PR-02).
 * Por enquanto serve apenas como área protegida para validar o auth flow.
 */
export function DashboardPage() {
  const { email, logout } = useAuth();

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-text font-display text-sm font-bold text-bg">
              c
            </div>
            <span className="font-display font-semibold">
              controle<span className="text-text-muted">.ia</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-text-muted">{email}</span>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Fase 1 concluída
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Autenticação + rules funcionando. Próximo passo: Fase 2 — CRUD de disciplinas.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatusCard label="Projeto" value={env.FIREBASE_PROJECT_ID} variant="primary" />
          <StatusCard label="Modo" value={env.APP_ENV} variant="warning" />
          <StatusCard label="Claim" value="role: professor" variant="success" />
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'primary' | 'warning' | 'success';
}) {
  const colors = {
    primary: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
  };
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-1 font-mono text-sm ${colors[variant]}`}>{value}</p>
    </div>
  );
}
