import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Step {
  id: string;
  label: string;
}

interface Props {
  steps: Step[];
  current: number; // 0-indexed
  className?: string;
}

export function Stepper({ steps, current, className }: Props) {
  return (
    <nav aria-label="Progresso" className={cn('w-full', className)}>
      <ol className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < current;
          const isCurrent = idx === current;
          const isLast = idx === steps.length - 1;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-pill text-[11px] font-mono tabular-nums',
                    isDone && 'bg-success text-bg',
                    isCurrent && 'bg-primary text-white',
                    !isDone && !isCurrent && 'bg-bg-surface-hi text-text-muted',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-xs sm:inline',
                    isCurrent ? 'text-text' : 'text-text-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'h-px flex-1 transition-colors',
                    isDone ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
