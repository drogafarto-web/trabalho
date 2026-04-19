import { Trash2, Plus, GripVertical } from 'lucide-react';
import { Input, Textarea } from '@/shared/ui/Input';
import { cn } from '@/lib/cn';
import type { Criterion } from '@/core/domain/discipline';

interface Props {
  criteria: Criterion[];
  onChange: (next: Criterion[]) => void;
  errors?: Record<number, { name?: string; description?: string; weight?: string }> | undefined;
}

export function RubricEditor({ criteria, onChange, errors }: Props) {
  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  const sumValid = sum === 10;

  const update = (idx: number, patch: Partial<Criterion>) => {
    onChange(criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const add = () => {
    if (criteria.length >= 10) return;
    onChange([
      ...criteria,
      {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        weight: 0,
        order: criteria.length,
      },
    ]);
  };

  const remove = (idx: number) => {
    if (criteria.length <= 2) return; // mínimo 2
    onChange(criteria.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })));
  };

  return (
    <div className="space-y-4">
      {/* Soma dos pesos */}
      <div
        className={cn(
          'flex items-center justify-between rounded-sm border px-4 py-2.5',
          sumValid
            ? 'border-success/30 bg-success/5 text-success'
            : 'border-warning/30 bg-warning/5 text-warning',
        )}
      >
        <span className="text-xs font-medium">Soma dos pesos</span>
        <span className="font-mono text-sm tabular-nums">
          {sum.toFixed(0)} / 10 {sumValid ? '✓' : ''}
        </span>
      </div>

      {/* Lista de critérios */}
      <div className="space-y-3">
        {criteria.map((c, idx) => (
          <CriterionRow
            key={c.id}
            criterion={c}
            canRemove={criteria.length > 2}
            errors={errors?.[idx]}
            onUpdate={(patch) => update(idx, patch)}
            onRemove={() => remove(idx)}
          />
        ))}
      </div>

      {/* Add button */}
      {criteria.length < 10 && (
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar critério
        </button>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  canRemove,
  errors,
  onUpdate,
  onRemove,
}: {
  criterion: Criterion;
  canRemove: boolean;
  errors?: { name?: string; description?: string; weight?: string } | undefined;
  onUpdate: (patch: Partial<Criterion>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-bg p-4">
      <div className="flex gap-3">
        <div className="pt-6 text-text-muted">
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="grid flex-1 grid-cols-[1fr_100px] gap-3">
          <Input
            label="Nome (slug)"
            value={criterion.name}
            onChange={(e) => onUpdate({ name: e.target.value.toLowerCase() })}
            placeholder="ex: conteudo_tecnico"
            error={errors?.name}
          />
          <Input
            label="Peso"
            type="number"
            min={0}
            max={10}
            step={1}
            value={criterion.weight}
            onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
            error={errors?.weight}
          />
          <div className="col-span-2">
            <Textarea
              label="Descrição"
              rows={2}
              value={criterion.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="O que a IA deve avaliar neste critério"
              error={errors?.description}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="mt-6 inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Remover critério"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
