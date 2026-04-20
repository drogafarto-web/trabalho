import { useState, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '@/features/auth/lib/use-auth';
import { cn } from '@/lib/cn';
import { parseXlsxFile } from '../lib/xlsx-parser';
import { parseEstruturaWorkbook } from '../lib/estrutura-parser';
import { diffEstrutura } from '../lib/estrutura-diff';
import { commitEstrutura } from '../lib/estrutura-commit';
import { listDisciplinesByOwner } from '@/features/disciplines/lib/discipline-repo';
import { listTermsByOwner } from '@/features/terms/lib/term-repo';
import { listAssignmentsByOwner } from '@/features/assignments/lib/assignment-repo';
import type { DiffEntry, EstruturaDiff, ImportCommitResult } from '../lib/types';

type EstruturaState =
  | { phase: 'idle' }
  | { phase: 'parsing' }
  | { phase: 'preview'; diff: EstruturaDiff; globalErrors: string[] }
  | { phase: 'committing' }
  | { phase: 'done'; result: ImportCommitResult }
  | { phase: 'error'; message: string };

export function ImportPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [estrutura, setEstrutura] = useState<EstruturaState>({ phase: 'idle' });

  const handleEstruturaFile = useCallback(
    async (file: File) => {
      if (!uid) return;
      setEstrutura({ phase: 'parsing' });
      try {
        const wb = await parseXlsxFile(file);
        const parsed = parseEstruturaWorkbook(wb);
        const [disciplines, terms, assignments] = await Promise.all([
          listDisciplinesByOwner(uid),
          listTermsByOwner(uid),
          listAssignmentsByOwner(uid),
        ]);
        const diff = diffEstrutura(parsed, {
          ownerUid: uid,
          existingDisciplines: disciplines,
          existingTerms: terms,
          existingAssignments: assignments,
        });
        setEstrutura({ phase: 'preview', diff, globalErrors: parsed.globalErrors });
      } catch (err) {
        setEstrutura({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Falha ao ler o arquivo',
        });
      }
    },
    [uid],
  );

  const handleEstruturaCommit = useCallback(async () => {
    if (!uid || estrutura.phase !== 'preview') return;
    const diff = estrutura.diff;
    setEstrutura({ phase: 'committing' });
    try {
      const result = await commitEstrutura(diff, uid);
      setEstrutura({ phase: 'done', result });
    } catch (err) {
      setEstrutura({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Falha ao gravar',
      });
    }
  }, [uid, estrutura]);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-8">
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight">Importar estrutura</h1>
            <p className="text-[11px] text-text-muted">
              Disciplinas, etapas e atividades de uma só vez. Pra alunos, vá pro menu Alunos.
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-8 px-8 py-8 max-w-5xl">
        <ImportCard
          title="Estrutura acadêmica"
          description="Disciplinas, etapas e atividades em um único arquivo. Preencha no Excel ou Google Sheets, baixe como XLSX e suba aqui."
          templateHref="/templates/estrutura.xlsx"
          templateFilename="estrutura.xlsx"
          state={estrutura}
          onFile={(f) => void handleEstruturaFile(f)}
          onCommit={() => void handleEstruturaCommit()}
          onReset={() => setEstrutura({ phase: 'idle' })}
          renderPreview={(state) =>
            state.phase === 'preview' ? (
              <EstruturaPreview diff={state.diff} globalErrors={state.globalErrors} />
            ) : null
          }
        />

        <aside className="rounded-lg border border-border bg-bg-surface/50 p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Alunos
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            O import de alunos foi movido pra dentro de cada disciplina. Vá em{' '}
            <a href="/alunos" className="text-primary hover:text-primary-hover">
              Alunos
            </a>
            , selecione a disciplina e clique em <b>Importar lista → XLSX</b>. Todos os alunos do
            arquivo são vinculados àquela disciplina automaticamente.
          </p>
        </aside>
      </section>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// ImportCard — container genérico pra um fluxo de import
// ---------------------------------------------------------------------------
type AnyState =
  | { phase: 'idle' }
  | { phase: 'parsing' }
  | { phase: 'preview'; diff: unknown; globalErrors: string[] }
  | { phase: 'committing' }
  | { phase: 'done'; result: ImportCommitResult }
  | { phase: 'error'; message: string };

interface ImportCardProps<S extends AnyState> {
  title: string;
  description: string;
  templateHref: string;
  templateFilename: string;
  state: S;
  onFile: (f: File) => void;
  onCommit: () => void;
  onReset: () => void;
  renderPreview: (state: S) => React.ReactNode;
}

function ImportCard<S extends AnyState>({
  title,
  description,
  templateHref,
  templateFilename,
  state,
  onFile,
  onCommit,
  onReset,
  renderPreview,
}: ImportCardProps<S>) {
  return (
    <article className="rounded-lg border border-border bg-bg-surface">
      <header className="flex items-start justify-between gap-6 border-b border-border p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-bg text-primary">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-muted">
              {description}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={() => {
            const a = document.createElement('a');
            a.href = templateHref;
            a.download = templateFilename;
            a.click();
          }}
        >
          Baixar template
        </Button>
      </header>

      <div className="p-6">
        {state.phase === 'idle' && <XlsxDropzone onFile={onFile} />}

        {state.phase === 'parsing' && (
          <InlineStatus icon="loader" text="Lendo e validando o arquivo…" />
        )}

        {state.phase === 'preview' && (
          <div className="space-y-4">
            {renderPreview(state)}
            <footer className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text"
              >
                <RotateCcw className="h-3 w-3" />
                Subir outro arquivo
              </button>
              <Button
                onClick={onCommit}
                disabled={!hasCreates(state.diff as EstruturaDiff)}
              >
                Confirmar importação
              </Button>
            </footer>
          </div>
        )}

        {state.phase === 'committing' && (
          <InlineStatus icon="loader" text="Gravando…" />
        )}

        {state.phase === 'done' && (
          <ImportResult result={state.result} onReset={onReset} />
        )}

        {state.phase === 'error' && (
          <div className="rounded-sm border border-danger/30 bg-danger/5 p-4">
            <div className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Falha na importação</p>
                <p className="mt-1 text-xs text-danger/80">{state.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="mt-3 text-xs text-text-muted hover:text-text"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function hasCreates(diff: EstruturaDiff): boolean {
  const entries: DiffEntry[][] = [diff.disciplines, diff.terms, diff.assignments];
  return entries.some((arr) => arr.some((e) => e.status === 'create'));
}

// ---------------------------------------------------------------------------
// Dropzone — variant compacta, só pra XLSX
// ---------------------------------------------------------------------------
function XlsxDropzone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (f: File): string | null => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return 'Use um arquivo .xlsx (Excel ou Google Sheets exporta em XLSX).';
    }
    if (f.size > 20 * 1024 * 1024) {
      return 'Arquivo maior que 20MB.';
    }
    return null;
  };

  const handleFile = (f: File | undefined) => {
    setLocalError(null);
    if (!f) return;
    const err = validate(f);
    if (err) {
      setLocalError(err);
      return;
    }
    onFile(f);
  };

  return (
    <div>
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-12 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-bg/50 text-text-secondary hover:border-border-strong hover:text-text',
        )}
      >
        <FileUp className="mb-3 h-5 w-5" />
        <p className="text-sm font-medium">Arraste ou clique pra selecionar o XLSX</p>
        <p className="mt-1 text-[11px] text-text-muted">Até 20MB · preview antes de confirmar</p>
        <input
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="sr-only"
        />
      </label>
      {localError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {localError}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview — estrutura
// ---------------------------------------------------------------------------
function EstruturaPreview({
  diff,
  globalErrors,
}: {
  diff: EstruturaDiff;
  globalErrors: string[];
}) {
  return (
    <div className="space-y-4">
      {globalErrors.length > 0 && (
        <GlobalErrorsBlock errors={globalErrors} />
      )}
      <SummaryRow
        label="Disciplinas"
        entries={diff.disciplines}
        entityLabel="disciplina"
      />
      <SummaryRow label="Etapas" entries={diff.terms} entityLabel="etapa" />
      <SummaryRow
        label="Atividades"
        entries={diff.assignments}
        entityLabel="atividade"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryRow — conta + lista itens problemáticos
// ---------------------------------------------------------------------------
function SummaryRow({
  label,
  entries,
  entityLabel,
}: {
  label: string;
  entries: DiffEntry[];
  entityLabel: string;
}) {
  const counts = {
    create: entries.filter((e) => e.status === 'create').length,
    unchanged: entries.filter((e) => e.status === 'unchanged').length,
    error: entries.filter((e) => e.status === 'error').length,
  };
  const problems = entries.filter((e) => e.status === 'error');

  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-bg p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="mt-1 text-xs text-text-muted">nenhum {entityLabel} na planilha</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-bg p-3">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {counts.create > 0 && (
            <CountPill color="success" label={`${String(counts.create)} nova${counts.create > 1 ? 's' : ''}`} />
          )}
          {counts.unchanged > 0 && (
            <CountPill color="muted" label={`${String(counts.unchanged)} já existe${counts.unchanged > 1 ? 'm' : ''}`} />
          )}
          {counts.error > 0 && (
            <CountPill color="danger" label={`${String(counts.error)} com erro`} />
          )}
        </div>
      </div>
      {problems.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {problems.slice(0, 10).map((p, i) => (
            <li
              key={`${p.kind}-${String(p.rowNumber)}-${String(i)}`}
              className="flex items-start gap-2 text-[11px] text-text-secondary"
            >
              <span className="mt-0.5 font-mono text-text-muted">
                L{String(p.rowNumber).padStart(2, '0')}
              </span>
              <span className="text-danger/90">{p.reason ?? 'erro'}</span>
            </li>
          ))}
          {problems.length > 10 && (
            <li className="text-[11px] text-text-muted">
              +{String(problems.length - 10)} outros erros…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CountPill({
  color,
  label,
}: {
  color: 'success' | 'muted' | 'danger';
  label: string;
}) {
  const styles = {
    success: 'border-success/30 bg-success/10 text-success',
    muted: 'border-border bg-bg-surface text-text-muted',
    danger: 'border-danger/30 bg-danger/10 text-danger',
  } as const;
  return (
    <span
      className={cn(
        'rounded-pill border px-2 py-0.5 font-mono text-[10px] tabular-nums tracking-tight',
        styles[color],
      )}
    >
      {label}
    </span>
  );
}

function GlobalErrorsBlock({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-sm border border-warning/30 bg-warning/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning" />
        <div className="space-y-1">
          {errors.map((e, i) => (
            <p key={String(i)} className="text-[11px] text-warning/90">
              {e}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resultado pós-commit
// ---------------------------------------------------------------------------
function ImportResult({
  result,
  onReset,
}: {
  result: ImportCommitResult;
  onReset: () => void;
}) {
  const totalCreated = Object.values(result.created).reduce(
    (s, n) => s + (n ?? 0),
    0,
  );
  const lines: Array<{ label: string; count: number }> = [];
  if (result.created.disciplines)
    lines.push({ label: 'disciplinas', count: result.created.disciplines });
  if (result.created.terms) lines.push({ label: 'etapas', count: result.created.terms });
  if (result.created.assignments)
    lines.push({ label: 'atividades', count: result.created.assignments });
  if (result.created.students)
    lines.push({ label: 'alunos', count: result.created.students });
  if (result.created.enrollments)
    lines.push({ label: 'matrículas', count: result.created.enrollments });

  return (
    <div className="rounded-sm border border-success/30 bg-success/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
        <div className="flex-1">
          <p className="text-sm font-medium text-success">
            Importação concluída · {totalCreated} item{totalCreated === 1 ? '' : 's'}
          </p>
          <ul className="mt-2 space-y-0.5 text-[11px] text-text-secondary">
            {lines.map((l) => (
              <li key={l.label} className="font-mono tabular-nums">
                {String(l.count).padStart(3, ' ')} {l.label}
              </li>
            ))}
            {result.skipped > 0 && (
              <li className="font-mono tabular-nums text-text-muted">
                {String(result.skipped).padStart(3, ' ')} já existiam ou pulados
              </li>
            )}
          </ul>
          <p className="mt-2 font-mono text-[10px] text-text-muted">
            {(result.durationMs / 1000).toFixed(1)}s
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-text-muted hover:text-text"
        >
          Nova importação
        </button>
      </div>
    </div>
  );
}

function InlineStatus({ icon, text }: { icon: 'loader'; text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-sm border border-border bg-bg/50 py-10 text-sm text-text-secondary">
      {icon === 'loader' && <Loader2 className="h-4 w-4 animate-spin" />}
      {text}
    </div>
  );
}
