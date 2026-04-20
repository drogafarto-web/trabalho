import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle, FileText, Link2, Users, User } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input, Select, Textarea } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import {
  AssignmentInputSchema,
  KIND_DEFAULT_SCORE,
  KIND_LABELS,
  type Assignment,
  type AssignmentKind,
  type AssignmentMode,
  type AssignmentStatus,
} from '@/core/domain/assignment';
import {
  useCreateAssignment,
  useUpdateAssignment,
} from '../lib/use-assignments';
import { useTermsByDiscipline } from '@/features/terms/lib/use-terms';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  disciplineId: string;
  assignment: Assignment | null;
  onClose: () => void;
}

interface FormState {
  termId: string;
  kind: AssignmentKind;
  title: string;
  description: string;
  maxScore: number;
  mode: AssignmentMode;
  maxGroupSize: number;
  acceptFile: boolean;
  acceptUrl: boolean;
  dueAt: string;
  status: AssignmentStatus;
}

function initial(a: Assignment | null): FormState {
  if (!a) {
    return {
      termId: '',
      kind: 'trabalho',
      title: '',
      description: '',
      maxScore: KIND_DEFAULT_SCORE.trabalho,
      mode: 'group',
      maxGroupSize: 5,
      acceptFile: true,
      acceptUrl: true,
      dueAt: '',
      status: 'open',
    };
  }
  return {
    termId: a.termId,
    kind: a.kind,
    title: a.title,
    description: a.description ?? '',
    maxScore: a.maxScore,
    mode: a.mode,
    maxGroupSize: a.maxGroupSize,
    acceptFile: a.accepts.file,
    acceptUrl: a.accepts.url,
    dueAt: a.dueAt ? toDateInput(a.dueAt) : '',
    status: a.status,
  };
}

function toDateInput(ts: Timestamp): string {
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromDateInput(v: string): Timestamp | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Timestamp.fromDate(new Date(y, m - 1, d, 23, 59, 59));
}

export function AssignmentDrawer({
  open,
  mode,
  disciplineId,
  assignment,
  onClose,
}: Props) {
  const [state, setState] = useState<FormState>(() => initial(assignment));
  const [error, setError] = useState<string | null>(null);
  const { data: terms } = useTermsByDiscipline(disciplineId);

  const createMut = useCreateAssignment();
  const updateMut = useUpdateAssignment(disciplineId);
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      setState(initial(assignment));
      setError(null);
    }
  }, [open, assignment]);

  // Quando troca o kind, atualiza o maxScore default — só se ainda for o default
  // de algum kind (não sobrescreve valor digitado pelo professor).
  const handleKindChange = (kind: AssignmentKind) => {
    const isDefault = Object.values(KIND_DEFAULT_SCORE).includes(state.maxScore);
    setState((s) => ({
      ...s,
      kind,
      ...(isDefault ? { maxScore: KIND_DEFAULT_SCORE[kind] } : {}),
    }));
  };

  const activeTerms = (terms ?? []).filter((t) => t.status === 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = AssignmentInputSchema.safeParse({
      disciplineId,
      termId: state.termId,
      kind: state.kind,
      title: state.title,
      description: state.description.trim() || null,
      maxScore: state.maxScore,
      mode: state.mode,
      maxGroupSize: state.mode === 'group' ? state.maxGroupSize : undefined,
      accepts: { file: state.acceptFile, url: state.acceptUrl },
      dueAt: fromDateInput(state.dueAt),
      status: state.status,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }

    try {
      if (mode === 'create') {
        await createMut.mutateAsync(parsed.data);
      } else if (assignment) {
        await updateMut.mutateAsync({ id: assignment.id, patch: parsed.data });
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
      title={mode === 'create' ? 'Nova atividade' : 'Editar atividade'}
      width={560}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 p-6">
        {/* Tipo: trabalho / aeco */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-secondary">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['trabalho', 'aeco'] as AssignmentKind[]).map((k) => (
              <KindButton
                key={k}
                kind={k}
                active={state.kind === k}
                onClick={() => handleKindChange(k)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label="Título"
              value={state.title}
              onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
              placeholder='ex: "Muito Além do Peso"'
              maxLength={120}
              required
            />
          </div>
          <Input
            label="Vale"
            type="number"
            step="0.5"
            min={0.5}
            max={100}
            value={state.maxScore}
            onChange={(e) =>
              setState((s) => ({ ...s, maxScore: Number(e.target.value) }))
            }
            hint="Nota máxima"
          />
        </div>

        <Select
          label="Etapa"
          value={state.termId}
          onChange={(e) => setState((s) => ({ ...s, termId: e.target.value }))}
          options={[
            { value: '', label: '— selecione —' },
            ...activeTerms.map((t) => ({ value: t.id, label: t.label })),
          ]}
          hint={
            activeTerms.length === 0
              ? 'Esta disciplina não tem etapas. Crie uma na aba "Etapas" primeiro.'
              : undefined
          }
        />

        <Textarea
          label="Descrição"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          rows={3}
          placeholder="Instruções, contexto, critérios específicos…"
          maxLength={2000}
        />

        {/* Modo: individual / grupo */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-secondary">
            Modo de entrega
          </label>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={state.mode === 'individual'}
              icon={<User className="h-3.5 w-3.5" />}
              label="Individual"
              onClick={() => setState((s) => ({ ...s, mode: 'individual' }))}
            />
            <ModeButton
              active={state.mode === 'group'}
              icon={<Users className="h-3.5 w-3.5" />}
              label="Em grupo"
              onClick={() => setState((s) => ({ ...s, mode: 'group' }))}
            />
          </div>
          {state.mode === 'group' && (
            <div className="mt-3">
              <Input
                label="Tamanho máximo do grupo"
                type="number"
                min={2}
                max={10}
                value={state.maxGroupSize}
                onChange={(e) =>
                  setState((s) => ({ ...s, maxGroupSize: Number(e.target.value) }))
                }
                hint="Quem manda primeiro marca os outros membros — eles ficam impedidos de duplicar."
              />
            </div>
          )}
        </div>

        {/* Formatos aceitos */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-secondary">
            O aluno pode enviar
          </label>
          <div className="space-y-2">
            <ChipToggle
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Arquivo (PDF, imagem, .doc/.docx)"
              checked={state.acceptFile}
              onChange={(v) => setState((s) => ({ ...s, acceptFile: v }))}
            />
            <ChipToggle
              icon={<Link2 className="h-3.5 w-3.5" />}
              label="Link (vídeo do YouTube, Drive, etc)"
              checked={state.acceptUrl}
              onChange={(v) => setState((s) => ({ ...s, acceptUrl: v }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prazo (opcional)"
            type="date"
            value={state.dueAt}
            onChange={(e) => setState((s) => ({ ...s, dueAt: e.target.value }))}
          />
          <Select
            label="Status"
            value={state.status}
            onChange={(e) =>
              setState((s) => ({ ...s, status: e.target.value as AssignmentStatus }))
            }
            options={[
              { value: 'draft', label: 'Rascunho' },
              { value: 'open', label: 'Aberta' },
              { value: 'closed', label: 'Encerrada' },
            ]}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {mode === 'create' ? 'Criar atividade' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function KindButton({
  kind,
  active,
  onClick,
}: {
  kind: AssignmentKind;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary/10 text-text'
          : 'border-border bg-bg text-text-secondary hover:border-border-strong hover:text-text',
      )}
    >
      <span className="font-display text-sm font-semibold">{KIND_LABELS[kind]}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
        default {KIND_DEFAULT_SCORE[kind]} pts
      </span>
    </button>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary/10 text-text'
          : 'border-border bg-bg text-text-secondary hover:border-border-strong hover:text-text',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ChipToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left text-xs transition-colors',
        checked
          ? 'border-primary/60 bg-primary/5 text-text'
          : 'border-border bg-bg text-text-muted hover:border-border-strong hover:text-text',
      )}
    >
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-sm border',
          checked ? 'border-primary bg-primary text-white' : 'border-border bg-bg',
        )}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );
}
