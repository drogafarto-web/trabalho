import { cn } from '@/lib/cn';

interface Props {
  score: number | null;
  maxWeight: number;
}

/**
 * Célula do heatmap: cor por desempenho normalizado (score/weight).
 * aria-label acessível para screen readers.
 */
export function HeatmapCell({ score, maxWeight }: Props) {
  if (score == null) {
    return (
      <td
        className="px-2 py-1.5 text-center font-mono text-[11px] text-text-muted"
        aria-label="Sem nota"
      >
        —
      </td>
    );
  }

  const ratio = maxWeight > 0 ? score / maxWeight : 0;
  const bg = classByRatio(ratio);

  return (
    <td
      className={cn(
        'px-2 py-1.5 text-center font-mono text-[11px] tabular-nums',
        bg,
      )}
      aria-label={`Nota ${score.toFixed(1)} de ${maxWeight}`}
    >
      {score.toFixed(1)}
    </td>
  );
}

function classByRatio(r: number): string {
  if (r >= 0.9) return 'bg-grade-excellent/20 text-grade-excellent';
  if (r >= 0.7) return 'bg-grade-good/15 text-grade-good';
  if (r >= 0.5) return 'bg-grade-fair/15 text-grade-fair';
  return 'bg-grade-poor/10 text-grade-poor';
}
