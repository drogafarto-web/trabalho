import { useMemo, useState } from 'react';
import { Download, Printer, Users, UserSquare, Grid3x3 } from 'lucide-react';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Input';
import { gradeColorClass, StatusDot } from '@/features/dashboard/components/StatusDot';
import { HeatmapCell } from '../components/HeatmapCell';
import { useMyDisciplines } from '@/features/disciplines/lib/use-disciplines';
import { useSubmissionsByDiscipline } from '@/features/dashboard/lib/use-submissions';
import {
  deriveByStudent,
  deriveByGroup,
  deriveByCriterion,
  buildCsvByStudent,
  buildCsvByCriterion,
  downloadCsv,
} from '../lib/derive-reports';
import { cn } from '@/lib/cn';

type View = 'aluno' | 'grupo' | 'criterio';

export function ReportsPage() {
  const { data: disciplines, isLoading: loadingDisciplines } = useMyDisciplines();
  const [disciplineId, setDisciplineId] = useState<string | null>(null);
  const [view, setView] = useState<View>('aluno');

  const effectiveDisciplineId = disciplineId ?? (disciplines?.[0]?.id ?? null);
  const discipline = disciplines?.find((d) => d.id === effectiveDisciplineId) ?? null;

  const { data: submissions } = useSubmissionsByDiscipline(effectiveDisciplineId);

  const byStudent = useMemo(() => deriveByStudent(submissions), [submissions]);
  const byGroup = useMemo(() => deriveByGroup(submissions), [submissions]);
  const byCriterion = useMemo(() => deriveByCriterion(submissions, discipline), [submissions, discipline]);

  const handleExportCsv = () => {
    if (!discipline) return;
    const today = new Date().toISOString().split('T')[0];
    if (view === 'criterio') {
      downloadCsv(
        buildCsvByCriterion(byCriterion, discipline),
        `Notas_Criterios_${discipline.code}_${today}.csv`,
      );
    } else {
      downloadCsv(
        buildCsvByStudent(byStudent, discipline),
        `Notas_Alunos_${discipline.code}_${today}.csv`,
      );
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md print:hidden">
        <div className="flex h-14 items-center justify-between gap-4 px-8">
          <h1 className="font-display text-lg font-semibold tracking-tight">Relatórios</h1>

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
              placeholder={loadingDisciplines ? 'Carregando…' : 'Selecione'}
              className="min-w-[260px]"
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCsv}
              disabled={!discipline || submissions.length === 0}
            >
              Baixar CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={() => window.print()}
              disabled={!discipline || submissions.length === 0}
            >
              Imprimir
            </Button>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 border-t border-border bg-bg px-8 py-2">
          <ViewButton active={view === 'aluno'} onClick={() => setView('aluno')} icon={UserSquare}>
            Por aluno
          </ViewButton>
          <ViewButton active={view === 'grupo'} onClick={() => setView('grupo')} icon={Users}>
            Por grupo
          </ViewButton>
          <ViewButton active={view === 'criterio'} onClick={() => setView('criterio')} icon={Grid3x3}>
            Por critério
          </ViewButton>
        </div>
      </header>

      {/* Título visível apenas na impressão */}
      <div className="hidden print:mb-6 print:block">
        <h1 className="text-center font-serif text-xl font-bold text-black">
          RELATÓRIO DE NOTAS ACADÊMICAS
        </h1>
        <p className="mt-1 text-center font-serif text-sm text-gray-700">
          {discipline?.name} · {discipline?.code} · {discipline?.semester}
        </p>
        <p className="mt-0.5 text-center font-serif text-[11px] text-gray-500">
          Emitido em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      <section className="px-8 py-6 print:px-0 print:py-0">
        {submissions.length === 0 && (
          <p className="mt-12 text-center text-sm text-text-muted">
            Nenhum trabalho avaliado ainda nesta disciplina.
          </p>
        )}

        {view === 'aluno' && submissions.length > 0 && (
          <StudentTable rows={byStudent} />
        )}
        {view === 'grupo' && submissions.length > 0 && (
          <GroupTable rows={byGroup} />
        )}
        {view === 'criterio' && submissions.length > 0 && (
          <CriterionHeatmap matrix={byCriterion} />
        )}
      </section>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// View: por aluno
// ---------------------------------------------------------------------------
function StudentTable({ rows }: { rows: ReturnType<typeof deriveByStudent> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface print:border print:border-black">
      <table className="w-full text-left print:font-serif">
        <thead className="border-b border-border bg-bg text-[10px] uppercase tracking-wider text-text-muted print:bg-white print:text-black">
          <tr>
            <th className="w-10 px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Aluno</th>
            <th className="px-3 py-2 font-medium">Grupo</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="w-20 px-3 py-2 text-right font-medium">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border print:divide-gray-300">
          {rows.map((r, i) => (
            <tr key={`${r.submissionId}_${r.studentId}`} className="text-sm hover:bg-bg-surface-hi print:hover:bg-transparent">
              <td className="px-3 py-2 font-mono text-[11px] text-text-muted tabular-nums print:text-black">
                {(i + 1).toString().padStart(3, '0')}
              </td>
              <td className="px-3 py-2 font-medium uppercase print:text-black">{r.studentName}</td>
              <td className="px-3 py-2 text-xs text-text-secondary print:text-black">
                {r.groupSize > 1 ? `${r.groupSize} alunos` : 'Individual'}
              </td>
              <td className="px-3 py-2 print:text-black">
                <StatusDot status={r.status} />
              </td>
              <td className="px-3 py-2 text-right">
                {r.finalScore != null ? (
                  <span className={cn('font-mono text-sm tabular-nums print:text-black', gradeColorClass(r.finalScore))}>
                    {r.finalScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: por grupo
// ---------------------------------------------------------------------------
function GroupTable({ rows }: { rows: ReturnType<typeof deriveByGroup> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface print:border print:border-black">
      <table className="w-full text-left print:font-serif">
        <thead className="border-b border-border bg-bg text-[10px] uppercase tracking-wider text-text-muted print:bg-white print:text-black">
          <tr>
            <th className="w-16 px-3 py-2 font-medium">Protocolo</th>
            <th className="px-3 py-2 font-medium">Integrantes</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="w-20 px-3 py-2 text-right font-medium">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border print:divide-gray-300">
          {rows.map((r) => (
            <tr key={r.submissionId} className="text-sm print:text-black">
              <td className="px-3 py-2 font-mono text-xs text-text-secondary print:text-black">
                {r.shortId}
              </td>
              <td className="px-3 py-2 print:text-black">
                <span className="truncate">{r.studentNames.join(', ')}</span>
              </td>
              <td className="px-3 py-2">
                <StatusDot status={r.status} />
              </td>
              <td className="px-3 py-2 text-right">
                {r.finalScore != null ? (
                  <span className={cn('font-mono text-sm tabular-nums print:text-black', gradeColorClass(r.finalScore))}>
                    {r.finalScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View: heatmap por critério
// ---------------------------------------------------------------------------
function CriterionHeatmap({ matrix }: { matrix: ReturnType<typeof deriveByCriterion> }) {
  if (matrix.criteria.length === 0) {
    return (
      <p className="mt-12 text-center text-sm text-text-muted">
        Rubrica não disponível.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-surface print:border print:border-black">
      <table className="w-full text-left print:font-serif">
        <thead className="border-b border-border bg-bg text-[10px] uppercase tracking-wider text-text-muted print:bg-white print:text-black">
          <tr>
            <th className="sticky left-0 bg-bg px-3 py-2 font-medium print:bg-white">Aluno</th>
            {matrix.criteria.map((c) => (
              <th
                key={c.name}
                className="px-2 py-2 text-center font-medium"
                title={c.description}
              >
                {c.name.replace(/_/g, ' ')}
                <div className="text-[9px] text-text-muted">máx {c.weight}</div>
              </th>
            ))}
            <th className="w-20 px-3 py-2 text-right font-medium">Final</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border print:divide-gray-300">
          {matrix.studentRows.map((row) => (
            <tr key={row.studentId} className="text-xs print:text-black">
              <td className="sticky left-0 bg-bg-surface px-3 py-1.5 text-xs font-medium uppercase print:bg-white print:text-black">
                {row.studentName}
              </td>
              {matrix.criteria.map((c) => (
                <HeatmapCell
                  key={c.name}
                  score={row.scores[c.name] ?? null}
                  maxWeight={c.weight}
                />
              ))}
              <td className="px-3 py-1.5 text-right">
                {row.finalScore != null ? (
                  <span className={cn('font-mono text-sm tabular-nums print:text-black', gradeColorClass(row.finalScore))}>
                    {row.finalScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-[11px] transition-colors',
        active
          ? 'bg-bg-surface-hi text-text'
          : 'text-text-muted hover:bg-bg-surface hover:text-text-secondary',
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}
