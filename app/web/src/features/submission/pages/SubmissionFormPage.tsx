import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
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
} from '../lib/use-public-data';
import { useAnonymousSession } from '../lib/use-anonymous-session';
import { submitAssignment } from '../lib/submission-repo';
import {
  SubmitterSchema,
  type SubmissionStudentRef,
} from '@/core/domain/submission';
import { cn } from '@/lib/cn';

type Step = 0 | 1 | 2;

interface FormState {
  disciplineId: string;
  students: SubmissionStudentRef[];
  whatsapp: string;
  email: string;
  file: File | null;
}

const STEPS = [
  { id: 's1', label: 'Identificação' },
  { id: 's2', label: 'Arquivo' },
  { id: 's3', label: 'Confirmar' },
];

export function SubmissionFormPage() {
  const session = useAnonymousSession();
  const { data: disciplines, isLoading: loadingDisciplines } = usePublicDisciplines();

  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<FormState>({
    disciplineId: '',
    students: [],
    whatsapp: '',
    email: '',
    file: null,
  });
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

  // Opções do combobox — alunos da disciplina selecionada que AINDA não estão no grupo
  const availableStudentOptions = useMemo(() => {
    if (!disciplineStudents) return [];
    const selectedIds = new Set(state.students.map((s) => s.id));
    return disciplineStudents
      .filter((ds) => !selectedIds.has(ds.studentId))
      .map((ds) => ({ id: ds.studentId, name: ds.studentName }));
  }, [disciplineStudents, state.students]);

  // Tela de sucesso tem prioridade
  if (successData) {
    return (
      <SuccessScreen
        shortId={successData.shortId}
        disciplineName={successData.disciplineName}
        onNewSubmission={() => {
          setSuccessData(null);
          setState({
            disciplineId: '',
            students: [],
            whatsapp: '',
            email: '',
            file: null,
          });
          setStep(0);
          setUploadState('idle');
          setUploadProgress(0);
          setSubmitError(null);
        }}
      />
    );
  }

  // Validação por campo — usada para feedback visual inline
  const whatsappValid = state.whatsapp
    ? SubmitterSchema.shape.whatsapp.safeParse(state.whatsapp).success
    : null;
  const emailValid = state.email
    ? SubmitterSchema.shape.email.safeParse(state.email).success
    : null;

  const step1Missing: string[] = [];
  if (!state.disciplineId) step1Missing.push('disciplina');
  if (state.students.length === 0) step1Missing.push('nome do aluno');
  if (!state.whatsapp) step1Missing.push('WhatsApp');
  else if (whatsappValid === false) step1Missing.push('WhatsApp válido');
  if (!state.email) step1Missing.push('e-mail');
  else if (emailValid === false) step1Missing.push('e-mail válido');

  const step1Valid = step1Missing.length === 0;
  const step2Valid = !!state.file;

  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  const addStudent = (opt: { id: string; name: string }) => {
    if (state.students.length >= 3) return;
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
    if (!state.file || !discipline) return;

    setUploadState('uploading');
    try {
      const result = await submitAssignment({
        input: {
          disciplineId: state.disciplineId,
          students: state.students,
          submitter: { whatsapp: state.whatsapp, email: state.email },
        },
        disciplineOwnerUid: discipline.ownerUid,
        rubricVersion: discipline.rubric.version,
        file: state.file,
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
      {/* Header minimalista */}
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
              onChange={(e) => setState((s) => ({ ...s, disciplineId: e.target.value, students: [] }))}
              options={
                disciplines?.map((d) => ({
                  value: d.id,
                  label: `${d.name} · ${d.semester}`,
                })) ?? []
              }
              placeholder={loadingDisciplines ? 'Carregando…' : 'Selecione'}
            />

            {state.disciplineId && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Integrantes do grupo <span className="font-mono normal-case text-text-muted">(1-3)</span>
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

                  {state.students.length < 3 && (
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

                  {state.students.length === 3 && (
                    <p className="text-[10px] text-text-muted">
                      Máximo de 3 alunos por grupo atingido.
                    </p>
                  )}
                </div>

                <Input
                  label="WhatsApp"
                  name="whatsapp"
                  type="tel"
                  placeholder="31999999999"
                  value={state.whatsapp}
                  onChange={(e) => setState((s) => ({ ...s, whatsapp: e.target.value.replace(/\D/g, '') }))}
                  hint={whatsappValid !== false ? 'Apenas números, com DDD (10 ou 11 dígitos)' : undefined}
                  error={whatsappValid === false ? 'DDD + número (10 ou 11 dígitos)' : undefined}
                />

                <Input
                  label="E-mail institucional"
                  name="email"
                  type="email"
                  placeholder="aluno@instituicao.edu.br"
                  value={state.email}
                  onChange={(e) => setState((s) => ({ ...s, email: e.target.value.trim() }))}
                  error={emailValid === false ? 'E-mail inválido' : undefined}
                />
              </>
            )}
          </section>
        )}

        {/* -----  PASSO 2: Arquivo ----- */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Envie seu trabalho
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Um único arquivo por entrega. Se tiver várias páginas em foto, junte em um PDF.
              </p>
            </div>

            <Dropzone
              file={state.file}
              onChange={(f) => setState((s) => ({ ...s, file: f }))}
              state="idle"
            />
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
              label={`Integrante${state.students.length > 1 ? 's' : ''}`}
              value={state.students.map((s) => s.name).join(', ')}
            />
            <ReviewCard label="WhatsApp" value={state.whatsapp} mono />
            <ReviewCard label="E-mail" value={state.email} />
            {state.file && (
              <ReviewCard
                label="Arquivo"
                value={`${state.file.name} · ${(state.file.size / (1024 * 1024)).toFixed(2)} MB`}
              />
            )}

            {uploadState !== 'idle' && state.file && (
              <Dropzone
                file={state.file}
                onChange={() => undefined}
                progress={uploadProgress}
                state={uploadState}
                error={submitError}
              />
            )}
          </section>
        )}

        {/* ----- Ações ----- */}
        <footer className="mt-8">
          {/* Hint do que falta para avançar */}
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
                disabled={!state.file || !session.ready}
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
