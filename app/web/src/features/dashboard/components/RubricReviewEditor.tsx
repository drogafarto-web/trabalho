import { cn } from '@/lib/cn';
import { gradeColorClass } from './StatusDot';
import type { Criterion } from '@/core/domain/discipline';

interface Props {
  criteria: Criterion[];
  aiScores: Record<string, number>;
  scores: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  readOnly?: boolean;
}

/**
 * Editor da rubrica no review. Cada critério vira um slider.
 * Valor da IA em cinza (barra de fundo), valor do professor em azul (preenchimento).
 * Se valor editado difere do da IA, mostra diff.
 */
export function RubricReviewEditor({
  criteria,
  aiScores,
  scores,
  onChange,
  readOnly,
}: Props) {
  const total = Object.values(scores).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      {criteria.map((c) => {
        const ai = aiScores[c.name] ?? 0;
        const current = scores[c.name] ?? ai;
        const diff = current - ai;
        const manuallyAdjusted = Math.abs(diff) > 0.01;

        return (
          <div key={c.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-text">{c.name.replace(/_/g, ' ')}</p>
                <p className="mt-0.5 truncate text-[10px] text-text-muted">{c.description}</p>
              </div>
              <div className="flex items-baseline gap-2 whitespace-nowrap font-mono text-xs tabular-nums">
                {manuallyAdjusted && (
                  <span className="text-[10px] text-text-muted line-through">
                    {ai.toFixed(1)}
                  </span>
                )}
                <span className={cn('text-sm', manuallyAdjusted ? 'text-primary' : 'text-text')}>
                  {current.toFixed(1)}
                </span>
                <span className="text-[10px] text-text-muted">/ {c.weight}</span>
              </div>
            </div>

            <div className="relative">
              {/* Barra de fundo mostrando valor da IA */}
              <div
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-text-muted/20"
                style={{ width: `${String((ai / c.weight) * 100)}%` }}
                aria-hidden="true"
              />
              <input
                type="range"
                min={0}
                max={c.weight}
                step={0.5}
                value={current}
                disabled={readOnly}
                onChange={(e) => onChange({ ...scores, [c.name]: Number(e.target.value) })}
                aria-label={`Nota para ${c.name}`}
                className={cn(
                  'relative z-10 h-1 w-full appearance-none rounded-pill bg-transparent',
                  '[&::-webkit-slider-thumb]:appearance-none',
                  '[&::-webkit-slider-thumb]:h-3',
                  '[&::-webkit-slider-thumb]:w-3',
                  '[&::-webkit-slider-thumb]:rounded-pill',
                  '[&::-webkit-slider-thumb]:border-0',
                  '[&::-webkit-slider-thumb]:bg-primary',
                  '[&::-webkit-slider-thumb]:shadow-subtle',
                  '[&::-webkit-slider-thumb]:cursor-pointer',
                  '[&::-moz-range-thumb]:h-3',
                  '[&::-moz-range-thumb]:w-3',
                  '[&::-moz-range-thumb]:rounded-pill',
                  '[&::-moz-range-thumb]:border-0',
                  '[&::-moz-range-thumb]:bg-primary',
                  '[&::-moz-range-thumb]:cursor-pointer',
                  readOnly && 'opacity-50',
                )}
              />
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Nota final
        </span>
        <span className={cn('font-mono text-2xl font-bold tabular-nums', gradeColorClass(total))}>
          {total.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
