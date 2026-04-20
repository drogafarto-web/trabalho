#!/usr/bin/env node
/**
 * set-professor-claim
 * ----------------------------------------------------------------------------
 * Script admin que seta `role: 'professor'` direto via Firebase Admin SDK,
 * contornando a callable `bootstrapProfessorClaim` enquanto o bug de CORS
 * em produção é investigado.
 *
 * Replica o efeito da callable:
 *   1. Valida email contra a allowlist hardcoded
 *   2. Seta custom claim { role: 'professor' } no usuário
 *   3. Upsert em professors/{uid}
 *   4. Registra em audit_log
 *
 * Uso:
 *   # Autentica com conta dona do projeto (apenas 1x por máquina):
 *   gcloud auth application-default login
 *
 *   # Seta claim:
 *   node scripts/set-professor-claim.mjs drogafarto@gmail.com
 *
 *   # Remove claim (smoke test negativo):
 *   node scripts/set-professor-claim.mjs drogafarto@gmail.com --revoke
 *
 * Requer:
 *   - Application Default Credentials apontando pra projeto trabalhos-e0647
 *   - Conta com permissão de Firebase Admin / Service Account Token Creator
 *
 * Depois de rodar: faça logout + login de novo no app pra forçar refresh
 * do ID token (claims entram no token em, no máximo, 1h, mas logout força
 * imediato).
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'trabalhos-e0647';

// Espelha functions/src/lib/allowlist.ts — mantenha em sync manualmente.
const ALLOWLIST = new Set([
  'drogafarto@gmail.com',
]);

function isAllowlistedProfessor(email) {
  if (!email) return false;
  return ALLOWLIST.has(email.trim().toLowerCase());
}

function die(msg, code = 1) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(code);
}

function log(msg) {
  console.log(`• ${msg}`);
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const revoke = args.includes('--revoke');

  if (!email || email.startsWith('--')) {
    die(
      'Uso: node scripts/set-professor-claim.mjs <email> [--revoke]\n' +
        '  ex: node scripts/set-professor-claim.mjs drogafarto@gmail.com',
    );
  }

  if (!revoke && !isAllowlistedProfessor(email)) {
    die(
      `Email "${email}" não está na allowlist (functions/src/lib/allowlist.ts).\n` +
        '  Adicione lá primeiro se for um professor legítimo.',
    );
  }

  log(`Projeto: ${PROJECT_ID}`);
  log(`Email alvo: ${email}`);
  log(`Ação: ${revoke ? 'REVOGAR claim' : 'CONCEDER claim de professor'}`);

  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    if (err?.code === 'auth/user-not-found') {
      die(
        `Usuário com email "${email}" não existe no Firebase Auth.\n` +
          '  Faça login no app primeiro (OAuth cria o user), depois rode este script.',
      );
    }
    throw err;
  }

  const { uid, emailVerified, displayName, photoURL } = userRecord;
  log(`UID: ${uid}`);
  log(`Email verificado: ${emailVerified}`);

  if (!emailVerified && !revoke) {
    die('Email não verificado pelo provider. Aborta por segurança.');
  }

  if (revoke) {
    await auth.setCustomUserClaims(uid, null);
    log('Custom claims limpos.');

    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      actorUid: 'admin-script',
      actorRole: 'admin',
      event: 'auth.professor_claim_revoked',
      targetType: 'auth',
      targetId: uid,
      metadata: { via: 'set-professor-claim.mjs' },
      ip: null,
      userAgent: 'set-professor-claim.mjs',
    });
    log('Audit log registrado.');
  } else {
    await auth.setCustomUserClaims(uid, { role: 'professor' });
    log('Custom claim { role: "professor" } setado.');

    await db.collection('professors').doc(uid).set(
      {
        uid,
        email,
        displayName: displayName ?? email.split('@')[0],
        photoURL: photoURL ?? null,
        lastLoginAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        preferences: {
          defaultDiscipline: null,
          tableDensity: 'comfortable',
        },
      },
      { merge: true },
    );
    log(`Documento professors/${uid} upsertado.`);

    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      actorUid: 'admin-script',
      actorRole: 'admin',
      event: 'auth.professor_claim_granted',
      targetType: 'auth',
      targetId: uid,
      metadata: { via: 'set-professor-claim.mjs', provider: 'admin-sdk' },
      ip: null,
      userAgent: 'set-professor-claim.mjs',
    });
    log('Audit log registrado.');
  }

  console.log(
    '\n✓ Pronto. No app: faça SIGN OUT e login de novo pra o ID token\n' +
      '  carregar o claim novo (ou chame user.getIdToken(true) no console).\n',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Falhou:', err?.message ?? err);
  if (err?.code) console.error('  code:', err.code);
  if (err?.errorInfo) console.error('  errorInfo:', err.errorInfo);
  if (
    err?.message?.includes('Could not load the default credentials') ||
    err?.message?.includes('application default credentials')
  ) {
    console.error(
      '\n  Rode primeiro: gcloud auth application-default login\n' +
        '  E garanta que a conta é Owner/Editor do projeto trabalhos-e0647.\n',
    );
  }
  process.exit(1);
});
