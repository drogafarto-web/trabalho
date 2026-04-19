import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users } from 'lucide-react';
import type { Submission } from '@/core/domain/submission';
import { StatusDot, gradeColorClass } from './StatusDot';
import { cn } from '@/lib/cn';

interface Props {
  submissions: Submission[];
  onOpen: (s: Submission) => void;
  selectedId: string | null;
}

export function SubmissionsTable({ submissions, onOpen, selectedId }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="mt-12 rounded-lg border border-dashed border-border bg-bg-surface/50 px-4 py-16 text-center">
        <p className="text-sm text-text-muted">Nenhuma submissão encontrada.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
      <table className="w-full text-left">
        <thead className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="w-10 px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Protocolo</th>
            <th className="px-3 py-2.5 font-medium">Alunos</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Enviado</th>
            <th className="w-20 px-3 py-2.5 text-right font-medium">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {submissions.map((s, idx) => (
            <Row
              key={s.id}
              submission={s}
              index={idx}
              isSelected={s.id === selectedId}
              onClick={() => onOpen(s)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  submission,
  index,
  isSelected,
  onClick,
}: {
  submission: Submission;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const s = submission;
  const finalScore = s.review?.finalEvaluation?.finalScore ?? null;
  const aiScore = s.status === 'PENDING_REVIEW' || s.status === 'APPROVED' || s.status === 'REJECTED'
    ? null // placeholder; AI evaluation lives in ai.evaluation.finalScore if we want to show
    : null;
  const score = finalScore ?? aiScore;

  const timeAgo = s.submittedAt
    ? formatDistanceToNow(s.submittedAt.toDate(), { addSuffix: true, locale: ptBR })
    : '—';

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer text-sm transition-colors',
        isSelected ? 'bg-bg-surface-hi' : 'hover:bg-bg-surface-hi/60',
      )}
    >
      <td className="px-3 py-3 font-mono text-[11px] text-text-muted tabular-nums">
        {(index + 1).toString().padStart(3, '0')}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-text-secondary">
        {s.shortId}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {s.students.length > 1 && (
            <span className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-bg px-1.5 py-0 text-[10px] text-text-muted">
              <Users className="h-3 w-3" />
              {s.students.length}
            </span>
          )}
          <span className="truncate">
            {s.students.map((st) => st.name).join(', ')}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusDot status={s.status} />
      </td>
      <td className="px-3 py-3 text-xs text-text-muted">{timeAgo}</td>
      <td className="px-3 py-3 text-right">
        {score !== null ? (
          <span className={cn('font-mono text-sm tabular-nums', gradeColorClass(score))}>
            {score.toFixed(1)}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}
