import { useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Check } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import { useMyDisciplines } from '@/features/disciplines/lib/use-disciplines';
import { useAllOwnerTerms, useCreateTermsBatch } from '../lib/use-terms';
import type { Term, TermInput } from '@/core/domain/term';

interface Props {
  open: boolean;
  disciplineId: string;
  existingTerms: Term[];
  onClose: () => void;
}

/**
 * Fluxo "Copiar etapas de outra disciplina". Útil quando o professor leciona
 * várias disciplinas na mesma instituição com calendário idêntico.
 *
 * Steps:
 *  1. Seleciona disciplina fonte
 *  2. Seleciona quais etapas copiar (default: todas ativas)
 *  3. Confirma → batch insert na disciplina destino
 *
 * Colisão: se já existe uma etapa com mesmo {year, number} na disciplina
 * destino, ela é pulada e sinalizada na UI.
 */
export function CopyTermsDialog({ open, disciplineId, existingTerms, onClose }: Props) {
  const { data: disciplines } = useMyDisciplines();
  const { data: allTerms, isLoading: loadingTerms } = useAllOwnerTerms(open);
  const batchMut = useCreateTermsBatch(disciplineId);

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const otherDisciplines = useMemo(
    () => (disciplines ?? []).filter((d) => d.id !== disciplineId && !d.deletedAt),
    [disciplines, disciplineId],
  );

  const termsOfSource = useMemo(() => {
    if (!sourceId) return [];
    return (allTerms ?? [])
      .filter((t) => t.disciplineId === sourceId && t.status === 'active');
  }, [allTerms, sourceId]);

  const existingKeys = useMemo(
    () => new Set(existingTerms.map((t) => `${t.year}-${t.number}`)),
    [existingTerms],
  );

  const handleSelectSource = (id: string) => {
    setSourceId(id);
    // Default: tudo selecionado (exceto colisões)
    const terms = (allTerms ?? []).filter((t) => t.disciplineId === id && t.status === 'active');
    const preset = new Set<string>();
    for (const t of terms) {
      if (!existingKeys.has(`${t.year}-${t.number}`)) preset.add(t.id);
    }
    setSelected(preset);
  };

  const toggle = (termId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return next;
    });
  };

  const handleConfirm = async () => {
    setError(null);
    const toCopy = termsOfSource.filter((t) => selected.has(t.id));
    if (toCopy.length === 0) {
      setError('Selecione ao menos uma etapa');
      return;
    }
    const inputs: TermInput[] = toCopy.map((t) => ({
      year: t.year,
      number: t.number,
      label: t.label,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
    }));
    try {
      await batchMut.mutateAsync(inputs);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao copiar');
    }
  };

  const totalSelected = selected.size;

  return (
    <Drawer open={open} onClose={onClose} title="Copiar etapas de outra disciplina" width={480}>
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Step 1: escolhe disciplina fonte */}
          <div>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-text-muted">
              1. Disciplina de origem
            </h3>
            {otherDisciplines.length === 0 ? (
              <div className="rounded-sm border border-border/60 bg-bg/40 p-4 text-xs text-text-muted">
                Você não tem outra disciplina com etapas pra copiar.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {otherDisciplines.map((d) => {
                  const count = (allTerms ?? []).filter(
                    (t) => t.disciplineId === d.id && t.status === 'active',
                  ).length;
                  const active = sourceId === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSource(d.id)}
                        disabled={count === 0}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left text-sm transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-text'
                            : count === 0
                            ? 'border-border bg-bg text-text-muted opacity-60'
                            : 'border-border bg-bg text-text-secondary hover:border-border-strong hover:text-text',
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{d.name}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                          {count} {count === 1 ? 'etapa' : 'etapas'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Step 2: escolhe etapas */}
          {sourceId && (
            <div>
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-text-muted">
                2. Etapas a copiar
              </h3>
              {loadingTerms ? (
                <div className="text-xs text-text-muted">Carregando…</div>
              ) : termsOfSource.length === 0 ? (
                <div className="text-xs text-text-muted">Sem etapas ativas nessa disciplina.</div>
              ) : (
                <ul className="space-y-1.5">
                  {termsOfSource.map((t) => {
                    const key = `${t.year}-${t.number}`;
                    const collides = existingKeys.has(key);
                    const checked = selected.has(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => !collides && toggle(t.id)}
                          disabled={collides}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left text-sm transition-colors',
                            collides
                              ? 'border-border bg-bg/40 text-text-muted opacity-60'
                              : checked
                              ? 'border-primary bg-primary/10 text-text'
                              : 'border-border bg-bg text-text-secondary hover:border-border-strong hover:text-text',
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 items-center justify-center rounded-sm border shrink-0',
                              checked
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-bg',
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{t.label}</span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                            {t.year}
                          </span>
                          {collides && (
                            <span className="shrink-0 rounded-pill bg-warning/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning">
                              já existe
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-surface p-5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            {totalSelected} selecionada{totalSelected === 1 ? '' : 's'}
          </span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={batchMut.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              loading={batchMut.isPending}
              disabled={totalSelected === 0}
            >
              Copiar {totalSelected > 0 ? `(${totalSelected})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
