import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../lib/logger.js';

/**
 * Anti-duplicata em grupo: um aluno X só pode entregar uma assignment Y uma vez,
 * mesmo que esteja em grupos diferentes. Implementado via documentos
 * `assignment_locks/{assignmentId}_{studentId}` criados em transação.
 *
 * Contrato:
 *   - sucesso → todos os locks foram criados; retorno `{ ok: true }`
 *   - colisão → pelo menos um aluno já entregou; retorno `{ ok: false, conflictStudentName }`
 *
 * Idempotência: se `conflictSubmissionId === submissionId` em algum lock (reenvio
 * do mesmo doc, ex: retry de trigger), tratamos como sucesso — não é duplicação real.
 */
export interface LockAcquireResult {
  ok: boolean;
  conflictStudentName?: string;
  conflictSubmissionId?: string;
}

export async function acquireAssignmentLocks(params: {
  submissionId: string;
  assignmentId: string;
  ownerUid: string;
  disciplineId: string;
  students: Array<{ id: string; name: string }>;
}): Promise<LockAcquireResult> {
  const { submissionId, assignmentId, ownerUid, disciplineId, students } = params;
  if (students.length === 0) return { ok: true };

  const db = getFirestore();
  const locksCol = db.collection('assignment_locks');
  const refs = students.map((s) =>
    locksCol.doc(`${assignmentId}_${s.id}`),
  );

  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));

    for (let i = 0; i < snaps.length; i++) {
      const snap = snaps[i];
      if (!snap || !snap.exists) continue;
      const existing = snap.data() as { submissionId?: string } | undefined;
      // Mesma submissão reprocessando → ok
      if (existing?.submissionId === submissionId) continue;
      const student = students[i];
      return {
        ok: false,
        ...(student ? { conflictStudentName: student.name } : {}),
        ...(existing?.submissionId
          ? { conflictSubmissionId: existing.submissionId }
          : {}),
      };
    }

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const student = students[i];
      if (!ref || !student) continue;
      tx.set(ref, {
        assignmentId,
        studentId: student.id,
        studentName: student.name,
        submissionId,
        ownerUid,
        disciplineId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    logger.info(
      { submissionId, assignmentId, count: refs.length },
      '[locks] adquiridos',
    );
    return { ok: true };
  });
}
