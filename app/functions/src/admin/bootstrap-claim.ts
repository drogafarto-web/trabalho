import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isAllowlistedProfessor } from '../lib/allowlist.js';
import { logger } from '../lib/logger.js';

/**
 * bootstrapProfessorClaim
 * ----------------------------------------------------------------------------
 * Callable chamado pelo React após OAuth Google. Se o e-mail do usuário
 * autenticado estiver na allowlist, concede `role: 'professor'` via
 * custom claim. O React deve então forçar refresh do token e prosseguir.
 *
 * Usuários fora da allowlist recebem `NOT_ALLOWLISTED` — o React mostra
 * tela de "Acesso não autorizado".
 *
 * Cada chamada é registrada em audit_log (imutável).
 */
export const bootstrapProfessorClaim = onCall(
  {
    region: 'southamerica-east1',
    cors: [
      /trabalhos-e0647\.web\.app$/,
      /trabalhos-e0647\.firebaseapp\.com$/,
      /localhost:\d+$/,
      /127\.0\.0\.1:\d+$/,
    ],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Requer autenticação.');
    }

    const { uid, token } = request.auth;
    const email = token['email'] as string | undefined;
    const emailVerified = token['email_verified'] as boolean | undefined;
    const provider = token.firebase.sign_in_provider;

    // Usuários anônimos nunca viram professor
    if (provider === 'anonymous') {
      throw new HttpsError('permission-denied', 'Login anônimo não pode virar professor.');
    }

    if (!email || !emailVerified) {
      throw new HttpsError('failed-precondition', 'E-mail não verificado.');
    }

    if (!isAllowlistedProfessor(email)) {
      // Registra tentativa de acesso não autorizado
      await getFirestore().collection('audit_log').add({
        timestamp: FieldValue.serverTimestamp(),
        actorUid: uid,
        actorRole: 'student',
        event: 'auth.unauthorized_bootstrap_attempt',
        targetType: 'auth',
        targetId: uid,
        metadata: { emailHash: hashEmail(email), provider },
        ip: request.rawRequest.ip ?? null,
        userAgent: request.rawRequest.headers['user-agent'] ?? null,
      });

      logger.warn({ uid, provider }, 'Bootstrap negado: fora da allowlist');

      return {
        ok: false as const,
        error: 'NOT_ALLOWLISTED' as const,
      };
    }

    // Concede claim
    await getAuth().setCustomUserClaims(uid, { role: 'professor' });

    // Cria/atualiza documento do professor
    await getFirestore().collection('professors').doc(uid).set(
      {
        uid,
        email,
        displayName: (token['name'] as string | undefined) ?? email.split('@')[0],
        photoURL: (token['picture'] as string | undefined) ?? null,
        lastLoginAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        preferences: {
          defaultDiscipline: null,
          tableDensity: 'comfortable',
        },
      },
      { merge: true },
    );

    // Audit log
    await getFirestore().collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      actorUid: uid,
      actorRole: 'professor',
      event: 'auth.professor_claim_granted',
      targetType: 'auth',
      targetId: uid,
      metadata: { provider },
      ip: request.rawRequest.ip ?? null,
      userAgent: request.rawRequest.headers['user-agent'] ?? null,
    });

    logger.info({ uid }, 'Professor claim concedida');

    return {
      ok: true as const,
      role: 'professor' as const,
    };
  },
);

/**
 * Hash simples pra logar "qual email tentou" sem vazar o email em claro.
 * Não é segredo criptográfico — só ofuscação pra auditoria.
 */
function hashEmail(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) - h + email.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(36)}`;
}
