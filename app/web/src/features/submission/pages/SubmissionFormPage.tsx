import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Link as LinkIcon, Paperclip, Trash2, Users } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Stepper } from '../components/Stepper';
import { Dropzone } from '../components/Dropzone';
import { NameCombobox } from '../components/NameCombobox';
import { SuccessScreen } from '../components/SuccessScreen';
import {
  usePublicDisciplines,
  usePublicDiscipline,
  usePublicStudentsByDiscipline,
  usePublicOpenAssignments,
  usePublicTermsByDiscipline,
} from '../lib/use-public-data';
import { useAnonymousSession } from '../lib/use-anonymous-session';
import { submitAssignment } from '../lib/submission-repo';
import {
  SubmitterSchema,
  detectUrlKind,
  type SubmissionStudentRef,
} from '@/core/domain/submission';
import {
  KIND_LABELS,
  type Assignment,
  type AssignmentKind,
} from '@/core/domain/assignment';
import type { Term } from '@/core/domain/term';
import { defaultTermLabel } from '@/core/domain/term';
import { cn } from '@/lib/cn';

type Step = 0 | 1 | 2;
type DeliveryMode = 'file' | 'url';

interface FormState {
  disciplineId: string;
  assignmentId: string;
  students: SubmissionStudentRef[];
  whatsapp: string;
  email: string;
  deliveryMode: DeliveryMode;
  file: File | null;
  url: string;
}

const STEPS = [
  { id: 's1', label: 'Identificação' },
  { id: 's2', label: 'Entrega' },
  { id: 's3', label: 'Confirmar' },
];

const INITIAL_STATE: FormState = {
  disciplineId: '',
  assignmentId: '',
  students: [],
  whatsapp: '',
  email: '',
  deliveryMode: 'file',
  file: null,
  url: '',
};

export function SubmissionFormPage() {
  const session = useAnonymousSession();
  const { data: disciplines, isLoading: loadingDisciplines } = usePublicDisciplines();

  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    shortId: string;
    disciplineName: string;
  } | null>(null);

  const { data: discipline } = usePublicDiscipline(state.disciplineId || null);
  const { data: disciplineStudents } = usePublicStudentsByDiscipline(
    state.disciplineId || null,
  );
  const { data: openAssignments, isLoading: loadingAssignments } =
    usePublicOpenAssignments(state.disciplineId || null);
  const { data: terms } = usePublicTermsByDiscipline(state.disciplineId || null);

  const selectedAssignment = useMemo(
    () =>
      openAssignments?.find((a) => a.id === state.assignmentId) ?? null,
    [openAssignments, state.assignmentId],
  );

  const maxStudentsAllowed = selectedAssignment
    ? selectedAssignment.mode === 'individual'
      ? 1
      : Math.min(3, selectedAssignment.maxGroupSize)
    : 0;

  // Se a atividade muda pra individual/grupo menor que o grupo atual, trunca
  useEffect(() => {
    if (!selectedAssignment) return;
    setState((s) =>
      s.students.length > maxStudentsAllowed
        ? { ...s, students: s.students.slice(0, maxStudentsAllowed) }
        : s,
    );
  }, [selectedAssignment, maxStudentsAllowed]);

  const availableStudentOptions = useMemo(() => {
    if (!disciplineStudents) return [];
    const selectedIds = new Set(state.students.map((s) => s.id));
    return disciplineStudents
      .filter((ds) => !selectedIds.has(ds.studentId))
      .map((ds) => ({ id: ds.studentId, name: ds.studentName }));
  }, [disciplineStudents, state.students]);

  if (successData) {
    return (
      <SuccessScreen
        shortId={successData.shortId}
        disciplineName={successData.disciplineName}
        onNewSubmission={() => {
          setSuccessData(null);
          setState(INITIAL_STATE);
          setStep(0);
          setUploadState('idle');
          setUploadProgress(0);
          setSubmitError(null);
        }}
      />
    );
  }

  const whatsappValid = state.whatsapp
    ? SubmitterSchema.shape.whatsapp.safeParse(state.whatsapp).success
    : null;
  const emailValid = state.email
    ? SubmitterSchema.shape.email.safeParse(state.email).success
    : null;

  const step1Missing: string[] = [];
  if (!state.disciplineId) step1Missing.push('disciplina');
  if (!state.assignmentId) step1Missing.push('atividade');
  if (state.students.length === 0) step1Missing.push('nome do aluno');
  if (!state.whatsapp) step1Missing.push('WhatsApp');
  else if (whatsappValid === false) step1Missing.push('WhatsApp válido');
  if (!state.email) step1Missing.push('e-mail');
  else if (emailValid === false) step1Missing.push('e-mail válido');

  const step1Valid = step1Missing.length === 0;

  // Decide o que a atividade aceita + modo efetivo
  const acceptsFile = selectedAssignment?.accepts.file ?? true;
  const acceptsUrl = selectedAssignment?.accepts.url ?? false;
  // Se a atividade só aceita um, força esse modo
  const effectiveMode: DeliveryMode = !acceptsFile
    ? 'url'
    : !acceptsUrl
      ? 'file'
      : state.deliveryMode;

  const detectedUrlKind = state.url.trim() ? detectUrlKind(state.url) : null;
  const urlValid = detectedUrlKind !== null;

  const step2Valid =
    effectiveMode === 'file' ? !!state.file : urlValid;

  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  const addStudent = (opt: { id: string; name: string }) => {
    if (state.students.length >= maxStudentsAllowed) return;
    setState((s) => ({
      ...s,
      students: [...s.students, { id: opt.id, name: opt.name }],
    }));
  };

  const removeStudent = (id: string) => {
    setState((s) => ({ ...s, students: s.students.filter((x) => x.id !== id) }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!discipline || !selectedAssignment) return;

    const payload =
      effectiveMode === 'file' && state.file
        ? ({ kind: 'file', file: state.file } as const)
        : effectiveMode === 'url' && detectedUrlKind
          ? ({
              kind: 'url',
              submittedUrl: { url: state.url.trim(), kind: detectedUrlKind },
            } as const)
          : null;

    if (!payload) return;

    setUploadState('uploading');
    try {
      const result = await submitAssignment({
        input: {
          disciplineId: state.disciplineId,
          assignmentId: state.assignmentId,
          students: state.students,
          submitter: { whatsapp: state.whatsapp, email: state.email },
        },
        disciplineOwnerUid: discipline.ownerUid,
        rubricVersion: discipline.rubric.version,
        payload,
        onProgress: (p) => setUploadProgress(p.percent),
      });
      setUploadState('success');
      setSuccessData({ shortId: result.shortId, disciplineName: discipline.name });
    } catch (err) {
      console.error('[submit] erro:', err);
      setUploadState('error');
      setSubmitError(
        err instanceof Error ? err.message : 'Falha ao enviar. Tente novamente.',
      );
    }
  };

  if (session.error) {
    return <SessionError message={session.error} />;
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-text font-display text-sm font-bold text-bg">
            c
          </div>
          <span className="font-display font-semibold tracking-tight">
            Entrega de Trabalho
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-8">
        <Stepper steps={STEPS} current={step} className="mb-8" />

        {/* -----  PASSO 1: Identificação ----- */}
        {step === 0 && (
          <section className="space-y-4">
            <Select
              label="Disciplina"
              name="discipline"
              value={state.disciplineId}
              onChange={(e) =>
                setState(() => ({
                  ...INITIAL_STATE,
                  disciplineId: e.target.value,
                }))
              }
              options={
                disciplines?.map((d) => ({
                  value: d.id,
                  label: `${d.name} · ${d.semester}`,
                })) ?? []
              }
              placeholder={loadingDisciplines ? 'Carregando…' : 'Selecione'}
            />

            {state.disciplineId && (
              <AssignmentPicker
                assignments={openAssignments ?? []}
                terms={terms ?? []}
                loading={loadingAssignments}
                selectedId={state.assignmentId}
                onSelect={(id) =>
                  setState((s) => ({ ...s, assignmentId: id, students: [] }))
                }
              />
            )}

            {state.disciplineId && selectedAssignment && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    {selectedAssignment.mode === 'individual'
                      ? 'Aluno'
                      : 'Integrantes do grupo'}{' '}
                    <span className="font-mono normal-case text-text-muted">
                      {selectedAssignment.mode === 'individual'
                        ? '(individual)'
                        : `(1-${maxStudentsAllowed})`}
                    </span>
                  </label>

                  {state.students.length > 0 && (
                    <ul className="mb-2 space-y-1.5">
                      {state.students.map((s, i) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between rounded-sm border border-border bg-bg-surface px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-[10px] text-text-muted tabular-nums">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {s.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStudent(s.id)}
                            className="text-text-muted hover:text-danger"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {state.students.length < maxStudentsAllowed && (
                    <NameCombobox
                      placeholder={
                        state.students.length === 0
                          ? 'Digite seu nome'
                          : 'Adicionar colega (opcional)'
                      }
                      options={availableStudentOptions}
                      value={null}
                      onChange={(opt) => opt && addStudent(opt)}
                      emptyMessage={
                        disciplineStudents && disciplineStudents.length === 0
                          ? 'Nenhum aluno cadastrado nesta disciplina'
                          : 'Nenhum resultado'
                      }
                    />
                  )}

                  {state.students.length === maxStudentsAllowed &&
                    maxStudentsAllowed > 1 && (
                      <p className="text-[10px] text-text-muted">
                        Grupo completo ({maxStudentsAllowed} alunos).
                      </p>
                    )}
                </div>

                <Input
                  label="WhatsApp"
                  name="whatsapp"
                  type="tel"
                  placeholder="31999999999"
                  value={state.whatsapp}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      whatsapp: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  hint={
                    whatsappValid !== false
                      ? 'Apenas números, com DDD (10 ou 11 dígitos)'
                      : undefined
                  }
                  error={
                    whatsappValid === false
                      ? 'DDD + número (10 ou 11 dígitos)'
                      : undefined
                  }
                />

                <Input
                  label="E-mail institucional"
                  name="email"
                  type="email"
                  placeholder="aluno@instituicao.edu.br"
                  value={state.email}
                  onChange={(e) =>
                    setState((s) => ({ ...s, email: e.target.value.trim() }))
                  }
                  error={emailValid === false ? 'E-mail inválido' : undefined}
                />
              </>
            )}
          </section>
        )}

        {/* -----  PASSO 2: Entrega (arquivo ou URL) ----- */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Envie seu trabalho
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {effectiveMode === 'file'
                  ? 'Um único arquivo por entrega. Se tiver várias páginas em foto, junte em um PDF.'
                  : 'Cole o link do YouTube com o vídeo da entrega.'}
              </p>
            </div>

            {acceptsFile && acceptsUrl && (
              <DeliveryModeToggle
                mode={effectiveMode}
                onChange={(m) =>
                  setState((s) => ({
                    ...s,
                    deliveryMode: m,
                    file: m === 'url' ? null : s.file,
                    url: m === 'file' ? '' : s.url,
                  }))
                }
              />
            )}

            {effectiveMode === 'file' ? (
              <Dropzone
                file={state.file}
                onChange={(f) => setState((s) => ({ ...s, file: f }))}
                state="idle"
              />
            ) : (
              <UrlInput
                value={state.url}
                onChange={(v) => setState((s) => ({ ...s, url: v }))}
                detectedKind={detectedUrlKind}
              />
            )}
          </section>
        )}

        {/* -----  PASSO 3: Confirmar ----- */}
        {step === 2 && (
          <section className="space-y-4">
            <ReviewCard
              label="Disciplina"
              value={discipline ? `${discipline.name} · ${discipline.semester}` : ''}
            />
            <ReviewCard
              label="Atividade"
              value={
                selectedAssignment
                  ? `${KIND_LABELS[selectedAssignment.kind]} — ${selectedAssignment.title}`
                  : ''
              }
            />
            <ReviewCard
              label={`Integrante${state.students.length > 1 ? 's' : ''}`}
              value={state.students.map((s) => s.name).join(', ')}
            />
            <ReviewCard label="WhatsApp" value={state.whatsapp} mono />
            <ReviewCard label="E-mail" value={state.email} />
            {effectiveMode === 'file' && state.file && (
              <ReviewCard
                label="Arquivo"
                value={`${state.file.name} · ${(state.file.size / (1024 * 1024)).toFixed(2)} MB`}
              />
            )}
            {effectiveMode === 'url' && state.url && (
              <ReviewCard
                label="Link"
                value={state.url.trim()}
                mono
              />
            )}

            {uploadState !== 'idle' && state.file && effectiveMode === 'file' && (
              <Dropzone
                file={state.file}
                onChange={() => undefined}
                progress={uploadProgress}
                state={uploadState}
                error={submitError}
              />
            )}
            {uploadState === 'error' && submitError && effectiveMode === 'url' && (
              <p className="rounded-sm border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                {submitError}
              </p>
            )}
          </section>
        )}

        {/* ----- Ações ----- */}
        <footer className="mt-8">
          {step === 0 && !step1Valid && step1Missing.length > 0 && (
            <p className="mb-3 text-center text-[11px] text-text-muted">
              Falta preencher: {step1Missing.join(', ')}
            </p>
          )}
          {step === 1 && !step2Valid && (
            <p className="mb-3 text-center text-[11px] text-text-muted">
              Envie um arquivo para continuar
            </p>
          )}

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={uploadState === 'uploading'}
              >
                Voltar
              </Button>
            ) : (
              <span />
            )}

            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canAdvance}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={() => void handleSubmit()}
                loading={uploadState === 'uploading'}
                disabled={!step2Valid || !session.ready}
              >
                Enviar trabalho
              </Button>
            )}
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] text-text-muted">
          Sou professor,{' '}
          <a href="/login" className="text-primary hover:text-primary-hover">
            entrar
          </a>
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// AssignmentPicker — lista radio-like agrupada por etapa
// ---------------------------------------------------------------------------
interface AssignmentPickerProps {
  assignments: Assignment[];
  terms: Term[];
  loading: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}

function AssignmentPicker({
  assignments,
  terms,
  loading,
  selectedId,
  onSelect,
}: AssignmentPickerProps) {
  // Agrupa por termId. Etapas sem atividade aberta não aparecem.
  // Atividades cujo termId não casa com nenhum term (dado inconsistente) caem
  // no bucket "sem-etapa".
  const groups = useMemo(() => {
    const byTerm = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const list = byTerm.get(a.termId);
      if (list) list.push(a);
      else byTerm.set(a.termId, [a]);
    }
    const termsSorted = [...terms].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.number - b.number;
    });
    const out: { term: Term | null; assignments: Assignment[] }[] = [];
    for (const t of termsSorted) {
      const list = byTerm.get(t.id);
      if (list && list.length > 0) out.push({ term: t, assignments: list });
    }
    const orphans: Assignment[] = [];
    for (const a of assignments) {
      if (!terms.some((t) => t.id === a.termId)) orphans.push(a);
    }
    if (orphans.length > 0) out.push({ term: null, assignments: orphans });
    return out;
  }, [assignments, terms]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
        Atividade
      </label>

      {loading && (
        <div className="rounded-sm border border-border bg-bg-surface px-3 py-4 text-center text-xs text-text-muted">
          Carregando atividades…
        </div>
      )}

      {!loading && assignments.length === 0 && (
        <div className="rounded-sm border border-dashed border-border bg-bg-surface/50 px-3 py-4 text-center text-xs text-text-muted">
          Nenhuma atividade aberta nesta disciplina.
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.term?.id ?? 'orphan'}>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                {g.term
                  ? g.term.label || defaultTermLabel(g.term.number, g.term.year)
                  : 'Sem etapa'}
              </p>
              <ul className="space-y-1">
                {g.assignments.map((a) => (
                  <li key={a.id}>
                    <AssignmentOption
                      assignment={a}
                      selected={a.id === selectedId}
                      onSelect={() => onSelect(a.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentOption({
  assignment,
  selected,
  onSelect,
}: {
  assignment: Assignment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-bg-surface hover:border-border-hi',
      )}
      aria-pressed={selected ? 'true' : 'false'}
    >
      <span
        className={cn(
          'mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary' : 'border-border',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <KindBadge kind={assignment.kind} />
          <span className="truncate text-sm text-text">{assignment.title}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-text-muted">
          <span className="tabular-nums">{assignment.maxScore.toFixed(1)} pts</span>
          <span className="text-text-muted/60">·</span>
          <span className="inline-flex items-center gap-1">
            {assignment.mode === 'group' ? (
              <>
                <Users className="h-3 w-3" />
                até {assignment.maxGroupSize}
              </>
            ) : (
              'individual'
            )}
          </span>
        </span>
      </span>
    </button>
  );
}

function KindBadge({ kind }: { kind: AssignmentKind }) {
  return (
    <span
      className={cn(
        'rounded-pill border px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider',
        kind === 'trabalho'
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-border bg-bg text-text-muted',
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

function ReviewCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className={cn('mt-1 text-sm text-text', mono && 'font-mono')}>
        {value || '—'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle Arquivo/URL — quando a atividade aceita os dois
// ---------------------------------------------------------------------------
function DeliveryModeToggle({
  mode,
  onChange,
}: {
  mode: DeliveryMode;
  onChange: (m: DeliveryMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Formato de entrega"
      className="grid grid-cols-2 gap-0 rounded-sm border border-border bg-bg-surface p-0.5"
    >
      <ModeButton
        active={mode === 'file'}
        onClick={() => onChange('file')}
        icon={<Paperclip className="h-3.5 w-3.5" />}
        label="Arquivo"
      />
      <ModeButton
        active={mode === 'url'}
        onClick={() => onChange('url')}
        icon={<LinkIcon className="h-3.5 w-3.5" />}
        label="Link"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active ? 'true' : 'false'}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-bg text-text shadow-sm'
          : 'text-text-muted hover:text-text',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// UrlInput — valida YouTube em tempo real
// ---------------------------------------------------------------------------
function UrlInput({
  value,
  onChange,
  detectedKind,
}: {
  value: string;
  onChange: (v: string) => void;
  detectedKind: string | null;
}) {
  const hasValue = value.trim().length > 0;
  const error = hasValue && !detectedKind;
  return (
    <div className="space-y-2">
      <Input
        name="url"
        type="url"
        placeholder="https://youtube.com/watch?v=..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={
          error ? 'Por enquanto só aceitamos links do YouTube.' : undefined
        }
      />
      {detectedKind && (
        <p className="flex items-center gap-1.5 text-[11px] text-success">
          <span className="inline-flex h-1.5 w-1.5 rounded-pill bg-success" />
          Link do YouTube reconhecido
        </p>
      )}
    </div>
  );
}

function SessionError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="max-w-sm rounded-lg border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-sm text-danger">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-xs text-text-muted hover:text-text"
        >
          Recarregar
        </button>
      </div>
    </main>
  );
}
