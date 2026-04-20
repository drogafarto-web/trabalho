import type { ExtractedContent } from '../extract-content.js';

/**
 * Interface comum para provedores de IA que fazem correção de trabalho.
 *
 * Cada provider (Gemini, Anthropic, Qwen) implementa esta interface com
 * o próprio SDK e formato de structured output.
 *
 * O caller (grade-submission-core) escolhe o provider via factory que lê
 * env AI_PROVIDER.
 */

export interface PromptRubricCriterion {
  name: string;
  description: string;
  weight: number;
}

export interface GradingContext {
  disciplineName: string;
  course: string;
  rubric: {
    criteria: PromptRubricCriterion[];
    questions: Array<{ text: string }>;
    customRules: string | null;
  };
}

export interface EvaluationOutput {
  avaliacao: { nota_final: number } & Record<string, number>;
  plagio: { indice_uso_ia: number };
  relatorio: string;
  respostas: string[];
  texto_extraido: string;
}

export interface GradingResult {
  evaluation: EvaluationOutput;
  durationMs: number;
  model: string;
  truncationNotice: string | null;
}

export interface AIProvider {
  /** Identificador curto do provider (ex: 'gemini', 'anthropic', 'qwen') */
  readonly name: string;

  /** Modelo atual ativo (populado após construção) */
  readonly model: string;

  /** Verifica se o provider tem todas as credenciais necessárias pra rodar */
  isConfigured(): boolean;

  /**
   * Executa a correção. Pode lançar ProviderError se falhar.
   */
  grade(params: {
    ctx: GradingContext;
    content: ExtractedContent;
  }): Promise<GradingResult>;
}

export type ProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'EMPTY_RESPONSE'
  | 'INVALID_JSON'
  | 'INVALID_SCHEMA'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNSUPPORTED_CONTENT'
  | 'UNKNOWN';

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
