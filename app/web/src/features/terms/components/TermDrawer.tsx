import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { defaultTermLabel, TermInputSchema, type Term } from '@/core/domain/term';
import { useCreateTerm, useUpdateTerm } from '../lib/use-terms';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  disciplineId: string;
  term: Term | null;
  onClose: () => void;
}

interface FormState {
  year: number;
  number: number;
  label: string;
  startsAt: string;
  endsAt: string;
}

function initial(term: Term | null): FormState {
  if (!term) {
    const year = new Date().getFullYear();
    return {
      year,
      number: 1,
      label: '',
      startsAt: '',
      endsAt: '',
    };
  }
  return {
    year: term.year,
    number: term.number,
    label: term.label,
    startsAt: term.startsAt ? toDateInput(term.startsAt) : '',
    endsAt: term.endsAt ? toDateInput(term.endsAt) : '',
  };
}

function toDateInput(ts: Timestamp): string {
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateInput(v: string): Timestamp | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Timestamp.fromDate(new Date(y, m - 1, d));
}

export function TermDrawer({ open, mode, disciplineId, term, onClose }: Props) {
  const [state, setState] = useState<FormState>(() => initial(term));
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateTerm(disciplineId);
  const updateMut = useUpdateTerm(disciplineId);
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      setState(initial(term));
      setError(null);
    }
  }, [open, term]);

  const labelHint = state.label.trim()
    ? null
    : defaultTermLabel(state.number, state.year);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startsAt = fromDateInput(state.startsAt);
    const endsAt = fromDateInput(state.endsAt);
    const parsed = TermInputSchema.safeParse({
      year: state.year,
      number: state.number,
      label: state.label.trim() || undefined,
      startsAt,
      endsAt,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }

    try {
      if (mode === 'create') {
        await createMut.mutateAsync(parsed.data);
      } else if (term) {
        await updateMut.mutateAsync({ id: term.id, patch: parsed.data });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nova etapa' : 'Editar etapa'}
      width={460}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ano"
            type="number"
            min={2020}
            max={2100}
            value={state.year}
            onChange={(e) => setState((s) => ({ ...s, year: Number(e.target.value) }))}
          />
          <Select
            label="Número"
            value={String(state.number)}
            onChange={(e) =>
              setState((s) => ({ ...s, number: Number(e.target.value) }))
            }
            options={[1, 2, 3, 4].map((n) => ({
              value: String(n),
              label: `${n}ª etapa`,
            }))}
          />
        </div>

        <Input
          label="Nome"
          value={state.label}
          onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
          placeholder={labelHint ?? ''}
          hint={labelHint ? `Vazio = "${labelHint}"` : undefined}
          maxLength={60}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Início"
            type="date"
            value={state.startsAt}
            onChange={(e) => setState((s) => ({ ...s, startsAt: e.target.value }))}
          />
          <Input
            label="Fim"
            type="date"
            value={state.endsAt}
            onChange={(e) => setState((s) => ({ ...s, endsAt: e.target.value }))}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {mode === 'create' ? 'Criar etapa' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
