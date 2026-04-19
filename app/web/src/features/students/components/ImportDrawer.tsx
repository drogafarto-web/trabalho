import { useMemo, useState } from 'react';
import { AlertCircle, FileText, Upload } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Textarea } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import {
  parseTextList,
  parseCsv,
  diffImport,
  type ParseResult,
  type ImportDiff,
} from '@/core/domain/student';
import { useMyStudents, useBulkImportStudents } from '../lib/use-students';

interface Props {
  open: boolean;
  onClose: () => void;
  disciplineId: string;
  disciplineName: string;
}

type Tab = 'text' | 'csv';

export function ImportDrawer({ open, onClose, disciplineId, disciplineName }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [rawText, setRawText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [confirming, setConfirming] = useState(false);

  const { data: allStudents } = useMyStudents();
  const bulkImport = useBulkImportStudents();

  const parseResult: ParseResult = useMemo(() => {
    const raw = tab === 'text' ? rawText : csvText;
    if (!raw.trim()) return { rows: [], errors: [], duplicatesInInput: [] };
    return tab === 'text' ? parseTextList(raw) : parseCsv(raw);
  }, [tab, rawText, csvText]);

  const diff: ImportDiff = useMemo(() => {
    if (!allStudents || parseResult.rows.length === 0) {
      return { toCreate: [], alreadyExist: [], emailConflicts: [] };
    }
    return diffImport(
      parseResult.rows,
      allStudents.map((s) => ({ name: s.name, email: s.email })),
    );
  }, [parseResult.rows, allStudents]);

  const existingMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    (allStudents ?? []).forEach((s) => m.set(s.name, { id: s.id, name: s.name }));
    return m;
  }, [allStudents]);

  const existingToLink = useMemo(
    () =>
      diff.alreadyExist
        .map((r) => existingMap.get(r.name))
        .filter((v): v is { id: string; name: string } => !!v),
    [diff.alreadyExist, existingMap],
  );

  const canConfirm =
    !confirming &&
    (diff.toCreate.length > 0 || existingToLink.length > 0) &&
    parseResult.errors.length === 0 &&
    diff.emailConflicts.length === 0;

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Arquivo deve ser .csv');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await bulkImport.mutateAsync({
        disciplineId,
        rowsToCreate: diff.toCreate,
        existingStudentIdsToLink: existingToLink,
      });
      // Mostra toast simples via alert por enquanto (Fase 8 substitui por Toast de verdade)
      alert(
        `Importação concluída: ${String(result.created)} novos criados, ${String(
          result.linked,
        )} alunos vinculados à disciplina.`,
      );
      onClose();
    } catch (err) {
      console.error('[import students] erro:', err);
      alert('Erro ao importar. Veja o console.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Importar alunos — ${disciplineName}`} width={640}>
      {/* Tabs */}
      <div className="sticky top-[56px] z-10 flex gap-1 border-b border-border bg-bg-surface px-6">
        <TabButton active={tab === 'text'} onClick={() => setTab('text')} icon={FileText}>
          Colar texto
        </TabButton>
        <TabButton active={tab === 'csv'} onClick={() => setTab('csv')} icon={Upload}>
          Enviar CSV
        </TabButton>
      </div>

      <div className="space-y-5 px-6 py-6">
        {tab === 'text' && (
          <>
            <p className="text-xs text-text-muted">
              Cole uma lista de nomes, <b>um por linha</b>. Espaços e linhas vazias são ignorados.
              Todos os nomes viram MAIÚSCULAS automaticamente.
            </p>
            <Textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`ALICE SOARES\nBRUNO FERREIRA\nCARLOS DIAS\n...`}
              className="font-mono text-xs"
            />
          </>
        )}

        {tab === 'csv' && (
          <>
            <p className="text-xs text-text-muted">
              CSV com colunas: <code className="font-mono">name</code>,{' '}
              <code className="font-mono">email</code> (opcional),{' '}
              <code className="font-mono">note</code> (opcional). Separador <code>,</code> ou{' '}
              <code>;</code>.
            </p>
            <div className="rounded-sm border border-dashed border-border bg-bg p-4 text-center">
              <label htmlFor="csv-file-input" className="sr-only">
                Enviar arquivo CSV
              </label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                aria-label="Enviar arquivo CSV com lista de alunos"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-xs text-text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-bg-surface file:px-3 file:py-1.5 file:text-xs file:text-text hover:file:bg-bg-surface-hi"
              />
              {csvText && (
                <p className="mt-3 font-mono text-[10px] text-text-secondary">
                  {csvText.split(/\r?\n/).filter((l) => l.trim()).length} linhas carregadas
                </p>
              )}
            </div>

            {csvText && (
              <Textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="font-mono text-[11px]"
              />
            )}
          </>
        )}

        {/* Preview / Diff */}
        {parseResult.rows.length > 0 && (
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Pré-visualização
              </h3>
              <span className="font-mono text-[10px] text-text-muted">
                {parseResult.rows.length} nome{parseResult.rows.length > 1 ? 's' : ''} detectado
                {parseResult.rows.length > 1 ? 's' : ''}
              </span>
            </header>

            <div className="grid grid-cols-3 gap-2">
              <StatBox color="success" label="Novos" value={diff.toCreate.length} />
              <StatBox
                color="text-secondary"
                label="Já existiam"
                value={diff.alreadyExist.length}
              />
              <StatBox
                color={diff.emailConflicts.length > 0 ? 'danger' : 'text-muted'}
                label="Conflitos"
                value={diff.emailConflicts.length}
              />
            </div>

            {diff.emailConflicts.length > 0 && (
              <AlertBlock kind="warning">
                <b>Conflitos de e-mail</b> — esses alunos já existem com e-mail diferente. Resolva
                manualmente (edite no cadastro) antes de importar.
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  {diff.emailConflicts.slice(0, 5).map((c, i) => (
                    <li key={i}>
                      {c.incoming.name}: {c.incoming.email} vs. {c.existing.email ?? '—'}
                    </li>
                  ))}
                  {diff.emailConflicts.length > 5 && (
                    <li className="text-text-muted">+ {diff.emailConflicts.length - 5} outros</li>
                  )}
                </ul>
              </AlertBlock>
            )}

            {parseResult.errors.length > 0 && (
              <AlertBlock kind="danger">
                <b>Erros de parsing</b> ({parseResult.errors.length} linha
                {parseResult.errors.length > 1 ? 's' : ''})
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  {parseResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      linha {e.line}: {e.reason}
                    </li>
                  ))}
                </ul>
              </AlertBlock>
            )}

            {parseResult.duplicatesInInput.length > 0 && (
              <AlertBlock kind="info">
                {parseResult.duplicatesInInput.length} duplicata
                {parseResult.duplicatesInInput.length > 1 ? 's' : ''} na sua lista{' '}
                {parseResult.duplicatesInInput.length > 1 ? 'foram ignoradas' : 'foi ignorada'}.
              </AlertBlock>
            )}

            {diff.toCreate.length > 0 && (
              <details className="rounded-sm border border-border bg-bg">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs text-text-secondary [&::-webkit-details-marker]:hidden">
                  Ver os {diff.toCreate.length} novos que serão criados →
                </summary>
                <div className="max-h-48 overflow-y-auto border-t border-border p-3 font-mono text-[11px]">
                  {diff.toCreate.map((r, i) => (
                    <div key={i} className="text-text-secondary">
                      {r.name}
                      {r.email && <span className="text-text-muted"> · {r.email}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-border bg-bg-surface px-6 py-4">
        <span className="text-xs text-text-muted">
          {canConfirm
            ? `${diff.toCreate.length + existingToLink.length} serão vinculados`
            : 'Cole ou envie uma lista'}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={confirming}
            disabled={!canConfirm}
          >
            Confirmar importação
          </Button>
        </div>
      </footer>
    </Drawer>
  );
}

function TabButton({
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
        'relative flex h-10 items-center gap-1.5 px-3 text-xs transition-colors',
        active ? 'text-text' : 'text-text-muted hover:text-text-secondary',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
    </button>
  );
}

function StatBox({
  color,
  label,
  value,
}: {
  color: 'success' | 'danger' | 'text-secondary' | 'text-muted';
  label: string;
  value: number;
}) {
  const colors = {
    success: 'text-success border-success/20 bg-success/5',
    danger: 'text-danger border-danger/20 bg-danger/5',
    'text-secondary': 'text-text-secondary border-border bg-bg',
    'text-muted': 'text-text-muted border-border bg-bg',
  };
  return (
    <div className={cn('rounded-sm border px-3 py-2', colors[color])}>
      <p className="text-[10px] uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-0.5 font-mono text-md tabular-nums">{value}</p>
    </div>
  );
}

function AlertBlock({
  kind,
  children,
}: {
  kind: 'info' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const kinds = {
    info: 'border-primary/30 bg-primary/5 text-primary',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    danger: 'border-danger/30 bg-danger/5 text-danger',
  };
  return (
    <div className={cn('flex gap-2 rounded-sm border px-3 py-2 text-xs', kinds[kind])}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
