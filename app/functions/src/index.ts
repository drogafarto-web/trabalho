/**
 * Cloud Functions — Controle de Trabalhos
 *
 * Entry point. Cada Function concreta será adicionada nas fases 1-7
 * (ver docs/01_spec.md). Este stub garante que `firebase deploy --only
 * functions` funcione desde a Fase 0.
 */
import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

// Fase 1
export { bootstrapProfessorClaim } from './admin/bootstrap-claim.js';

// Fase 5 — IA de correção
export {
  onSubmissionCreated,
  gradeSubmission,
} from './grading/grade-submission.js';

// Fase 6 — download do arquivo para preview/review
export { getSubmissionDownloadUrl } from './admin/get-download-url.js';

// Fase 7: export { calculateSimilarity } from './similarity/calculate.js';

// Email transacional — webhook Resend (bounce/complaint/delivered)
export { resendWebhook } from './email/webhook.js';

export const healthCheck = onRequest(
  { region: 'southamerica-east1' },
  (_req, res) => {
    res.json({
      status: 'ok',
      service: 'trabalhos-functions',
      timestamp: new Date().toISOString(),
    });
  },
);
