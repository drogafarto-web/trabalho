import { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { DisciplineCard } from '../components/DisciplineCard';
import { DisciplineDrawer } from '../components/DisciplineDrawer';
import { useMyDisciplines, useArchiveDiscipline } from '../lib/use-disciplines';
import type { Discipline } from '@/core/domain/discipline';

export function DisciplinesListPage() {
  const { data: disciplines, isLoading, isError } = useMyDisciplines();
  const archive = useArchiveDiscipline();

  const [drawer, setDrawer] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; discipline: Discipline }
    | null
  >(null);

  const handleCreate = () => setDrawer({ mode: 'create' });
  const handleEdit = (d: Discipline) => setDrawer({ mode: 'edit', discipline: d });
  const handleClose = () => setDrawer(null);

  const handleArchive = async (d: Discipline) => {
    const ok = window.confirm(
      `Arquivar "${d.name}"? Isso não apaga os dados — você pode restaurar depois.`,
    );
    if (!ok) return;
    await archive.mutateAsync(d.id);
  };

  return (
    <AppShell>
      <div className="min-h-full">
        <PageHeader onCreate={handleCreate} count={disciplines?.length ?? 0} />

        <section className="px-8 pb-16">
          {isLoading && <SkeletonGrid />}
          {isError && (
            <ErrorState message="Não foi possível carregar suas disciplinas. Verifique sua conexão." />
          )}
          {!isLoading && !isError && disciplines?.length === 0 && (
            <EmptyState onCreate={handleCreate} />
          )}
          {!isLoading && disciplines && disciplines.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {disciplines.map((d) => (
                <DisciplineCard
                  key={d.id}
                  discipline={d}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </section>

        {drawer && (
          <DisciplineDrawer
            open
            mode={drawer.mode}
            discipline={drawer.mode === 'edit' ? drawer.discipline : null}
            onClose={handleClose}
          />
        )}
      </div>
    </AppShell>
  );
}

function PageHeader({ onCreate, count }: { onCreate: () => void; count: number }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg font-semibold tracking-tight">Disciplinas</h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {count.toString().padStart(2, '0')}
          </span>
        </div>
        <Button size="sm" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Nova disciplina
        </Button>
      </div>
    </header>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-bg-surface text-text-muted">
        <BookOpen className="h-6 w-6" />
      </div>
      <h2 className="font-display text-md font-semibold">Sem disciplinas ainda</h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Crie sua primeira disciplina para começar a receber trabalhos dos alunos.
        Você define a rubrica (critérios com peso) e as perguntas que a IA deve responder.
      </p>
      <Button className="mt-6" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
        Criar primeira disciplina
      </Button>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mt-12 rounded-lg border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
      {message}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[200px] animate-pulse rounded-lg border border-border bg-bg-surface"
        />
      ))}
    </div>
  );
}
