import { Trash2, Plus, GripVertical } from 'lucide-react';
import { Textarea } from '@/shared/ui/Input';
import type { Question } from '@/core/domain/discipline';

interface Props {
  questions: Question[];
  onChange: (next: Question[]) => void;
  errors?: Record<number, { text?: string }>;
}

export function QuestionsEditor({ questions, onChange, errors }: Props) {
  const update = (idx: number, text: string) => {
    onChange(questions.map((q, i) => (i === idx ? { ...q, text } : q)));
  };

  const add = () => {
    if (questions.length >= 10) return;
    onChange([
      ...questions,
      {
        id: crypto.randomUUID(),
        text: '',
        order: questions.length,
      },
    ]);
  };

  const remove = (idx: number) => {
    if (questions.length <= 1) return;
    onChange(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Perguntas que a IA deve responder a partir do texto do aluno. Mínimo 1, máximo 10.
      </p>

      {questions.map((q, idx) => (
        <div key={q.id} className="flex gap-3 rounded-sm border border-border bg-bg p-3">
          <div className="flex flex-col items-center pt-2 text-text-muted">
            <span className="font-mono text-xs">{idx + 1}</span>
            <GripVertical className="mt-1 h-3.5 w-3.5" aria-hidden="true" />
          </div>

          <div className="flex-1">
            <Textarea
              rows={2}
              value={q.text}
              onChange={(e) => update(idx, e.target.value)}
              placeholder="Ex: Qual o provável parasito envolvido?"
              error={errors?.[idx]?.text}
            />
          </div>

          <button
            type="button"
            onClick={() => remove(idx)}
            disabled={questions.length <= 1}
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Remover pergunta"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {questions.length < 10 && (
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar pergunta
        </button>
      )}
    </div>
  );
}
