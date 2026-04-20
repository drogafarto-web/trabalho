import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { Webhook } from 'svix';
import { logger } from '../lib/logger.js';

/**
 * Webhook do Resend — recebe eventos do ciclo de vida do email
 * (delivered, bounced, complained, opened, clicked).
 *
 * Segurança:
 *   - Svix assina o body com HMAC. `Webhook.verify` rejeita se falhar.
 *   - O secret `RESEND_WEBHOOK_SECRET` vem do dashboard do Resend
 *     (Webhooks → Create → copiar signing secret).
 *
 * Persistência:
 *   - Cada evento grava em `mail_events/` com deduplicação por svix-id.
 *   - Bounces duros marcam `mail_suppressions/{email}` pra bloquear envios futuros.
 */

const REGION = 'southamerica-east1';
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');

interface ResendEvent {
  type: string; // e.g. "email.delivered", "email.bounced"
  created_at: string;
  data: {
    email_id?: string;
    to?: string[] | string;
    from?: string;
    subject?: string;
    tags?: Record<string, string>;
    bounce?: { message?: string; subType?: string };
    complaint?: { message?: string };
    click?: { link?: string };
  };
}

export const resendWebhook = onRequest(
  {
    region: REGION,
    secrets: [RESEND_WEBHOOK_SECRET],
    timeoutSeconds: 10,
    cors: false,
    invoker: 'public', // webhook externo
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signingSecret = RESEND_WEBHOOK_SECRET.value();
    if (!signingSecret) {
      logger.error('[resend-webhook] secret ausente');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    const svixId = req.header('svix-id') ?? '';
    const svixTimestamp = req.header('svix-timestamp') ?? '';
    const svixSignature = req.header('svix-signature') ?? '';

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.warn('[resend-webhook] headers svix ausentes');
      res.status(400).send('Missing svix headers');
      return;
    }

    // O Firebase já parseia JSON em req.body — precisamos do raw pra verificar HMAC.
    // onRequest expõe raw em req.rawBody quando `application/json`.
    const rawBody =
      (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ??
      JSON.stringify(req.body);

    let event: ResendEvent;
    try {
      const wh = new Webhook(signingSecret);
      event = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendEvent;
    } catch (err) {
      logger.warn({ err }, '[resend-webhook] assinatura inválida');
      res.status(401).send('Invalid signature');
      return;
    }

    const db = getFirestore();
    const eventDocId = svixId; // svix-id é único por evento

    try {
      const eventRef = db.collection('mail_events').doc(eventDocId);
      const existing = await eventRef.get();
      if (existing.exists) {
        logger.info({ svixId, type: event.type }, '[resend-webhook] evento duplicado (ignorado)');
        res.status(200).send('OK (dup)');
        return;
      }

      const messageId = event.data.email_id ?? null;
      const toList = Array.isArray(event.data.to)
        ? event.data.to
        : event.data.to
          ? [event.data.to]
          : [];
      const submissionTag = event.data.tags?.['submission'] ?? null;

      await eventRef.set({
        kind: event.type,
        messageId,
        to: toList,
        tags: event.data.tags ?? {},
        submissionId: submissionTag,
        payload: event.data,
        receivedAt: Timestamp.now(),
        svixId,
        svixTimestamp,
      });

      // Bounce duro → suppression list (bloqueia envios futuros pro email)
      if (event.type === 'email.bounced') {
        const subType = event.data.bounce?.subType ?? 'unknown';
        const isHardBounce = subType.toLowerCase() === 'permanent';
        if (isHardBounce) {
          for (const email of toList) {
            await db
              .collection('mail_suppressions')
              .doc(emailKey(email))
              .set(
                {
                  email,
                  reason: 'hard_bounce',
                  message: event.data.bounce?.message ?? null,
                  firstSeenAt: FieldValue.serverTimestamp(),
                  lastEventMessageId: messageId,
                },
                { merge: true },
              );
          }
        }
      }

      // Reclamação de spam → suppression
      if (event.type === 'email.complained') {
        for (const email of toList) {
          await db
            .collection('mail_suppressions')
            .doc(emailKey(email))
            .set(
              {
                email,
                reason: 'complaint',
                message: event.data.complaint?.message ?? null,
                firstSeenAt: FieldValue.serverTimestamp(),
                lastEventMessageId: messageId,
              },
              { merge: true },
            );
        }
      }

      logger.info(
        { svixId, type: event.type, messageId, submissionId: submissionTag },
        '[resend-webhook] evento processado',
      );
      res.status(200).send('OK');
    } catch (err) {
      logger.error({ err, svixId }, '[resend-webhook] falha ao persistir');
      // Retorna 5xx pro Resend re-tentar — Svix faz retry exponencial até 24h
      res.status(500).send('Internal error');
    }
  },
);

function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 200);
}
