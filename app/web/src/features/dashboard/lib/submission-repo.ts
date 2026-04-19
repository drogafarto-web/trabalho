import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { SubmissionSchema, type Submission, type SubmissionStatus } from '@/core/domain/submission';

const COL = 'submissions';

function parse(snap: QuerySnapshot<DocumentData>): Submission[] {
  const out: Submission[] = [];
  for (const d of snap.docs) {
    const parsed = SubmissionSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success) out.push(parsed.data);
    else console.warn(`[submissions] ${d.id} inválido:`, parsed.error.flatten());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Listar submissions por disciplina (com filtros opcionais)
// ---------------------------------------------------------------------------
export async function listSubmissionsByDiscipline(params: {
  disciplineId: string;
  status?: SubmissionStatus;
  pageSize?: number;
}): Promise<Submission[]> {
  const constraints = [
    where('disciplineId', '==', params.disciplineId),
    orderBy('submittedAt', 'desc'),
    limit(params.pageSize ?? 50),
  ];
  if (params.status) {
    constraints.splice(1, 0, where('status', '==', params.status));
  }
  const q = query(collection(db, COL), ...constraints);
  return parse(await getDocs(q));
}

// ---------------------------------------------------------------------------
// Listener real-time (pra atualizar lista quando trigger da IA grava)
// ---------------------------------------------------------------------------
export function subscribeSubmissionsByDiscipline(params: {
  disciplineId: string;
  status?: SubmissionStatus;
  onChange: (subs: Submission[]) => void;
  onError: (err: Error) => void;
}): Unsubscribe {
  const constraints = [
    where('disciplineId', '==', params.disciplineId),
    orderBy('submittedAt', 'desc'),
    limit(100),
  ];
  if (params.status) {
    constraints.splice(1, 0, where('status', '==', params.status));
  }
  const q = query(collection(db, COL), ...constraints);
  return onSnapshot(
    q,
    (snap) => params.onChange(parse(snap)),
    (err) => params.onError(err),
  );
}

// ---------------------------------------------------------------------------
// Ler 1 submission
// ---------------------------------------------------------------------------
export async function getSubmissionById(id: string): Promise<Submission | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  const parsed = SubmissionSchema.safeParse({ id: snap.id, ...snap.data() });
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// Ações do professor
// ---------------------------------------------------------------------------

export interface ReviewPayload {
  criterionScores: Record<string, number>;
  finalScore: number;
  answers: string[];
  report: string;
  professorFeedback: string | null;
  manuallyAdjusted: boolean;
}

export async function publishGrade(params: {
  submissionId: string;
  reviewedByUid: string;
  review: ReviewPayload;
}): Promise<void> {
  const ref = doc(db, COL, params.submissionId);
  await updateDoc(ref, {
    status: 'APPROVED',
    review: {
      reviewedAt: serverTimestamp(),
      reviewedByUid: params.reviewedByUid,
      finalEvaluation: {
        criterionScores: params.review.criterionScores,
        finalScore: params.review.finalScore,
        answers: params.review.answers,
        report: params.review.report,
      },
      professorFeedback: params.review.professorFeedback,
      manuallyAdjusted: params.review.manuallyAdjusted,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function rejectSubmission(params: {
  submissionId: string;
  reviewedByUid: string;
  reason: string;
}): Promise<void> {
  const ref = doc(db, COL, params.submissionId);
  await updateDoc(ref, {
    status: 'REJECTED',
    review: {
      reviewedAt: serverTimestamp(),
      reviewedByUid: params.reviewedByUid,
      finalEvaluation: null,
      professorFeedback: params.reason,
      manuallyAdjusted: false,
    },
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Cloud Functions callable
// ---------------------------------------------------------------------------
export async function reprocessSubmission(submissionId: string): Promise<void> {
  const fn = httpsCallable<{ submissionId: string; force: boolean }, { success: boolean }>(
    functions,
    'gradeSubmission',
  );
  await fn({ submissionId, force: true });
}

export async function getSubmissionDownloadUrl(submissionId: string): Promise<string> {
  const fn = httpsCallable<{ submissionId: string }, { url: string; expiresAt: string }>(
    functions,
    'getSubmissionDownloadUrl',
  );
  const result = await fn({ submissionId });
  return result.data.url;
}
