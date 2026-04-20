import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Loader2, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppShell } from '@/features/dashboard/components/AppShell';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Input';
import { useLlmConfig, useProviderModels, useUpdateLlmConfig } from '../lib/use-llm-config';
import type { LlmProvider } from '../lib/llm-config-repo';

const PROVIDERS: Array<{ value: LlmProvider; label: string; defaultModel: string }> = [
  { value: 'gemini',    label: 'Google Gemini',  defaultModel: 'gemini-2.5-flash' },
  { value: 'anthropic', label: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-6' },
  { value: 'qwen',      label: 'Alibaba Qwen',    defaultModel: 'qwen-plus' },
];

export function ConfigPage() {
  const { data: config, isLoading, isError } = useLlmConfig();
  const update = useUpdateLlmConfig();

  const [provider, setProvider] = useState<LlmProvider>('gemini');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setModel(config.model ?? '');
      setApiKey(config.apiKey);
    }
  }, [config]);

  const activeProviderMeta = useMemo(
    () => PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]!,
    [provider],
  );

  const models = useProviderModels(provider, apiKey);

  // Quando a lista carrega, se o modelo atual não está nela, escolhe o default
  // (primeiro da lista é o "preferred" pelo sortPreferred do service).
  useEffect(() => {
    if (!models.data || models.data.length === 0) return;
    const ids = models.data.map((m) => m.id);
    if (model && ids.includes(model)) return;
    setModel(models.data[0]!.id);
  }, [models.data, model]);

  const dirty =
    !config ||
    config.provider !== provider ||
    (config.model ?? '') !== model ||
    config.apiKey !== apiKey;

  const canSave =
    apiKey.trim().length >= 20 && dirty && !update.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await update.mutateAsync({
      provider,
      model: model.trim() || null,
      apiKey: apiKey.trim(),
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2400);
  };

  return (
    <AppShell>
      <div className="min-h-full">
        <PageHeader />

        <section className="mx-auto max-w-2xl px-8 pb-16 pt-8">
          {isLoading && <SkeletonCard />}
          {isError && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
              Não foi possível carregar a configuração. Verifique sua conexão.
            </div>
          )}
          {!isLoading && !isError && (
            <div className="space-y-6">
              <CurrentStatus config={config ?? null} />

              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="space-y-5 rounded-lg border border-border bg-bg-surface p-6"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-md font-semibold tracking-tight">
                    Provider de IA
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    runtime
                  </span>
                </div>

                <Select
                  label="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as LlmProvider)}
                  options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                  hint="Define qual API a Cloud Function chama ao corrigir trabalhos."
                />

                <div>
                  <label
                    htmlFor="apiKey"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id="apiKey"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="h-10 w-full rounded-sm border border-border bg-bg pl-3 pr-11 font-mono text-xs placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder={
                        provider === 'gemini'
                          ? 'AIza...'
                          : provider === 'anthropic'
                          ? 'sk-ant-...'
                          : 'sk-...'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-text-muted transition-colors hover:bg-bg-surface-hi hover:text-text"
                      aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                    >
                      {showKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted">
                    A lista de modelos é puxada da própria API ao colar a chave.
                  </p>
                </div>

                <ModelField
                  provider={provider}
                  apiKey={apiKey}
                  model={model}
                  onChange={setModel}
                  models={models}
                  defaultModel={activeProviderMeta.defaultModel}
                />

                <div className="flex items-start gap-2 rounded-sm border border-border/60 bg-bg/40 p-3 text-xs text-text-muted">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <span>
                    A chave fica gravada em Firestore com leitura restrita ao seu
                    usuário pelas regras. Pra ambiente multi-tenant, será migrada
                    pro Secret Manager por tenant.
                  </span>
                </div>

                {update.isError && (
                  <div className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                    Falhou ao salvar: {(update.error as Error)?.message ?? 'erro desconhecido'}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {justSaved && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <Check className="h-3.5 w-3.5" /> salvo
                    </span>
                  )}
                  <Button
                    type="submit"
                    disabled={!canSave}
                    loading={update.isPending}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Salvar configuração
                  </Button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg font-semibold tracking-tight">Configurações</h1>
          <span className="font-mono text-xs text-text-muted">runtime do correcionador</span>
        </div>
      </div>
    </header>
  );
}

function CurrentStatus({ config }: { config: ReturnType<typeof useLlmConfig>['data'] | null }) {
  if (!config) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-surface/60 px-5 py-4 text-sm text-text-secondary">
        <span className="text-text-muted">Estado atual:</span>{' '}
        <span className="text-text">nenhuma configuração salva — usando variáveis de ambiente do deploy.</span>
      </div>
    );
  }

  const meta = PROVIDERS.find((p) => p.value === config.provider);
  const masked = maskKey(config.apiKey);
  const updatedRel = config.updatedAt
    ? formatDistanceToNow(config.updatedAt.toDate(), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-bg-surface px-5 py-4 sm:grid-cols-3">
      <Field label="Provider" value={meta?.label ?? config.provider} />
      <Field label="Modelo" value={config.model ?? meta?.defaultModel ?? '—'} mono />
      <Field label="Chave" value={masked} mono />
      {updatedRel && (
        <p className="col-span-full pt-1 text-[11px] uppercase tracking-wider text-text-muted">
          atualizado {updatedRel}
        </p>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={mono ? 'font-mono text-xs text-text' : 'text-sm text-text'}>{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-16 animate-pulse rounded-lg border border-border bg-bg-surface" />
      <div className="h-[420px] animate-pulse rounded-lg border border-border bg-bg-surface" />
    </div>
  );
}

function ModelField({
  provider,
  apiKey,
  model,
  onChange,
  models,
  defaultModel,
}: {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  onChange: (id: string) => void;
  models: ReturnType<typeof useProviderModels>;
  defaultModel: string;
}) {
  const hasKey = apiKey.trim().length >= 20;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label
          htmlFor="model"
          className="text-xs font-medium uppercase tracking-wider text-text-secondary"
        >
          Modelo
        </label>
        <ModelStatus models={models} hasKey={hasKey} />
      </div>

      {!hasKey && (
        <ReadonlyHint text="Cole a API key acima pra carregar os modelos disponíveis." />
      )}

      {hasKey && models.isFetching && (
        <ReadonlyHint
          icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}
          text={`Consultando API do ${provider}…`}
        />
      )}

      {hasKey && !models.isFetching && models.data && models.data.length > 0 && (
        <select
          id="model"
          value={model}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {models.data.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {hasKey && !models.isFetching && models.failureReason && (
        <FallbackInput
          model={model}
          onChange={onChange}
          defaultModel={defaultModel}
          reason={models.failureReason}
          message={models.failureMessage ?? 'erro desconhecido'}
          onRetry={() => void models.refetch()}
        />
      )}

      {hasKey &&
        !models.isFetching &&
        !models.failureReason &&
        (!models.data || models.data.length === 0) && (
          <FallbackInput
            model={model}
            onChange={onChange}
            defaultModel={defaultModel}
            reason="unknown"
            message="API não retornou modelos"
            onRetry={() => void models.refetch()}
          />
        )}
    </div>
  );
}

function ModelStatus({
  models,
  hasKey,
}: {
  models: ReturnType<typeof useProviderModels>;
  hasKey: boolean;
}) {
  if (!hasKey) return null;
  if (models.isFetching) return null;
  if (models.failureReason) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-warning">
        <AlertCircle className="h-3 w-3" />
        {models.failureReason === 'unauthorized' ? 'chave inválida' : 'fallback manual'}
      </span>
    );
  }
  if (models.data && models.data.length > 0) {
    return (
      <button
        type="button"
        onClick={() => void models.refetch()}
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:text-text"
        title="Recarregar lista"
      >
        <RefreshCw className="h-3 w-3" />
        {models.data.length} disponíveis
      </button>
    );
  }
  return null;
}

function ReadonlyHint({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-sm border border-dashed border-border bg-bg/40 px-3 text-xs text-text-muted">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function FallbackInput({
  model,
  onChange,
  defaultModel,
  message,
  onRetry,
}: {
  model: string;
  onChange: (id: string) => void;
  defaultModel: string;
  reason: 'unauthorized' | 'network' | 'unknown';
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-2">
      <input
        id="model"
        type="text"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultModel}
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-sm border border-border bg-bg px-3 font-mono text-xs placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-text-muted">
          {message}. Vazio = default ({defaultModel}).
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:text-text"
        >
          <RefreshCw className="h-3 w-3" />
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

function maskKey(k: string): string {
  if (!k) return '—';
  if (k.length <= 8) return '•'.repeat(k.length);
  return `${k.slice(0, 4)}${'•'.repeat(Math.min(k.length - 8, 16))}${k.slice(-4)}`;
}
