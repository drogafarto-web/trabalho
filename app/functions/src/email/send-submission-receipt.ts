import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { render } from '@react-email/render';
import * as React from 'react';
import { logger } from '../lib/logger.js';
import { sendTransactionalEmail } from './resend-client.js';
import { SubmissionReceiptEmail } from './templates/submission-receipt.js';

/**
 * Envia e-mail de recibo da submissão. Idempotente: se chamado múltiplas vezes
 * pra mesma submission (retry da trigger, reprocessamento), o Resend dedupa
 * pela idempotencyKey.
 *
 * Nunca falha a trigger: erro do email é logado, grading segue.
 */

const DOWNLOAD_URL_TTL_DAYS = 30;

interface SendReceiptInput {
  submissionId: string;
}

interface SubmissionReceiptData {
  shortId: string;
  disciplineId: string;
  assignmentId?: string | undefined;
  students: Array<{ id: string; name: string }>;
  submitter: { email: string };
  file: { storagePath: string; fileName: string; sizeBytes: number } | null;
  submittedUrl?: { url: string; kind: 'youtube' } | null;
  submittedAt: Timestamp | null;
}

export async function sendSubmissionReceipt(
  input: SendReceiptInput,
): Promise<{ ok: boolean; messageId: string | null; error?: string | undefined }> {
  const { submissionId } = input;
  const db = getFirestore();

  // 1. Lê submission
  const snap = await db.collection('submissions').doc(submissionId).get();
  if (!snap.exists) {
    return { ok: false, messageId: null, error: 'Submissão não encontrada' };
  }
  const submission = snap.data() as SubmissionReceiptData;

  if (!submission.submitter?.email) {
    return { ok: false, messageId: null, error: 'Submissão sem email do submitter' };
  }

  // 2. Busca disciplina + atividade em paralelo
  const [disciplineSnap, assignmentSnap] = await Promise.all([
    db.collection('disciplines').doc(submission.disciplineId).get(),
    submission.assignmentId
      ? db.collection('assignments').doc(submission.assignmentId).get()
      : Promise.resolve(null),
  ]);

  const disciplineName = disciplineSnap.exists
    ? ((disciplineSnap.data() as { name?: string }).name ?? 'Disciplina')
    : 'Disciplina';

  const assignment = assignmentSnap?.exists
    ? (assignmentSnap.data() as { title?: string; kind?: 'trabalho' | 'aeco' })
    : null;
  const assignmentTitle = assignment?.title ?? 'Atividade';
  const assignmentKindLabel =
    assignment?.kind === 'aeco' ? 'AECO' : assignment?.kind === 'trabalho' ? 'Trabalho' : 'Entrega';

  // 3. Gera signed URL (30d) pro arquivo OU usa URL submetida
  let downloadUrl: string | null;
  let downloadUrlExpiresAt: Date | null;
  let fileName: string;
  let fileSizeBytes: number;

  if (submission.file) {
    const signed = await generateDownloadUrl(submission.file.storagePath);
    downloadUrl = signed.url;
    downloadUrlExpiresAt = signed.expiresAt;
    fileName = submission.file.fileName;
    fileSizeBytes = submission.file.sizeBytes;
  } else {
    downloadUrl = submission.submittedUrl?.url ?? null;
    downloadUrlExpiresAt = null; // URL do aluno não expira
    fileName = submission.submittedUrl?.url ?? '';
    fileSizeBytes = 0;
  }

  // 4. Renderiza HTML + texto plano
  const submittedAt = submission.submittedAt?.toDate() ?? new Date();
  const studentsNames = submission.students.map((s) => s.name);

  const emailElement = React.createElement(SubmissionReceiptEmail, {
    shortId: submission.shortId,
    disciplineName,
    assignmentTitle,
    assignmentKindLabel,
    students: studentsNames,
    submittedAt,
    fileName,
    fileSizeBytes,
    downloadUrl,
    downloadUrlExpiresAt,
    isUrlDelivery: !submission.file,
  });

  const [html, text] = await Promise.all([
    render(emailElement),
    render(emailElement, { plainText: true }),
  ]);

  // 5. Envia via wrapper
  const result = await sendTransactionalEmail({
    to: submission.submitter.email,
    subject: `Recibo ${submission.shortId} — ${assignmentTitle}`,
    html,
    text,
    idempotencyKey: `receipt_${submissionId}`,
    tags: [
      { name: 'module', value: 'submission_receipt' },
      { name: 'discipline', value: submission.disciplineId },
      { name: 'submission', value: submissionId },
    ],
  });

  // 6. Persiste evento em mail_events pra trilha de auditoria
  //    (independente de webhook — este é o "tentei enviar")
  try {
    await db.collection('mail_events').add({
      kind: 'submission_receipt.sent',
      submissionId,
      to: submission.submitter.email,
      messageId: result.messageId,
      ok: result.ok,
      error: result.error ?? null,
      attempts: result.ok ? 1 : 3,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    logger.warn(
      { err, submissionId, messageId: result.messageId },
      '[receipt] falha ao gravar mail_events',
    );
  }

  if (!result.ok) {
    logger.error(
      { submissionId, err: result.error },
      '[receipt] falha no envio — grading segue',
    );
  } else {
    logger.info(
      { submissionId, messageId: result.messageId, to: submission.submitter.email },
      '[receipt] enviado',
    );
  }

  return result.ok
    ? { ok: true, messageId: result.messageId }
    : { ok: false, messageId: null, ...(result.error ? { error: result.error } : {}) };
}

// ---------------------------------------------------------------------------
// Signed URL 30d (emulator-aware)
// ---------------------------------------------------------------------------
async function generateDownloadUrl(
  storagePath: string,
): Promise<{ url: string | null; expiresAt: Date | null }> {
  const isEmulator = !!process.env['FUNCTIONS_EMULATOR'];
  const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    if (isEmulator) {
      const bucket = getStorage().bucket().name;
      const encodedPath = encodeURIComponent(storagePath);
      return {
        url: `http://127.0.0.1:9199/v0/b/${bucket}/o/${encodedPath}?alt=media`,
        expiresAt,
      };
    }

    const [signed] = await getStorage()
      .bucket()
      .file(storagePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
      });
    return { url: signed, expiresAt };
  } catch (err) {
    logger.warn({ err, storagePath }, '[receipt] falha ao gerar signed URL — seguindo sem link');
    return { url: null, expiresAt: null };
  }
}
