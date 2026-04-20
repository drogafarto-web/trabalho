import type { AIProvider } from './types.js';
import { GeminiProvider } from './gemini-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { QwenProvider } from './qwen-provider.js';

/**
 * Seleciona o provider de IA baseado em env vars.
 *
 * env AI_PROVIDER: 'gemini' (default) | 'anthropic' | 'qwen'
 * env GEMINI_API_KEY + GEMINI_MODEL (opcionais, default model conservador)
 * env ANTHROPIC_API_KEY + ANTHROPIC_MODEL
 * env QWEN_API_KEY + QWEN_MODEL
 *
 * Retorna provider mesmo se não configurado. Chame isConfigured() antes
 * de usar — permite deploy sem bloqueio de secret.
 */

export type ProviderName = 'gemini' | 'anthropic' | 'qwen';

export function getActiveProviderName(): ProviderName {
  const raw = (process.env['AI_PROVIDER'] ?? 'gemini').toLowerCase();
  if (raw === 'anthropic' || raw === 'claude') return 'anthropic';
  if (raw === 'qwen') return 'qwen';
  return 'gemini';
}

export function buildProvider(name?: ProviderName): AIProvider {
  const providerName = name ?? getActiveProviderName();

  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(
        process.env['ANTHROPIC_API_KEY'],
        process.env['ANTHROPIC_MODEL'],
      );
    case 'qwen':
      return new QwenProvider(
        process.env['QWEN_API_KEY'],
        process.env['QWEN_MODEL'],
      );
    case 'gemini':
    default:
      return new GeminiProvider(
        process.env['GEMINI_API_KEY'],
        process.env['GEMINI_MODEL'],
      );
  }
}
