/**
 * Stub da página pública do aluno. Implementada de verdade na Fase 4 (F-AL-01).
 * Por enquanto, serve como raiz pública.
 */
export function StudentLandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[480px] text-center">
        <div className="mx-auto mb-6 inline-flex h-10 w-10 items-center justify-center rounded bg-text font-display text-md font-bold text-bg">
          c
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          controle<span className="text-text-muted">.ia</span>
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Entrega de trabalhos acadêmicos
        </p>

        <div className="mt-10 rounded-lg border border-dashed border-border bg-bg-surface/50 p-8">
          <p className="text-sm text-text-muted">
            Formulário de entrega será liberado na{' '}
            <span className="font-mono text-text">Fase 4</span>.
          </p>
        </div>

        <p className="mt-8 text-xs text-text-muted">
          É professor?{' '}
          <a href="/login" className="text-primary hover:text-primary-hover">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
