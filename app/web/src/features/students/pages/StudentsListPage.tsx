import { useState } from 'react';
import { Plus, Upload, Users, Trash2, BookOpen } from 'lucide-react';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Input';
import { useMyDisciplines } from '@/features/disciplines/lib/use-disciplines';
import { useStudentsByDiscipline, useUnlinkStudent } from '../lib/use-students';
import { ImportDrawer } from '../components/ImportDrawer';
import { AddStudentDrawer } from '../components/AddStudentDrawer';

export function StudentsListPage() {
  const [disciplineId, setDisciplineId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: disciplines, isLoading: loadingDisciplines } = useMyDisciplines();
  const { data: junctions, isLoading: loadingStudents } = useStudentsByDiscipline(disciplineId);
  const unlinkMut = useUnlinkStudent();

  const currentDiscipline = disciplines?.find((d) => d.id === disciplineId) ?? null;

  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!disciplineId) return;
    const ok = window.confirm(
      `Remover "${studentName}" desta disciplina? O aluno continua cadastrado em outras disciplinas.`,
    );
    if (!ok) return;
    await unlinkMut.mutateAsync({ disciplineId, studentId });
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-8">
          <h1 className="font-display text-lg font-semibold tracking-tight">Alunos</h1>

          <div className="flex items-center gap-3">
            <Select
              name="discipline"
              value={disciplineId ?? ''}
              onChange={(e) => setDisciplineId(e.target.value || null)}
              options={
                disciplines?.map((d) => ({
                  value: d.id,
                  label: `${d.name} · ${d.semester}`,
                })) ?? []
              }
              placeholder={loadingDisciplines ? 'Carregando…' : 'Selecione uma disciplina'}
              className="min-w-[320px]"
            />

            {disciplineId && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  onClick={() => setImportOpen(true)}
                >
                  Importar lista
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setAddOpen(true)}
                >
                  Adicionar aluno
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="px-8 py-8">
        {!disciplineId && (
          <EmptySelector hasDisciplines={(disciplines?.length ?? 0) > 0} />
        )}

        {disciplineId && loadingStudents && <SkeletonTable />}

        {disciplineId && !loadingStudents && junctions && junctions.length === 0 && (
          <EmptyStudentList onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)} />
        )}

        {disciplineId && junctions && junctions.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
            <table className="w-full text-left">
              <thead className="border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="w-10 px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="w-32 px-4 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {junctions.map((j, idx) => (
                  <tr key={j.studentId} className="group text-sm hover:bg-bg-surface-hi">
                    <td className="px-4 py-2.5 font-mono text-xs text-text-muted tabular-nums">
                      {(idx + 1).toString().padStart(3, '0')}
                    </td>
                    <td className="px-4 py-2.5">{j.studentName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleUnlink(j.studentId, j.studentName)}
                        className="invisible inline-flex h-7 w-7 items-center justify-center rounded-sm text-text-muted transition-colors group-hover:visible hover:bg-danger/10 hover:text-danger"
                        aria-label="Remover da disciplina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-bg text-xs text-text-muted">
                <tr>
                  <td colSpan={3} className="px-4 py-2 font-mono tabular-nums">
                    {junctions.length} aluno{junctions.length > 1 ? 's' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {disciplineId && currentDiscipline && (
        <>
          <ImportDrawer
            open={importOpen}
            onClose={() => setImportOpen(false)}
            disciplineId={disciplineId}
            disciplineName={currentDiscipline.name}
          />
          <AddStudentDrawer
            open={addOpen}
            onClose={() => setAddOpen(false)}
            disciplineId={disciplineId}
            disciplineName={currentDiscipline.name}
          />
        </>
      )}
    </AppShell>
  );
}

function EmptySelector({ hasDisciplines }: { hasDisciplines: boolean }) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-bg-surface text-text-muted">
        {hasDisciplines ? <Users className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
      </div>
      <h2 className="font-display text-md font-semibold">
        {hasDisciplines ? 'Escolha uma disciplina' : 'Crie uma disciplina primeiro'}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        {hasDisciplines
          ? 'Alunos são gerenciados por disciplina. Selecione uma no seletor acima.'
          : 'Você precisa ter pelo menos uma disciplina antes de cadastrar alunos.'}
      </p>
      {!hasDisciplines && (
        <a
          href="/disciplinas"
          className="mt-4 text-sm text-primary hover:text-primary-hover"
        >
          Ir para disciplinas →
        </a>
      )}
    </div>
  );
}

function EmptyStudentList({
  onImport,
  onAdd,
}: {
  onImport: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-bg-surface text-text-muted">
        <Users className="h-6 w-6" />
      </div>
      <h2 className="font-display text-md font-semibold">Sem alunos ainda</h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Cadastre alunos um a um ou cole uma lista completa. Você pode importar do Excel (CSV)
        também.
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          variant="secondary"
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={onImport}
        >
          Importar lista
        </Button>
        <Button leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={onAdd}>
          Adicionar aluno
        </Button>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface" aria-busy>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse border-b border-border last:border-0" />
      ))}
    </div>
  );
}
