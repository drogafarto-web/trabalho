/**
 * Commit da estrutura importada — batch writes em chunks.
 * Grava disciplinas, etapas e atividades usando os IDs pré-alocados no diff.
 */

import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultTermLabel } from '@/core/domain/term';
import type { EstruturaDiff, ImportCommitResult } from './types.js';

const BATCH_CHUNK = 450; // margem sobre o limite de 500 do Firestore

export async function commitEstrutura(
  diff: EstruturaDiff,
  ownerUid: string,
): Promise<ImportCommitResult> {
  const startedAt = Date.now();
  let batch: WriteBatch = writeBatch(db);
  let ops = 0;
  const pending: Promise<void>[] = [];

  const flush = () => {
    if (ops > 0) {
      pending.push(batch.commit());
      batch = writeBatch(db);
      ops = 0;
    }
  };

  const addOp = (fn: (b: WriteBatch) => void) => {
    fn(batch);
    ops++;
    if (ops >= BATCH_CHUNK) flush();
  };

  // --- Disciplinas ---
  let createdDisciplines = 0;
  for (const entry of diff.disciplines) {
    if (entry.status !== 'create' || !entry.data || !entry.existingId) continue;
    const ref = doc(collection(db, 'disciplines'), entry.existingId);
    const payload = {
      ownerUid,
      name: entry.data.name,
      code: entry.data.code,
      course: entry.data.course,
      period: entry.data.period,
      semester: entry.data.semester,
      rubric: { ...entry.data.rubric, version: 1 },
      deadline: null,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    addOp((b) => b.set(ref, payload));
    createdDisciplines++;
  }

  // --- Etapas ---
  let createdTerms = 0;
  for (const entry of diff.terms) {
    if (entry.status !== 'create' || !entry.data || !entry.existingId) continue;
    if (!entry.data.disciplineId) continue;
    const ref = doc(collection(db, 'terms'), entry.existingId);
    const label =
      entry.data.label?.trim() || defaultTermLabel(entry.data.number, entry.data.year);
    const payload = {
      ownerUid,
      disciplineId: entry.data.disciplineId,
      year: entry.data.year,
      number: entry.data.number,
      label,
      startsAt: entry.data.startsAt ?? null,
      endsAt: entry.data.endsAt ?? null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    addOp((b) => b.set(ref, payload));
    createdTerms++;
  }

  // --- Atividades ---
  let createdAssignments = 0;
  for (const entry of diff.assignments) {
    if (entry.status !== 'create' || !entry.data || !entry.existingId) continue;
    if (!entry.data.disciplineId || !entry.data.termId) continue;
    const ref = doc(collection(db, 'assignments'), entry.existingId);
    const payload = {
      ownerUid,
      disciplineId: entry.data.disciplineId,
      termId: entry.data.termId,
      kind: entry.data.kind,
      title: entry.data.title,
      description: entry.data.description ?? null,
      maxScore: entry.data.maxScore,
      mode: entry.data.mode,
      maxGroupSize:
        entry.data.mode === 'group' ? entry.data.maxGroupSize ?? 5 : 1,
      accepts: entry.data.accepts,
      dueAt: entry.data.dueAt ?? null,
      status: entry.data.status ?? 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    addOp((b) => b.set(ref, payload));
    createdAssignments++;
  }

  flush();
  await Promise.all(pending);

  const skipped = [
    ...diff.disciplines,
    ...diff.terms,
    ...diff.assignments,
  ].filter((e) => e.status === 'unchanged' || e.status === 'error').length;

  return {
    created: {
      disciplines: createdDisciplines,
      terms: createdTerms,
      assignments: createdAssignments,
    },
    updated: {},
    skipped,
    durationMs: Date.now() - startedAt,
  };
}
