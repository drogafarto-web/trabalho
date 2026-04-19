import { FileCheck2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import type { Submission } from '@/core/domain/submission';
import { cn } from '@/lib/cn';
import { gradeColorClass } from './StatusDot';

interface Props {
  submissions: Submission[];
}

export function KpiCards({ submissions }: Props) {
  const total = submissions.length;
  const waitingAi = submissions.filter((s) => s.status === 'WAITING_FOR_AI' || s.status === 'AI_PROCESSING').length;
  const pendingReview = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;

  const approved = submissions.filter((s) => s.status === 'APPROVED');
  const avg =
    approved.length > 0
      ? approved.reduce((sum, s) => sum + (s.review?.finalEvaluation?.finalScore ?? 0), 0) / approved.length
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        icon={FileCheck2}
        label="Total"
        value={total.toString().padStart(2, '0')}
        color="text-text"
      />
      <Kpi
        icon={Clock}
        label="Aguardando IA"
        value={waitingAi.toString().padStart(2, '0')}
        color={waitingAi > 0 ? 'text-primary' : 'text-text-muted'}
      />
      <Kpi
        icon={AlertCircle}
        label="Pendentes revisão"
        value={pendingReview.toString().padStart(2, '0')}
        color={pendingReview > 0 ? 'text-warning' : 'text-text-muted'}
      />
      <Kpi
        icon={TrendingUp}
        label="Média da turma"
        value={avg !== null ? avg.toFixed(1) : '—'}
        color={avg !== null ? gradeColorClass(avg) : 'text-text-muted'}
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="flex items-center gap-1.5 text-text-muted">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('mt-2 font-mono text-2xl tabular-nums', color)}>
        {value}
      </p>
    </div>
  );
}
