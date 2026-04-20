import type { LlmProvider } from './llm-config-repo';

/**
 * Busca a lista de modelos diretamente na API do provider usando a chave
 * informada. Roda no browser — cada provider exige um header/parâmetro
 * diferente pra permitir requests cross-origin.
 *
 * Erros de rede/CORS/401 viram `ProviderListError` com motivo legível.
 * Caller pode cair pro input livre.
 */

export interface ProviderModel {
  id: string;
  label: string;
}

export class ProviderListError extends Error {
  constructor(
    message: string,
    readonly reason: 'unauthorized' | 'network' | 'unknown',
  ) {
    super(message);
    this.name = 'ProviderListError';
  }
}

const TIMEOUT_MS = 12_000;

export async function listProviderModels(
  provider: LlmProvider,
  apiKey: string,
  signal?: AbortSignal,
): Promise<ProviderModel[]> {
  switch (provider) {
    case 'gemini':    return listGemini(apiKey, signal);
    case 'anthropic': return listAnthropic(apiKey, signal);
    case 'qwen':      return listQwen(apiKey, signal);
  }
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function listGemini(apiKey: string, signal?: AbortSignal): Promise<ProviderModel[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url, signal ? { signal } : {}, 'gemini');

  const json = (await res.json()) as {
    models?: Array<{
      name: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const models = (json.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name.replace(/^models\//, '');
      return { id, label: m.displayName ? `${id} — ${m.displayName}` : id };
    })
    // Tira variantes que não interessam pra grading (embeddings, vision-only experimentais)
    .filter((m) => !m.id.includes('embedding') && !m.id.includes('aqa'));

  return sortPreferred(models, ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']);
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------
async function listAnthropic(apiKey: string, signal?: AbortSignal): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/models?limit=100',
    {
      ...(signal ? { signal } : {}),
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    },
    'anthropic',
  );

  const json = (await res.json()) as {
    data?: Array<{ id: string; display_name?: string }>;
  };

  const models = (json.data ?? []).map((m) => ({
    id: m.id,
    label: m.display_name ? `${m.id} — ${m.display_name}` : m.id,
  }));

  return sortPreferred(models, ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5']);
}

// ---------------------------------------------------------------------------
// Qwen (DashScope OpenAI-compatible)
// ---------------------------------------------------------------------------
async function listQwen(apiKey: string, signal?: AbortSignal): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout(
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
    {
      ...(signal ? { signal } : {}),
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    'qwen',
  );

  const json = (await res.json()) as { data?: Array<{ id: string }> };

  const models = (json.data ?? [])
    .map((m) => ({ id: m.id, label: m.id }))
    // Só modelos de chat/grading — tira embeddings, audio, image-gen
    .filter(
      (m) =>
        m.id.startsWith('qwen') &&
        !m.id.includes('embed') &&
        !m.id.includes('audio') &&
        !m.id.includes('tts') &&
        !m.id.includes('image'),
    );

  return sortPreferred(models, ['qwen-plus', 'qwen-max', 'qwen-turbo']);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  provider: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Compoe abort: timeout OU caller cancela
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ProviderListError(`Timeout ao consultar ${provider}`, 'network');
    }
    throw new ProviderListError(
      `Falha de rede/CORS ao consultar ${provider}`,
      'network',
    );
  }
  clearTimeout(timer);

  if (res.status === 401 || res.status === 403) {
    throw new ProviderListError('Chave inválida ou sem permissão', 'unauthorized');
  }
  if (!res.ok) {
    throw new ProviderListError(
      `${provider} retornou HTTP ${res.status}`,
      'unknown',
    );
  }

  return res;
}

/** Move modelos preferidos pro topo, mantém ordem dos demais. */
function sortPreferred(models: ProviderModel[], preferred: string[]): ProviderModel[] {
  const set = new Set(preferred);
  const head = preferred
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is ProviderModel => !!m);
  const tail = models.filter((m) => !set.has(m.id));
  return [...head, ...tail];
}
