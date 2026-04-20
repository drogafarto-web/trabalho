import OpenAI from 'openai';
import { logger } from '../../lib/logger.js';
import type { AIProvider, GradingContext, GradingResult } from './types.js';
import { ProviderError } from './types.js';
import {
  buildJsonSchema,
  buildSystemPrompt,
  mapSdkErrorToCode,
  parseJsonLoose,
  validateEvaluation,
  wrapStudentTextContent,
} from './common.js';
import type { ExtractedContent } from '../extract-content.js';

/**
 * Provider Qwen (Alibaba) via DashScope — endpoint compatível com OpenAI.
 *
 * Documentação: https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-openai-with-dashscope
 * Base URL: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 *
 * Suporta response_format: { type: 'json_object' } — não tem JSON schema
 * estrito como OpenAI, mas prompt bem construído + validação Zod compensa.
 *
 * Vision: qwen-vl-max / qwen-vl-plus aceitam imagens via content.url ou base64.
 */

const TIMEOUT_MS = 90_000;
const DEFAULT_MODEL = 'qwen-plus';
const BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export class QwenProvider implements AIProvider {
  readonly name = 'qwen';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string | null | undefined, model?: string) {
    this.apiKey = apiKey ?? '';
    this.model = model?.trim() ? model : DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey.length >= 20;
  }

  async grade(params: {
    ctx: GradingContext;
    content: ExtractedContent;
  }): Promise<GradingResult> {
    if (!this.isConfigured()) {
      throw new ProviderError('NOT_CONFIGURED', 'QWEN_API_KEY não configurada');
    }

    const { ctx, content } = params;
    const startedAt = Date.now();

    const client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: BASE_URL,
      timeout: TIMEOUT_MS,
    });

    const systemPrompt = buildSystemPrompt(ctx);
    const schema = buildJsonSchema(ctx.rubric);
    const schemaDesc = `\n\nSCHEMA OBRIGATÓRIO DA RESPOSTA:\n${JSON.stringify(schema, null, 2)}`;

    let truncationNotice: string | null = null;
    const userContent: OpenAI.ChatCompletionContentPart[] = [];

    if (content.kind === 'url') {
      throw new ProviderError(
        'UNSUPPORTED_CONTENT',
        'Entregas por URL (ex: YouTube) são suportadas apenas pelo provider Gemini. Troque o provider em /config.',
      );
    }

    if (content.kind === 'text') {
      userContent.push({
        type: 'text',
        text: wrapStudentTextContent(content.text) + schemaDesc,
      });
      if (content.truncated) {
        truncationNotice = `Texto truncado em 50k chars (${String(content.pageCount)} págs).`;
      }
    } else if (content.mimeType.startsWith('image/')) {
      userContent.push({
        type: 'text',
        text: 'Trabalho do aluno como imagem. Faça OCR completo.' + schemaDesc,
      });
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${content.mimeType};base64,${content.base64}`,
        },
      });
    } else {
      throw new ProviderError(
        'UNSUPPORTED_CONTENT',
        `Qwen não suporta mime direto: ${content.mimeType}. Extraia texto ou envie como imagem.`,
      );
    }

    logger.info({ model: this.model, contentKind: content.kind }, '[qwen] request');

    let response: OpenAI.Chat.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ model: this.model, message }, '[qwen] API error');
      throw new ProviderError(mapSdkErrorToCode(err), `Qwen erro: ${message.slice(0, 300)}`);
    }

    const rawText = response.choices[0]?.message?.content ?? '';
    if (!rawText) {
      throw new ProviderError('EMPTY_RESPONSE', 'Qwen retornou vazio');
    }

    const parsed = parseJsonLoose(rawText);
    const evaluation = validateEvaluation(parsed);

    return {
      evaluation,
      durationMs: Date.now() - startedAt,
      model: this.model,
      truncationNotice,
    };
  }
}
