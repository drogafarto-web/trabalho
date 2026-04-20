import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

/**
 * Gera uma signed URL temporária (5 min) para o professor baixar ou
 * visualizar o arquivo de uma submission no browser. Apenas o dono
 * da disciplina pode chamar.
 *
 * Em produção: URL assinada via `getSignedUrl` do Admin SDK.
 * Em emulator: URL pública do emulator (signed URL não funciona no emu).
 */
const Input = z.object({
  submissionId: z.string().min(1),
});

const EXPIRES_IN_MS = 5 * 60 * 1000;

export const getSubmissionDownloadUrl = onCall(
  {
    region: 'southamerica-east1',
    cors: [
      /trabalhos-e0647\.web\.app$/,
      /trabalhos-e0647\.firebaseapp\.com$/,
      /localhost:\d+$/,
      /127\.0\.0\.1:\d+$/,
    ],
    timeoutSeconds: 10,
  },
  async (request) => {
    // Só professor autenticado
    if (!request.auth || request.auth.token['role'] !== 'professor') {
      throw new HttpsError('permission-denied', 'Apenas professores.');
    }

    const parsed = Input.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const db = getFirestore();
    const snap = await db.collection('submissions').doc(parsed.data.submissionId).get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Submissão não encontrada.');
    }

    const sub = snap.data() as {
      disciplineOwnerUid: string;
      file: { storagePath: string };
    };

    if (sub.disciplineOwnerUid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Não é dono desta disciplina.');
    }

    const storagePath = sub.file.storagePath;
    const expiresAt = new Date(Date.now() + EXPIRES_IN_MS);

    // Detecta se estamos no emulator
    const isEmulator = !!process.env['FUNCTIONS_EMULATOR'];

    let url: string;
    if (isEmulator) {
      // Emulator: retorna URL direta do Storage Emulator
      // Formato: http://127.0.0.1:9199/v0/b/{bucket}/o/{encodedPath}?alt=media
      const bucket = getStorage().bucket().name;
      const encodedPath = encodeURIComponent(storagePath);
      url = `http://127.0.0.1:9199/v0/b/${bucket}/o/${encodedPath}?alt=media`;

      logger.info({ submissionId: parsed.data.submissionId, isEmulator: true }, 'URL emulator gerada');
    } else {
      // Produção: signed URL real
      const [signed] = await getStorage()
        .bucket()
        .file(storagePath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: expiresAt,
        });
      url = signed;

      logger.info(
        { submissionId: parsed.data.submissionId, expiresAt: expiresAt.toISOString() },
        'URL assinada gerada',
      );
    }

    return {
      url,
      expiresAt: expiresAt.toISOString(),
    };
  },
);
