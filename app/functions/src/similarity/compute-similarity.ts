import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { findSimilarMatches } from './jaccard.js';
import { logger } from '../lib/logger.js';

/**
 * Após uma submissão ser avaliada pela IA (status=PENDING_REVIEW),
 * comparamos o texto extraído contra TODAS as outras submissões da
 * mesma disciplina+semestre. Matches acima do threshold (0.6) são
 * persistidos e o score máximo vai pro campo plagiarism.similarityScore.
 *
 * IMPORTANTE: comparação server-side via Admin SDK (bypassa rules).
 * Rodado dentro da Cloud Function de grading — o cliente nunca
 * carrega textos de outros grupos.
 */

const THRESHOLD = 0.6;
const SHINGLE_SIZE = 5;
const MAX_MATCHES_STORED = 5;

export async function computeSimilarityForSubmission(params: {
  submissionId: string;
  disciplineId: string;
  targetText: string;
}): Promise<{ maxJaccard: number; matchCount: number }> {
  const { submissionId, disciplineId, targetText } = params;
  const db = getFirestore();

  if (!targetText || targetText.trim().length < 50) {
    logger.info({ submissionId }, '[similarity] texto muito curto, skip');
    return { maxJaccard: 0, matchCount: 0 };
  }

  // Busca todas as submissões dessa disciplina que já foram processadas
  // (têm texto extraído) — exceto a própria
  const snap = await db
    .collection('submissions')
    .where('disciplineId', '==', disciplineId)
    .where('status', 'in', ['PENDING_REVIEW', 'APPROVED', 'REJECTED'])
    .get();

  const candidates: Array<{ id: string; text: string }> = [];
  for (const d of snap.docs) {
    if (d.id === submissionId) continue;
    const data = d.data() as { ai?: { extractedText?: string } };
    const text = data.ai?.extractedText;
    if (text && text.length >= 50) {
      candidates.push({ id: d.id, text });
    }
  }

  if (candidates.length === 0) {
    logger.info({ submissionId }, '[similarity] sem candidatos, skip');
    return { maxJaccard: 0, matchCount: 0 };
  }

  const matches = findSimilarMatches({
    targetText,
    candidates,
    threshold: THRESHOLD,
    shingleSize: SHINGLE_SIZE,
  });

  logger.info(
    {
      submissionId,
      candidateCount: candidates.length,
      matchCount: matches.length,
      topScore: matches[0]?.jaccard ?? 0,
    },
    '[similarity] análise concluída',
  );

  // Persiste top N matches + atualiza score máximo bilateralmente
  const topMatches = matches.slice(0, MAX_MATCHES_STORED);
  const maxJaccard = topMatches[0]?.jaccard ?? 0;

  const batch = db.batch();
  const now = Timestamp.now();

  // Atualiza submission atual com score + topMatches
  const subRef = db.collection('submissions').doc(submissionId);
  batch.update(subRef, {
    'plagiarism.similarityScore': maxJaccard,
    'plagiarism.topMatches': topMatches.map((m) => ({
      submissionId: m.otherId,
      jaccard: m.jaccard,
    })),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Cria subcolletion de matches (para histórico detalhado)
  for (const m of topMatches) {
    const matchRef = subRef.collection('similarity_matches').doc(m.otherId);
    batch.set(matchRef, {
      otherSubmissionId: m.otherId,
      jaccard: m.jaccard,
      detectedAt: now,
    });
  }

  // Bidirecional: atualiza também o OUTRO lado (ex: se A copia B,
  // B também vê que A é similar). Só sobe o score se for maior que o atual.
  for (const m of topMatches) {
    const otherRef = db.collection('submissions').doc(m.otherId);
    const otherSnap = await otherRef.get();
    if (!otherSnap.exists) continue;
    const other = otherSnap.data() as { plagiarism?: { similarityScore?: number } };
    const currentMax = other.plagiarism?.similarityScore ?? 0;

    if (m.jaccard > currentMax) {
      batch.update(otherRef, {
        'plagiarism.similarityScore': m.jaccard,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    // Cria match reverso
    const reverseMatchRef = otherRef.collection('similarity_matches').doc(submissionId);
    batch.set(reverseMatchRef, {
      otherSubmissionId: submissionId,
      jaccard: m.jaccard,
      detectedAt: now,
    });
  }

  await batch.commit();

  return { maxJaccard, matchCount: topMatches.length };
}
