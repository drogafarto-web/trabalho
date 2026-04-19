import { AppShell } from '../components/AppShell';
import { env } from '@/lib/env';

/**
 * Dashboard stub — lista de trabalhos real vem na Fase 6 (F-PR-02).
 * Por enquanto mostra status do ambiente pra confirmar auth + rules.
 */
export function DashboardPage() {
  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-8">
          <h1 className="font-display text-lg font-semibold tracking-tight">Trabalhos</h1>
        </div>
      </header>

      <section className="px-8 py-10">
        <div className="rounded-lg border border-border bg-bg-surface p-8">
          <h2 className="font-display text-md font-semibold">Fase 2 em andamento</h2>
          <p className="mt-2 text-sm text-text-secondary">
            A lista de trabalhos entra na Fase 6. Por enquanto, vá para{' '}
            <a
              href="/disciplinas"
              className="text-primary hover:text-primary-hover"
            >
              Disciplinas
            </a>{' '}
            e crie sua primeira rubrica.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatusCard label="Projeto" value={env.FIREBASE_PROJECT_ID} variant="primary" />
            <StatusCard label="Modo" value={env.APP_ENV} variant="warning" />
            <StatusCard label="Claim" value="role: professor" variant="success" />
          </div>
        </div>
      </section>
    </AppShell>
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
    <div className="rounded-sm border border-border bg-bg p-3">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xs ${colors[variant]}`}>{value}</p>
    </div>
  );
}
