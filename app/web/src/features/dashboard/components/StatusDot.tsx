import { cn } from '@/lib/cn';
import type { SubmissionStatus } from '@/core/domain/submission';

const LABELS: Record<SubmissionStatus, string> = {
  WAITING_FOR_AI: 'Aguardando IA',
  AI_PROCESSING: 'Processando',
  PENDING_REVIEW: 'Pendente revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Devolvido',
};

const COLORS: Record<SubmissionStatus, string> = {
  WAITING_FOR_AI: 'bg-text-muted',
  AI_PROCESSING: 'bg-primary animate-pulse',
  PENDING_REVIEW: 'bg-warning',
  APPROVED: 'bg-success',
  REJECTED: 'bg-danger',
};

export function StatusDot({
  status,
  showLabel = true,
}: {
  status: SubmissionStatus;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('h-1.5 w-1.5 rounded-pill', COLORS[status])} aria-hidden="true" />
      {showLabel && (
        <span className="text-xs text-text-secondary">{LABELS[status]}</span>
      )}
    </span>
  );
}

export function gradeColorClass(score: number | null | undefined): string {
  if (score == null) return 'text-text-muted';
  if (score >= 9) return 'text-grade-excellent';
  if (score >= 7) return 'text-grade-good';
  if (score >= 5) return 'text-grade-fair';
  return 'text-grade-poor';
}
