import { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Copy,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import {
  useArchiveTerm,
  useCreateTermsBatch,
  useDeleteTerm,
  useTermsByDiscipline,
  useUnarchiveTerm,
} from '../lib/use-terms';
import { useAssignmentsByDiscipline } from '@/features/assignments/lib/use-assignments';
import { TermDrawer } from './TermDrawer';
import { CopyTermsDialog } from './CopyTermsDialog';
import type { Term, TermInput } from '@/core/domain/term';

interface Props {
  disciplineId: string;
}

export function TermsSection({ disciplineId }: Props) {
  const { data: terms, isLoading, isError, error } = useTermsByDiscipline(disciplineId);
  const { data: assignments } = useAssignmentsByDiscipline(disciplineId);
  const archive = useArchiveTerm(disciplineId);
  const unarchive = useUnarchiveTerm(disciplineId);
  const remove = useDeleteTerm(disciplineId);
  const batch = useCreateTermsBatch(disciplineId);

  const countByTerm = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments ?? []) {
      map.set(a.termId, (map.get(a.termId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const [drawer, setDrawer] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; term: Term }
    | null
  >(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<number, Term[]>();
    for (const t of terms ?? []) {
      const arr = map.get(t.year) ?? [];
      arr.push(t);
      map.set(t.year, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({
        year,
        items: items.sort((a, b) => a.number - b.number),
      }));
  }, [terms]);

  const handleArchiveToggle = async (t: Term) => {
    if (t.status === 'active') await archive.mutateAsync(t.id);
    else await unarchive.mutateAsync(t.id);
  };

  const handleDelete = async (t: Term) => {
    const ok = window.confirm(
      `Apagar "${t.label}"? Atividades vinculadas a ela ficam sem etapa.`,
    );
    if (!ok) return;
    await remove.mutateAsync(t.id);
  };

  const handlePreset = async (count: 3 | 4) => {
    const year = new Date().getFullYear();
    const inputs: TermInput[] = Array.from({ length: count }, (_, i) => ({
      year,
      number: i + 1,
    }));
    await batch.mutateAsync(inputs);
  };

  const hasTerms = (terms?.length ?? 0) > 0;

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-md font-semibold tracking-tight">Etapas</h2>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {(terms?.length ?? 0).toString().padStart(2, '0')}
          </span>
        </div>
        {hasTerms && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-sm border border-border bg-bg p-2 text-text-muted transition-colors hover:text-text"
                aria-label="Mais ações"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar"
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-sm border border-border bg-bg-surface shadow-elevated">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setCopyOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg hover:text-text"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar de outra disciplina
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setDrawer({ mode: 'create' })}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nova etapa
            </Button>
          </div>
        )}
      </div>

      <ContextBanner />

      {isLoading && <Skeleton />}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
          <p className="font-medium">Não foi possível carregar as etapas.</p>
          {error instanceof Error && (
            <p className="mt-1 font-mono text-xs opacity-70">{error.message}</p>
          )}
        </div>
      )}
      {!isLoading && !isError && !hasTerms && (
        <Empty
          onCreate={() => setDrawer({ mode: 'create' })}
          onPreset={(n) => void handlePreset(n)}
          onCopy={() => setCopyOpen(true)}
          loading={batch.isPending}
        />
      )}

      {grouped.map((group) => (
        <div key={group.year} className="mb-10">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-text-muted">
            {group.year}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-surface">
            {group.items.map((t) => (
              <TermRow
                key={t.id}
                term={t}
                assignmentCount={countByTerm.get(t.id) ?? 0}
                onEdit={() => setDrawer({ mode: 'edit', term: t })}
                onArchive={() => void handleArchiveToggle(t)}
                onDelete={() => void handleDelete(t)}
              />
            ))}
          </ul>
        </div>
      ))}

      {drawer && (
        <TermDrawer
          open
          mode={drawer.mode}
          disciplineId={disciplineId}
          term={drawer.mode === 'edit' ? drawer.term : null}
          onClose={() => setDrawer(null)}
        />
      )}

      {copyOpen && (
        <CopyTermsDialog
          open
          disciplineId={disciplineId}
          existingTerms={terms ?? []}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </>
  );
}

function TermRow({
  term,
  assignmentCount,
  onEdit,
  onArchive,
  onDelete,
}: {
  term: Term;
  assignmentCount: number;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const range = formatRange(term);
  return (
    <li className="group relative flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-pill text-[11px] font-semibold',
            term.status === 'active'
              ? 'bg-primary/15 text-primary'
              : 'bg-bg text-text-muted',
          )}
          title={term.status === 'active' ? 'Ativa' : 'Arquivada'}
        >
          {term.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text">{term.label}</p>
          {range && <p className="truncate text-xs text-text-muted">{range}</p>}
        </div>
        <span className="shrink-0 rounded-pill bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {assignmentCount} {assignmentCount === 1 ? 'atividade' : 'atividades'}
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-sm p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-bg hover:text-text group-hover:opacity-100 data-[open=true]:opacity-100"
          data-open={open}
          aria-label="Ações"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {open && (
          <>
            <button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-sm border border-border bg-bg-surface shadow-elevated">
              <MenuItem onClick={() => { setOpen(false); onEdit(); }} icon={<Pencil className="h-3.5 w-3.5" />}>
                Editar
              </MenuItem>
              <MenuItem
                onClick={() => { setOpen(false); onArchive(); }}
                icon={term.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
              >
                {term.status === 'active' ? 'Arquivar' : 'Desarquivar'}
              </MenuItem>
              <MenuItem onClick={() => { setOpen(false); onDelete(); }} icon={<Trash2 className="h-3.5 w-3.5" />} danger>
                Apagar
              </MenuItem>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function MenuItem({
  onClick,
  icon,
  children,
  danger = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-bg',
        danger ? 'text-danger' : 'text-text-secondary hover:text-text',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function formatRange(t: Term): string | null {
  if (!t.startsAt && !t.endsAt) return null;
  const fmt = 'dd/MM';
  const a = t.startsAt ? format(t.startsAt.toDate(), fmt, { locale: ptBR }) : '?';
  const b = t.endsAt ? format(t.endsAt.toDate(), fmt, { locale: ptBR }) : '?';
  return `${a} → ${b}`;
}

function ContextBanner() {
  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-border/60 bg-bg-surface/40 px-4 py-3 text-xs text-text-muted">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
      <p className="leading-relaxed">
        Etapas agrupam as atividades desta disciplina por período letivo. Cada
        disciplina tem o próprio calendário — útil se você leciona em
        instituições com bimestres/trimestres diferentes.
      </p>
    </div>
  );
}

function Empty({
  onCreate,
  onPreset,
  onCopy,
  loading,
}: {
  onCreate: () => void;
  onPreset: (count: 3 | 4) => void;
  onCopy: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-bg-surface text-text-muted">
        <CalendarDays className="h-6 w-6" />
      </div>
      <h2 className="font-display text-md font-semibold">Sem etapas ainda</h2>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        Etapas agrupam suas atividades por período letivo (1ª, 2ª, 3ª…). Escolha
        um preset pra começar rápido ou crie manualmente.
      </p>

      <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
        <PresetButton
          title="Trimestral"
          subtitle="3 etapas"
          onClick={() => onPreset(3)}
          disabled={loading}
        />
        <PresetButton
          title="Bimestral"
          subtitle="4 etapas"
          onClick={() => onPreset(4)}
          disabled={loading}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Criar manualmente
        </Button>
        <span className="text-xs text-text-muted">ou</span>
        <Button variant="ghost" size="sm" onClick={onCopy} leftIcon={<Copy className="h-3.5 w-3.5" />}>
          Copiar de outra disciplina
        </Button>
      </div>
    </div>
  );
}

function PresetButton({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-1 rounded-sm border border-border bg-bg-surface px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
    >
      <span className="font-display text-sm font-semibold text-text">{title}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
        {subtitle}
      </span>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-bg-surface" />
      ))}
    </div>
  );
}
