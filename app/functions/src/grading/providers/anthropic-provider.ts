import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../lib/logger.js';
import type { AIProvider, GradingContext, GradingResult } from './types.js';
import { ProviderError } from './types.js';
import {
  buildJsonSchema,
  buildSystemPrompt,
  mapSdkErrorToCode,
  validateEvaluation,
  wrapStudentTextContent,
} from './common.js';
import type { ExtractedContent } from '../extract-content.js';

/**
 * Provider Anthropic — Claude 4.6/4.7.
 *
 * Structured output é via TOOL USE: definimos uma tool com input_schema
 * e forçamos o modelo a chamá-la. O input da tool É a saída estruturada.
 *
 * Suporta PDF direto desde Claude 3.5 Sonnet via `document` type.
 */

const TIMEOUT_MS = 90_000;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const GRADE_TOOL_NAME = 'submit_grading';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string | null | undefined, model?: string) {
    this.apiKey = apiKey ?? '';
    this.model = model?.trim() ? model : DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey.length >= 30;
  }

  async grade(params: {
    ctx: GradingContext;
    content: ExtractedContent;
  }): Promise<GradingResult> {
    if (!this.isConfigured()) {
      throw new ProviderError('NOT_CONFIGURED', 'ANTHROPIC_API_KEY não configurada');
    }

    const { ctx, content } = params;
    const startedAt = Date.now();

    const client = new Anthropic({ apiKey: this.apiKey, timeout: TIMEOUT_MS });

    const systemPrompt = buildSystemPrompt(ctx);
    const inputSchema = buildJsonSchema(ctx.rubric);

    let truncationNotice: string | null = null;
    // SDK tipo exato varia entre versões — usa unknown[] pra flexibilidade
    const blocks: Array<Record<string, unknown>> = [];

    if (content.kind === 'text') {
      blocks.push({ type: 'text', text: wrapStudentTextContent(content.text) });
      if (content.truncated) {
        truncationNotice = `Texto truncado em 50k chars (${String(content.pageCount)} págs).`;
      }
    } else {
      // Imagem: usa tipo 'image'. PDF: usa tipo 'document' (beta PDF support).
      if (content.mimeType.startsWith('image/')) {
        blocks.push({ type: 'text', text: 'Trabalho do aluno a seguir como imagem. Faça OCR completo.' });
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: content.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: content.base64,
          },
        });
      } else if (content.mimeType === 'application/pdf') {
        blocks.push({ type: 'text', text: 'Trabalho do aluno a seguir em PDF. Leia o conteúdo completo.' });
        blocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: content.base64,
          },
        });
      } else {
        throw new ProviderError(
          'UNSUPPORTED_CONTENT',
          `Claude não suporta mime: ${content.mimeType}`,
        );
      }
      blocks.push({ type: 'text', text: 'Execute a avaliação chamando a ferramenta submit_grading.' });
    }

    logger.info({ model: this.model, contentKind: content.kind }, '[anthropic] request');

    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.1,
        system: systemPrompt,
        tools: [
          {
            name: GRADE_TOOL_NAME,
            description: 'Submete a avaliação estruturada do trabalho acadêmico.',
            input_schema: inputSchema as Anthropic.Messages.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: GRADE_TOOL_NAME },
        messages: [{ role: 'user', content: blocks as unknown as Anthropic.Messages.MessageParam['content'] }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ model: this.model, message }, '[anthropic] API error');
      throw new ProviderError(mapSdkErrorToCode(err), `Anthropic erro: ${message.slice(0, 300)}`);
    }

    // Extrai o bloco tool_use com a resposta estruturada
    const toolUse = response.content.find(
      (block) => block.type === 'tool_use' && block.name === GRADE_TOOL_NAME,
    ) as Anthropic.Messages.ToolUseBlock | undefined;

    if (!toolUse) {
      throw new ProviderError(
        'EMPTY_RESPONSE',
        'Claude não chamou a tool submit_grading',
      );
    }

    const evaluation = validateEvaluation(toolUse.input);

    return {
      evaluation,
      durationMs: Date.now() - startedAt,
      model: this.model,
      truncationNotice,
    };
  }
}
