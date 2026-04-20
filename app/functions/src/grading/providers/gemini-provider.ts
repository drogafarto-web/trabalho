import { GoogleGenAI, Type, type Part, type Schema } from '@google/genai';
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

const TIMEOUT_MS = 90_000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Converte o JSON Schema genérico (string types) para o formato do @google/genai
 * que usa enum Type.OBJECT, Type.NUMBER, etc.
 */
function convertSchemaToGemini(schema: Record<string, unknown>): Schema {
  const typeMap: Record<string, Type> = {
    object: Type.OBJECT,
    array: Type.ARRAY,
    string: Type.STRING,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
  };

  const rawType = schema['type'] as string | undefined;
  const geminiType = rawType ? typeMap[rawType] : undefined;
  if (!geminiType) {
    throw new Error(`Tipo JSON schema não suportado: ${String(rawType)}`);
  }

  const out: Record<string, unknown> = { type: geminiType };
  if (schema['description']) out['description'] = schema['description'];
  if (schema['required']) out['required'] = schema['required'];

  if (schema['properties']) {
    const props = schema['properties'] as Record<string, Record<string, unknown>>;
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      converted[key] = convertSchemaToGemini(value);
    }
    out['properties'] = converted;
  }

  if (schema['items']) {
    out['items'] = convertSchemaToGemini(schema['items'] as Record<string, unknown>);
  }

  return out as Schema;
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
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
      throw new ProviderError('NOT_CONFIGURED', 'GEMINI_API_KEY não configurada');
    }

    const { ctx, content } = params;
    const startedAt = Date.now();

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const parts: Part[] = [];
    let truncationNotice: string | null = null;

    if (content.kind === 'text') {
      parts.push({ text: wrapStudentTextContent(content.text) });
      if (content.truncated) {
        truncationNotice = `Texto truncado em 50k chars (${String(content.pageCount)} págs).`;
      }
    } else {
      parts.push({
        text: 'Trabalho do aluno no anexo (pode ser manuscrito/escaneado). Faça OCR completo.',
      });
      parts.push({
        inlineData: { data: content.base64, mimeType: content.mimeType },
      });
      parts.push({ text: 'Retorne APENAS JSON no schema fornecido.' });
    }

    const jsonSchema = buildJsonSchema(ctx.rubric);
    const responseSchema = convertSchemaToGemini(jsonSchema);
    const systemInstruction = buildSystemPrompt(ctx);

    logger.info({ model: this.model, contentKind: content.kind }, '[gemini] request');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ProviderError('TIMEOUT', 'Gemini timeout 90s'));
      }, TIMEOUT_MS);
    });

    let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
    try {
      response = await Promise.race([
        ai.models.generateContent({
          model: this.model,
          contents: { parts },
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema,
            systemInstruction,
          },
        }),
        timeoutPromise,
      ]);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ model: this.model, message }, '[gemini] API error');
      throw new ProviderError(mapSdkErrorToCode(err), `Gemini erro: ${message.slice(0, 300)}`);
    }

    const rawText = response.text ?? '';
    if (!rawText) {
      throw new ProviderError('EMPTY_RESPONSE', 'Gemini retornou vazio');
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
