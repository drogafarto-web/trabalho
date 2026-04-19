import { ShieldAlert } from 'lucide-react';
import type { Submission } from '@/core/domain/submission';
import { cn } from '@/lib/cn';

const ALERT_THRESHOLD = 0.6;

interface Props {
  submissions: Submission[];
  onInspect?: (submission: Submission) => void;
}

/**
 * Exibe banner se alguma submission tem similaridade acima do threshold.
 * Clique em cada linha abre o drawer da submission em questão.
 */
export function IntegrityBanner({ submissions, onInspect }: Props) {
  const flagged = submissions
    .filter((s) => (s.plagiarism?.similarityScore ?? 0) >= ALERT_THRESHOLD)
    .sort(
      (a, b) =>
        (b.plagiarism?.similarityScore ?? 0) - (a.plagiarism?.similarityScore ?? 0),
    );

  if (flagged.length === 0) return null;

  return (
    <section
      role="alert"
      className="overflow-hidden rounded-lg border border-danger/30 bg-danger/5"
    >
      <header className="flex items-start gap-3 border-b border-danger/20 p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-danger">
            Alerta de integridade
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {flagged.length === 1
              ? '1 trabalho com alta similaridade detectada.'
              : `${String(flagged.length)} trabalhos com alta similaridade detectada.`}{' '}
            Revise antes de publicar notas.
          </p>
        </div>
      </header>

      <ul className="divide-y divide-danger/10">
        {flagged.slice(0, 5).map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onInspect?.(s)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-danger/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] text-text-muted">{s.shortId}</span>
                <span className="truncate text-xs">
                  {s.students.map((st) => st.name).join(', ')}
                </span>
              </div>
              <SimilarityScore score={s.plagiarism?.similarityScore ?? 0} />
            </button>
          </li>
        ))}
        {flagged.length > 5 && (
          <li className="px-4 py-2 text-center text-[10px] text-text-muted">
            + {flagged.length - 5} outros casos
          </li>
        )}
      </ul>
    </section>
  );
}

function SimilarityScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-danger' : 'text-warning';
  return (
    <span className={cn('whitespace-nowrap font-mono text-xs tabular-nums', color)}>
      {pct}% similar
    </span>
  );
}
