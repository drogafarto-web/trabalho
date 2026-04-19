import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input, Select, Textarea } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import {
  COURSES,
  PERIODS,
  DisciplineInputSchema,
  defaultRubric,
  suggestCode,
  type Course,
  type Criterion,
  type Discipline,
  type DisciplineInput,
  type Period,
  type Question,
  type Rubric,
} from '@/core/domain/discipline';
import { RubricEditor } from './RubricEditor';
import { QuestionsEditor } from './QuestionsEditor';
import {
  useCreateDiscipline,
  useUpdateDiscipline,
} from '../lib/use-disciplines';

type Tab = 'info' | 'rubric' | 'questions' | 'custom';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  discipline: Discipline | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  code: string;
  course: Course;
  period: Period;
  semester: string;
  rubric: Rubric;
}

function initialState(d: Discipline | null): FormState {
  if (!d) {
    const currentYear = new Date().getFullYear();
    const semester = new Date().getMonth() < 6 ? `${currentYear}.1` : `${currentYear}.2`;
    return {
      name: '',
      code: '',
      course: 'Farmácia',
      period: '1º',
      semester,
      rubric: defaultRubric(),
    };
  }
  return {
    name: d.name,
    code: d.code,
    course: d.course,
    period: d.period,
    semester: d.semester,
    rubric: d.rubric,
  };
}

export function DisciplineDrawer({ open, mode, discipline, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('info');
  const [state, setState] = useState<FormState>(() => initialState(discipline));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMut = useCreateDiscipline();
  const updateMut = useUpdateDiscipline();
  const saving = createMut.isPending || updateMut.isPending;

  // Reseta estado quando abre com outra disciplina
  useEffect(() => {
    if (open) {
      setState(initialState(discipline));
      setTab('info');
      setSubmitError(null);
    }
  }, [open, discipline]);

  // Auto-sugestão de código quando nome/semestre mudam e usuário ainda não digitou código custom
  const [codeTouched, setCodeTouched] = useState(mode === 'edit');
  useEffect(() => {
    if (!codeTouched && state.name && state.semester) {
      const suggested = suggestCode(state.name, state.semester);
      if (suggested) setState((s) => ({ ...s, code: suggested }));
    }
  }, [state.name, state.semester, codeTouched]);

  // Validação Zod por tab
  const validation = useMemo(() => {
    const result = DisciplineInputSchema.safeParse(state);
    if (result.success) return { ok: true as const };
    return { ok: false as const, issues: result.error.flatten() };
  }, [state]);

  const rubricSumValid =
    state.rubric.criteria.reduce((s, c) => s + c.weight, 0) === 10;

  const handleSubmit = async () => {
    setSubmitError(null);

    const parsed = DisciplineInputSchema.safeParse(state);
    if (!parsed.success) {
      setSubmitError('Há erros no formulário. Verifique as abas destacadas.');
      // Vai para primeira aba com erro
      const errorPaths = parsed.error.issues.map((i) => i.path[0]?.toString() ?? '');
      if (errorPaths.some((p) => ['name', 'code', 'course', 'period', 'semester'].includes(p))) {
        setTab('info');
      } else if (errorPaths.includes('rubric')) {
        setTab('rubric');
      }
      return;
    }

    try {
      if (mode === 'create') {
        await createMut.mutateAsync(parsed.data);
      } else if (discipline) {
        const rubricChanged =
          JSON.stringify(parsed.data.rubric) !== JSON.stringify(discipline.rubric);
        await updateMut.mutateAsync({
          id: discipline.id,
          patch: parsed.data,
          currentRubricVersion: discipline.rubric.version,
          rubricChanged,
        });
      }
      onClose();
    } catch (err) {
      console.error('[disciplines] save error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar.');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nova disciplina' : 'Editar disciplina'}
    >
      {/* Tabs */}
      <div className="sticky top-[56px] z-10 flex gap-1 border-b border-border bg-bg-surface px-6">
        <TabButton active={tab === 'info'} onClick={() => setTab('info')}>
          Info
        </TabButton>
        <TabButton
          active={tab === 'rubric'}
          invalid={!rubricSumValid}
          onClick={() => setTab('rubric')}
        >
          Rubrica
        </TabButton>
        <TabButton active={tab === 'questions'} onClick={() => setTab('questions')}>
          Perguntas
        </TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>
          Regras custom
        </TabButton>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {tab === 'info' && (
          <InfoTab
            state={state}
            onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
            onCodeTouched={() => setCodeTouched(true)}
            errors={validation.ok ? undefined : validation.issues.fieldErrors}
          />
        )}

        {tab === 'rubric' && (
          <RubricEditor
            criteria={state.rubric.criteria}
            onChange={(criteria) =>
              setState((s) => ({ ...s, rubric: { ...s.rubric, criteria } }))
            }
          />
        )}

        {tab === 'questions' && (
          <QuestionsEditor
            questions={state.rubric.questions}
            onChange={(questions: Question[]) =>
              setState((s) => ({ ...s, rubric: { ...s.rubric, questions } }))
            }
          />
        )}

        {tab === 'custom' && (
          <CustomRulesTab
            value={state.rubric.customRules ?? ''}
            onChange={(customRules) =>
              setState((s) => ({
                ...s,
                rubric: { ...s.rubric, customRules: customRules || null },
              }))
            }
          />
        )}
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-border bg-bg-surface px-6 py-4">
        <div>
          {submitError && (
            <p className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {submitError}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving} disabled={!rubricSumValid}>
            {mode === 'create' ? 'Criar disciplina' : 'Salvar alterações'}
          </Button>
        </div>
      </footer>
    </Drawer>
  );
}

function TabButton({
  active,
  invalid,
  onClick,
  children,
}: {
  active: boolean;
  invalid?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative h-10 px-3 text-xs transition-colors',
        active ? 'text-text' : 'text-text-muted hover:text-text-secondary',
      )}
    >
      <span className="flex items-center gap-1.5">
        {children}
        {invalid && <AlertCircle className="h-3 w-3 text-warning" />}
      </span>
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" aria-hidden="true" />
      )}
    </button>
  );
}

function InfoTab({
  state,
  onChange,
  onCodeTouched,
  errors,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onCodeTouched: () => void;
  errors?: Record<string, string[] | undefined>;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Nome da disciplina"
        name="name"
        placeholder="Ex: PARASITOLOGIA CLÍNICA"
        value={state.name}
        onChange={(e) => onChange({ name: e.target.value.toUpperCase() })}
        error={errors?.['name']?.[0]}
        hint="Sempre em maiúsculas (convenção diário escolar)."
        autoFocus
      />

      <Input
        label="Código"
        name="code"
        placeholder="PARA-2026.1"
        value={state.code}
        onChange={(e) => {
          onCodeTouched();
          onChange({ code: e.target.value.toUpperCase() });
        }}
        error={errors?.['code']?.[0]}
        hint="Gerado automaticamente. Formato: 3-5 letras, ano, semestre (.1 ou .2)."
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Curso"
          name="course"
          value={state.course}
          onChange={(e) => onChange({ course: e.target.value as Course })}
          options={COURSES.map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="Período"
          name="period"
          value={state.period}
          onChange={(e) => onChange({ period: e.target.value as Period })}
          options={PERIODS.map((p) => ({ value: p, label: p }))}
        />
      </div>

      <Input
        label="Semestre"
        name="semester"
        placeholder="2026.1"
        value={state.semester}
        onChange={(e) => onChange({ semester: e.target.value })}
        error={errors?.['semester']?.[0]}
      />
    </div>
  );
}

function CustomRulesTab({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const charCount = value.length;
  const atLimit = charCount > 2000;

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Instruções adicionais que serão injetadas no prompt da IA. Use para guiar o estilo de
        correção, lembretes de atenção especial, ou casos específicos da sua turma.
      </p>

      <Textarea
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: Considere apenas respostas baseadas em literatura pós-2015. Desconsidere referências a Wikipedia."
        className="font-mono text-xs"
      />

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-text-muted">
          Preview server-side: suas regras vão entre tags{' '}
          <code className="font-mono text-text-secondary">&lt;regras_professor&gt;</code>.
        </span>
        <span className={cn('font-mono tabular-nums', atLimit ? 'text-danger' : 'text-text-muted')}>
          {charCount} / 2000
        </span>
      </div>
    </div>
  );
}
