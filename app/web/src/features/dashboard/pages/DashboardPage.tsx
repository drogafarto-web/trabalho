import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Select } from '@/shared/ui/Input';
import { KpiCards } from '../components/KpiCards';
import { SubmissionsTable } from '../components/SubmissionsTable';
import { ReviewDrawer } from '../components/ReviewDrawer';
import { IntegrityBanner } from '../components/IntegrityBanner';
import { useMyDisciplines } from '@/features/disciplines/lib/use-disciplines';
import { useSubmissionsByDiscipline } from '../lib/use-submissions';
import type { Submission, SubmissionStatus } from '@/core/domain/submission';

const STATUS_FILTERS: Array<{ value: SubmissionStatus | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'WAITING_FOR_AI', label: 'Aguardando IA' },
  { value: 'AI_PROCESSING', label: 'Processando' },
  { value: 'PENDING_REVIEW', label: 'Pendente revisão' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Devolvido' },
];

export function DashboardPage() {
  const { data: disciplines, isLoading: loadingDisciplines } = useMyDisciplines();
  const [disciplineId, setDisciplineId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | ''>('');
  const [selected, setSelected] = useState<Submission | null>(null);

  // Default: seleciona a primeira disciplina automaticamente
  const effectiveDisciplineId =
    disciplineId ?? (disciplines?.[0]?.id ?? null);

  const { data: submissions, isLoading, error } = useSubmissionsByDiscipline(
    effectiveDisciplineId,
    statusFilter || undefined,
  );

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-4 px-8">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-lg font-semibold tracking-tight">Trabalhos</h1>
            {submissions && (
              <span className="font-mono text-xs text-text-muted tabular-nums">
                {submissions.length.toString().padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              name="discipline"
              value={effectiveDisciplineId ?? ''}
              onChange={(e) => setDisciplineId(e.target.value || null)}
              options={
                disciplines?.map((d) => ({
                  value: d.id,
                  label: `${d.name} · ${d.semester}`,
                })) ?? []
              }
              placeholder={loadingDisciplines ? 'Carregando…' : 'Selecione uma disciplina'}
              className="min-w-[260px]"
            />
            <Select
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | '')}
              options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              className="min-w-[160px]"
            />
          </div>
        </div>
      </header>

      <section className="space-y-6 px-8 py-6">
        {!effectiveDisciplineId && (
          <EmptyStateNoDiscipline hasDisciplines={(disciplines?.length ?? 0) > 0} />
        )}

        {effectiveDisciplineId && (
          <>
            <KpiCards submissions={submissions} />

            <IntegrityBanner submissions={submissions} onInspect={setSelected} />

            {error && (
              <div className="flex items-center gap-2 rounded-sm border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                {error.message}
              </div>
            )}

            {isLoading ? (
              <SkeletonRows />
            ) : (
              <SubmissionsTable
                submissions={submissions}
                onOpen={setSelected}
                selectedId={selected?.id ?? null}
              />
            )}
          </>
        )}
      </section>

      {selected && (
        <ReviewDrawer
          open
          submission={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </AppShell>
  );
}

function EmptyStateNoDiscipline({ hasDisciplines }: { hasDisciplines: boolean }) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <p className="text-sm text-text-secondary">
        {hasDisciplines
          ? 'Selecione uma disciplina para ver trabalhos.'
          : 'Você ainda não tem disciplinas.'}
      </p>
      {!hasDisciplines && (
        <a
          href="/disciplinas"
          className="mt-3 text-xs text-primary hover:text-primary-hover"
        >
          Criar primeira disciplina →
        </a>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-sm border border-border bg-bg-surface"
        />
      ))}
    </div>
  );
}
