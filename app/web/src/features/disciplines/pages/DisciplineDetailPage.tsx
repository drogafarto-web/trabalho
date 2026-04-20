import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import { useDiscipline } from '@/features/disciplines/lib/use-disciplines';
import { useTermsByDiscipline } from '@/features/terms/lib/use-terms';
import {
  useAssignmentsByDiscipline,
  useDeleteAssignment,
} from '@/features/assignments/lib/use-assignments';
import { AssignmentDrawer } from '@/features/assignments/components/AssignmentDrawer';
import { TermsSection } from '@/features/terms/components/TermsSection';
import {
  KIND_LABELS,
  type Assignment,
  type AssignmentKind,
} from '@/core/domain/assignment';
import type { Term } from '@/core/domain/term';

type Tab = 'atividades' | 'etapas';

export function DisciplineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const disciplineId = id ?? '';

  const tabParam = searchParams.get('tab');
  const tab: Tab = tabParam === 'etapas' ? 'etapas' : 'atividades';

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (t === 'atividades') next.delete('tab');
    else next.set('tab', t);
    setSearchParams(next, { replace: true });
  };

  const { data: discipline, isLoading: dLoading } = useDiscipline(disciplineId);
  const { data: terms } = useTermsByDiscipline(disciplineId);
  const { data: assignments } = useAssignmentsByDiscipline(disciplineId);

  return (
    <AppShell>
      <div className="min-h-full">
        <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-8">
            <button
              type="button"
              onClick={() => navigate('/disciplinas')}
              className="rounded-sm p-1.5 text-text-muted hover:bg-bg-surface hover:text-text"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold tracking-tight">
                {discipline?.name ?? (dLoading ? 'Carregando…' : 'Disciplina')}
              </h1>
              {discipline && (
                <p className="truncate font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  {discipline.code} · {discipline.semester}
                </p>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-1 px-8" aria-label="Seções">
            <TabButton
              active={tab === 'atividades'}
              count={assignments?.length ?? 0}
              onClick={() => setTab('atividades')}
            >
              Atividades
            </TabButton>
            <TabButton
              active={tab === 'etapas'}
              count={terms?.length ?? 0}
              onClick={() => setTab('etapas')}
            >
              Etapas
            </TabButton>
          </nav>
        </header>

        <section className="mx-auto max-w-4xl px-8 pb-16 pt-8">
          {tab === 'atividades' ? (
            <AssignmentsTab
              disciplineId={disciplineId}
              terms={terms ?? []}
              assignments={assignments}
              isLoading={!assignments}
              onGoToTerms={() => setTab('etapas')}
            />
          ) : (
            <TermsSection disciplineId={disciplineId} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-3 py-3 text-sm transition-colors',
        active
          ? 'text-text'
          : 'text-text-muted hover:text-text-secondary',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span>{children}</span>
      <span className="font-mono text-[10px] tabular-nums text-text-muted">
        {count.toString().padStart(2, '0')}
      </span>
      {active && (
        <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-t-sm bg-primary" />
      )}
    </button>
  );
}

function AssignmentsTab({
  disciplineId,
  terms,
  assignments,
  isLoading,
  onGoToTerms,
}: {
  disciplineId: string;
  terms: Term[];
  assignments: Assignment[] | undefined;
  isLoading: boolean;
  onGoToTerms: () => void;
}) {
  const remove = useDeleteAssignment(disciplineId);
  const [drawer, setDrawer] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; assignment: Assignment }
    | null
  >(null);

  const grouped = useMemo(() => groupByTerm(assignments ?? [], terms), [assignments, terms]);

  const handleDelete = async (a: Assignment) => {
    const ok = window.confirm(
      `Apagar atividade "${a.title}"? Submissões já feitas continuam, mas ficam órfãs.`,
    );
    if (!ok) return;
    await remove.mutateAsync(a.id);
  };

  const noTerms = terms.length === 0;
  const noAssignments = !isLoading && (assignments?.length ?? 0) === 0;

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-md font-semibold tracking-tight">Atividades</h2>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {(assignments?.length ?? 0).toString().padStart(2, '0')}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setDrawer({ mode: 'create' })}
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={noTerms}
          title={noTerms ? 'Crie uma etapa antes' : undefined}
        >
          Nova atividade
        </Button>
      </div>

      {noTerms && <NoTermsBanner onGoToTerms={onGoToTerms} />}

      {isLoading && <Skeleton />}

      {!noTerms && noAssignments && <Empty onCreate={() => setDrawer({ mode: 'create' })} />}

      {grouped.map((group) => (
        <div key={group.term?.id ?? 'no-term'} className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {group.term?.label ?? 'Sem etapa'}
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-text-muted">
              {group.items.length} {group.items.length === 1 ? 'atividade' : 'atividades'}
            </span>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-surface">
            {group.items.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onEdit={() => setDrawer({ mode: 'edit', assignment: a })}
                onDelete={() => void handleDelete(a)}
              />
            ))}
          </ul>
        </div>
      ))}

      {drawer && (
        <AssignmentDrawer
          open
          mode={drawer.mode}
          disciplineId={disciplineId}
          assignment={drawer.mode === 'edit' ? drawer.assignment : null}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  );
}

function groupByTerm(
  assignments: Assignment[],
  terms: Term[],
): Array<{ term: Term | null; items: Assignment[] }> {
  const termMap = new Map(terms.map((t) => [t.id, t]));
  const buckets = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const key = a.termId || '__none';
    const arr = buckets.get(key) ?? [];
    arr.push(a);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries())
    .map(([key, items]) => ({
      term: key === '__none' ? null : termMap.get(key) ?? null,
      items,
    }))
    .sort((a, b) => {
      if (!a.term) return 1;
      if (!b.term) return -1;
      if (a.term.year !== b.term.year) return b.term.year - a.term.year;
      return a.term.number - b.term.number;
    });
}

function AssignmentRow({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const a = assignment;
  return (
    <li className="group relative flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <KindBadge kind={a.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{a.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            <span className="font-mono tabular-nums">{a.maxScore} pts</span>
            <span className="inline-flex items-center gap-1">
              {a.mode === 'individual' ? (
                <>
                  <User className="h-3 w-3" />
                  individual
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  grupo até {a.maxGroupSize}
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              {a.accepts.file && <FileText className="h-3 w-3" />}
              {a.accepts.url && <Link2 className="h-3 w-3" />}
            </span>
            {a.dueAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(a.dueAt.toDate(), "dd 'de' MMM", { locale: ptBR })}
              </span>
            )}
            {a.status !== 'open' && (
              <span className="rounded-pill bg-bg px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                {a.status === 'draft' ? 'rascunho' : 'encerrada'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-sm p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-bg hover:text-text group-hover:opacity-100 data-[open=true]:opacity-100"
          data-open={menuOpen}
          aria-label="Ações"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-sm border border-border bg-bg-surface shadow-elevated">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg hover:text-text"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-danger hover:bg-bg"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Apagar
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function KindBadge({ kind }: { kind: AssignmentKind }) {
  const cls =
    kind === 'trabalho'
      ? 'bg-primary/15 text-primary'
      : 'bg-warning/15 text-warning';
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

function NoTermsBanner({ onGoToTerms }: { onGoToTerms: () => void }) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/5 px-5 py-4 text-sm">
      <p className="text-text-secondary">
        Você precisa criar uma <strong className="text-text">etapa</strong> antes de programar atividades.
      </p>
      <button
        type="button"
        onClick={onGoToTerms}
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-warning hover:underline"
      >
        Ir pra Etapas
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-bg-surface text-text-muted">
        <FileText className="h-6 w-6" />
      </div>
      <h2 className="font-display text-md font-semibold">Sem atividades programadas</h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Programe quantos trabalhos e AECOs quiser. Cada atividade tem seu título,
        nota máxima, modo (individual/grupo) e formatos aceitos.
      </p>
      <Button className="mt-6" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
        Criar primeira atividade
      </Button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-bg-surface" />
      ))}
    </div>
  );
}
