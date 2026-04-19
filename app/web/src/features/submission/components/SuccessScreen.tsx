import { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface Props {
  shortId: string;
  disciplineName: string;
  onNewSubmission: () => void;
}

export function SuccessScreen({ shortId, disciplineName, onNewSubmission }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shortId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API bloqueada — ignore silenciosamente
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-pill bg-success/10 text-success">
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </div>

        <h1 className="font-display text-xl font-semibold tracking-tight">
          Entrega confirmada
        </h1>

        <p className="mt-3 text-sm text-text-secondary">
          Seu trabalho de{' '}
          <span className="font-mono text-text">{disciplineName}</span> foi
          recebido e está na fila para correção.
        </p>

        <div className="mt-8 rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Protocolo de entrega
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <code className="font-mono text-xl font-bold tracking-wide text-text">
              {shortId}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-surface-hi hover:text-text"
              aria-label="Copiar protocolo"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-text-muted">
            Guarde este código. Você pode usá-lo para consultar o status
            depois.
          </p>
        </div>

        <div className="mt-8">
          <Button
            variant="ghost"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onNewSubmission}
          >
            Nova entrega
          </Button>
        </div>
      </div>
    </main>
  );
}
