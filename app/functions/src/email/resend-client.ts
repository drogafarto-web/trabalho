import { Resend } from 'resend';
import { defineSecret } from 'firebase-functions/params';
import { logger } from '../lib/logger.js';

/**
 * Wrapper único pra chamadas do Resend. Resolve gaps conhecidos do padrão
 * de referência (HC Quality):
 *   - Retry com backoff exponencial pra erros transientes (rede, 5xx)
 *   - Idempotency key por chamada (evita duplicata em retries da trigger)
 *   - Tags estruturadas pra analytics no dashboard Resend
 *   - Logging estruturado unificado
 *
 * Regra: TODO envio transacional passa por `sendTransactionalEmail`.
 * Não instanciar `new Resend(...)` em outro lugar.
 */

export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const FROM_DEFAULT = 'Controle de Trabalhos <trabalhos@app.labclinmg.com.br>';

const MAX_RETRIES = 3;
const BACKOFF_MS = [500, 2_000, 5_000] as const;

export interface TransactionalEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Chave idempotente — mesma key no retry = 1 email. Ex: `receipt_${submissionId}`. */
  idempotencyKey: string;
  /** Tags pra segmentar no dashboard Resend (valores: [a-zA-Z0-9_-]). */
  tags: Array<{ name: string; value: string }>;
  /** Override do from — útil pra transacionais de módulos específicos. */
  from?: string | undefined;
  /** Reply-to — default null ("não responda"). */
  replyTo?: string | undefined;
}

export interface TransactionalEmailResult {
  ok: boolean;
  messageId: string | null;
  attempts: number;
  error?: string | undefined;
}

/**
 * Envia email transacional. Nunca throws — retorna { ok, error }.
 * Chamadores decidem se a falha do email é bloqueante (quase sempre não é).
 */
export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalEmailResult> {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    logger.warn({ to: input.to, key: input.idempotencyKey }, '[resend] API key ausente');
    return { ok: false, messageId: null, attempts: 0, error: 'RESEND_API_KEY não configurada' };
  }

  const resend = new Resend(apiKey);
  const from = input.from ?? FROM_DEFAULT;
  const toList = Array.isArray(input.to) ? input.to : [input.to];

  if (toList.length === 0) {
    return { ok: false, messageId: null, attempts: 0, error: 'Lista de destinatários vazia' };
  }

  const sanitizedTags = input.tags
    .map((t) => ({ name: sanitizeTag(t.name), value: sanitizeTag(t.value) }))
    .filter((t) => t.name && t.value);

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send(
        {
          from,
          to: toList,
          subject: input.subject,
          html: input.html,
          text: input.text,
          tags: sanitizedTags,
          ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        },
        { idempotencyKey: input.idempotencyKey },
      );

      if (error) {
        lastError = `Resend: ${error.name} — ${error.message}`;
        if (!isRetryable(error.name)) {
          logger.error(
            { err: error, to: toList, key: input.idempotencyKey },
            '[resend] erro não-retryable',
          );
          return { ok: false, messageId: null, attempts: attempt, error: lastError };
        }
        logger.warn(
          { attempt, err: error, key: input.idempotencyKey },
          '[resend] erro retryable, aguardando backoff',
        );
      } else if (data?.id) {
        logger.info(
          { messageId: data.id, to: toList, attempts: attempt, key: input.idempotencyKey },
          '[resend] email enviado',
        );
        return { ok: true, messageId: data.id, attempts: attempt };
      } else {
        lastError = 'Resend retornou resposta vazia';
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn(
        { attempt, err: lastError, key: input.idempotencyKey },
        '[resend] exceção na chamada',
      );
    }

    if (attempt < MAX_RETRIES) {
      await sleep(BACKOFF_MS[attempt - 1] ?? 5_000);
    }
  }

  logger.error(
    { to: toList, key: input.idempotencyKey, err: lastError },
    '[resend] falha após todas as tentativas',
  );
  return { ok: false, messageId: null, attempts: MAX_RETRIES, error: lastError };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryable(errorName: string): boolean {
  // Erros 4xx (validation, not-found, unauthorized) não adianta retentar.
  // 5xx e network errors são retryable.
  const nonRetryable = [
    'validation_error',
    'missing_required_field',
    'invalid_to_address',
    'invalid_from_address',
    'invalid_api_Key',
    'invalid_api_key',
    'unauthorized',
    'forbidden',
    'restricted_api_key',
    'daily_quota_exceeded',
  ];
  return !nonRetryable.includes(errorName);
}

function sanitizeTag(raw: string): string {
  // Resend aceita [a-zA-Z0-9_-], max 256 chars
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
