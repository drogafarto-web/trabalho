import { getFirestore } from 'firebase-admin/firestore';
import type { ProviderName } from '../grading/providers/factory.js';

/**
 * Lê config runtime do LLM gravada pela página /config.
 *
 * Fonte da verdade enquanto v2 é single-tenant. Quando virar multi-tenant,
 * a chave migra pra Secret Manager por tenant via callable.
 *
 * Retorna null se nada foi configurado pela UI ainda — caller deve cair
 * pro env var (Secret Manager).
 */
export interface LlmRuntimeConfig {
  provider: ProviderName;
  apiKey: string;
  model: string | null;
}

const VALID_PROVIDERS: ReadonlySet<string> = new Set([
  'gemini',
  'anthropic',
  'qwen',
]);

export async function readLlmConfig(): Promise<LlmRuntimeConfig | null> {
  const snap = await getFirestore().collection('config').doc('llm').get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  const provider = data['provider'] as string | undefined;
  const apiKey = data['apiKey'] as string | undefined;
  const model = data['model'] as string | undefined;

  if (!provider || !VALID_PROVIDERS.has(provider)) return null;
  if (!apiKey || apiKey.trim().length < 20) return null;

  return {
    provider: provider as ProviderName,
    apiKey: apiKey.trim(),
    model: model?.trim() ? model.trim() : null,
  };
}
