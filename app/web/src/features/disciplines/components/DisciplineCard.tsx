import { MoreHorizontal, Archive, Edit3, Users, FileText } from 'lucide-react';
import type { Discipline } from '@/core/domain/discipline';

interface Props {
  discipline: Discipline;
  onEdit: (d: Discipline) => void;
  onArchive: (d: Discipline) => void;
  onEditStudents?: (d: Discipline) => void;
}

export function DisciplineCard({ discipline, onEdit, onArchive, onEditStudents }: Props) {
  const d = discipline;

  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-bg-surface p-5 transition-colors hover:border-border-strong">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <h3 className="truncate font-display text-md font-semibold tracking-tight">
            {d.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-text-muted">{d.code}</p>
        </div>
        <Menu
          onEdit={() => onEdit(d)}
          onEditStudents={onEditStudents ? () => onEditStudents(d) : undefined}
          onArchive={() => onArchive(d)}
        />
      </div>

      {/* Meta */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip>{d.course}</Chip>
        <Chip>{d.period}</Chip>
        <Chip>{d.semester}</Chip>
      </div>

      {/* Badges numéricos */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <Stat icon={FileText} label="critérios" value={d.rubric.criteria.length} />
        <Stat icon={Users} label="alunos" value={0} /> {/* TODO Fase 3 */}
        <Stat icon={FileText} label="entregas" value={0} /> {/* TODO Fase 4 */}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(d)}
          className="flex-1 rounded-sm border border-border bg-bg py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text"
        >
          Editar rubrica
        </button>
        {onEditStudents && (
          <button
            type="button"
            onClick={() => onEditStudents(d)}
            className="flex-1 rounded-sm border border-border bg-bg py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text"
          >
            Editar alunos
          </button>
        )}
      </div>
    </article>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill border border-border bg-bg px-2 py-0.5 text-[11px] text-text-secondary">
      {children}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5 text-text-muted">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

function Menu({
  onEdit,
  onEditStudents,
  onArchive,
}: {
  onEdit: () => void;
  onEditStudents?: (() => void) | undefined;
  onArchive: () => void;
}) {
  // Simple menu implementation — will replace with Radix UI when installed
  return (
    <details className="relative">
      <summary
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-surface-hi hover:text-text [&::-webkit-details-marker]:hidden"
        aria-label="Ações"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-8 z-20 min-w-[180px] overflow-hidden rounded-sm border border-border bg-bg-surface-hi shadow-elevated">
        <MenuItem icon={Edit3} onClick={onEdit}>
          Editar disciplina
        </MenuItem>
        {onEditStudents && (
          <MenuItem icon={Users} onClick={onEditStudents}>
            Gerenciar alunos
          </MenuItem>
        )}
        <MenuItem icon={Archive} onClick={onArchive} danger>
          Arquivar
        </MenuItem>
      </div>
    </details>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  danger,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-bg ' +
        (danger ? 'text-danger' : 'text-text-secondary hover:text-text')
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
