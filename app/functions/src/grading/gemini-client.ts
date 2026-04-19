import { GoogleGenAI, type Part } from '@google/genai';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { buildResponseSchema, buildSystemPrompt, wrapStudentTextContent, type PromptContext } from './prompt-builder.js';
import type { ExtractedContent } from './extract-content.js';

/**
 * Cliente Gemini para correção de trabalhos.
 * Modelo: gemini-3.1-flash (ver docs/03_stack.md).
 */

/**
 * Modelo Gemini. Configurável via env GEMINI_MODEL.
 * Default: gemini-2.5-flash (estável, amplamente disponível).
 * Para versões mais novas quando disponíveis: setar GEMINI_MODEL no
 * Secret Manager ou .secret.local.
 */
const MODEL = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
const TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Schema de validação da resposta (espelha o responseSchema)
// ---------------------------------------------------------------------------
const EvaluationResponseSchema = z.object({
  avaliacao: z
    .object({ nota_final: z.number().min(0).max(10) })
    .and(z.record(z.string(), z.number())),
  plagio: z.object({
    indice_uso_ia: z.number().min(0).max(1),
  }),
  relatorio: z.string().min(1),
  respostas: z.array(z.string()),
  texto_extraido: z.string(),
});

export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;

// ---------------------------------------------------------------------------
// Resultado com metadados
// ---------------------------------------------------------------------------
export interface GradingResult {
  evaluation: EvaluationResponse;
  durationMs: number;
  model: string;
  truncationNotice: string | null;
}

// ---------------------------------------------------------------------------
// Chamada principal
// ---------------------------------------------------------------------------
export async function gradeWithGemini(params: {
  apiKey: string;
  ctx: PromptContext;
  content: ExtractedContent;
}): Promise<GradingResult> {
  const { apiKey, ctx, content } = params;
  const startedAt = Date.now();

  const ai = new GoogleGenAI({ apiKey });

  // Monta content parts conforme o tipo extraído
  const parts: Part[] = [];
  let truncationNotice: string | null = null;

  if (content.kind === 'text') {
    parts.push({ text: wrapStudentTextContent(content.text) });
    if (content.truncated) {
      truncationNotice = `Texto truncado em 50k caracteres (${String(content.pageCount)} páginas). Considere revisar manualmente.`;
    }
  } else {
    parts.push({
      text: 'O trabalho do aluno está no anexo a seguir (pode ser manuscrito ou escaneado). Faça OCR completo e avalie.',
    });
    parts.push({
      inlineData: {
        data: content.base64,
        mimeType: content.mimeType,
      },
    });
    parts.push({
      text: 'Retorne APENAS o JSON no schema fornecido.',
    });
  }

  const systemInstruction = buildSystemPrompt(ctx);
  const responseSchema = buildResponseSchema(ctx.rubric);

  logger.info({ model: MODEL, contentKind: content.kind }, '[gemini] request started');

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('GEMINI_TIMEOUT'));
    }, TIMEOUT_MS);
  });

  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
  try {
    response = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
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
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ model: MODEL, message }, '[gemini] API error');
    throw new GradingError(
      'UNKNOWN',
      `Gemini API erro (modelo=${MODEL}): ${message.slice(0, 300)}`,
    );
  }

  const durationMs = Date.now() - startedAt;
  const rawText = response.text ?? '';

  logger.info(
    { durationMs, rawLength: rawText.length },
    '[gemini] response received',
  );

  if (!rawText) {
    throw new GradingError('EMPTY_RESPONSE', 'Gemini retornou resposta vazia.');
  }

  // Parse + valida com Zod
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    logger.error({ err, rawText: rawText.slice(0, 500) }, '[gemini] JSON parse failed');
    throw new GradingError(
      'INVALID_JSON',
      'Gemini retornou JSON inválido.',
    );
  }

  const validation = EvaluationResponseSchema.safeParse(parsed);
  if (!validation.success) {
    logger.error(
      { issues: validation.error.flatten() },
      '[gemini] schema validation failed',
    );
    throw new GradingError(
      'INVALID_SCHEMA',
      'Resposta da IA não seguiu o schema esperado.',
    );
  }

  return {
    evaluation: validation.data,
    durationMs,
    model: MODEL,
    truncationNotice,
  };
}

// ---------------------------------------------------------------------------
// Erro tipado
// ---------------------------------------------------------------------------
export type GradingErrorCode =
  | 'EMPTY_RESPONSE'
  | 'INVALID_JSON'
  | 'INVALID_SCHEMA'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class GradingError extends Error {
  constructor(
    public readonly code: GradingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GradingError';
  }
}
