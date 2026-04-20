import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AssignmentSchema,
  type Assignment,
  type AssignmentInput,
} from '@/core/domain/assignment';

const COL = 'assignments';

function parseSnapshot(snap: QuerySnapshot<DocumentData>): Assignment[] {
  const out: Assignment[] = [];
  for (const d of snap.docs) {
    const parsed = AssignmentSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success) out.push(parsed.data);
    else console.warn(`[assignments] doc ${d.id} inválido:`, parsed.error.flatten());
  }
  return out;
}

/**
 * Sem orderBy no Firestore — evita índice composto pra `where + orderBy`.
 * Ordenamos client-side por createdAt desc.
 */
function sortByCreatedDesc(items: Assignment[]): Assignment[] {
  return items.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function listAssignmentsByDiscipline(
  disciplineId: string,
): Promise<Assignment[]> {
  const q = query(collection(db, COL), where('disciplineId', '==', disciplineId));
  const snap = await getDocs(q);
  return sortByCreatedDesc(parseSnapshot(snap));
}

export async function listAssignmentsByOwner(ownerUid: string): Promise<Assignment[]> {
  const q = query(collection(db, COL), where('ownerUid', '==', ownerUid));
  const snap = await getDocs(q);
  return sortByCreatedDesc(parseSnapshot(snap));
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  const parsed = AssignmentSchema.safeParse({ id: snap.id, ...snap.data() });
  return parsed.success ? parsed.data : null;
}

export async function createAssignment(
  ownerUid: string,
  input: AssignmentInput,
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ownerUid,
    disciplineId: input.disciplineId,
    termId: input.termId,
    kind: input.kind,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    maxScore: input.maxScore,
    mode: input.mode,
    maxGroupSize: input.mode === 'group' ? input.maxGroupSize ?? 5 : 1,
    accepts: input.accepts,
    dueAt: input.dueAt ?? null,
    status: input.status ?? 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssignment(
  id: string,
  patch: Partial<AssignmentInput>,
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.termId !== undefined) data['termId'] = patch.termId;
  if (patch.kind !== undefined) data['kind'] = patch.kind;
  if (patch.title !== undefined) data['title'] = patch.title.trim();
  if (patch.description !== undefined) data['description'] = patch.description?.trim() || null;
  if (patch.maxScore !== undefined) data['maxScore'] = patch.maxScore;
  if (patch.mode !== undefined) data['mode'] = patch.mode;
  if (patch.maxGroupSize !== undefined) data['maxGroupSize'] = patch.maxGroupSize;
  if (patch.accepts !== undefined) data['accepts'] = patch.accepts;
  if (patch.dueAt !== undefined) data['dueAt'] = patch.dueAt;
  if (patch.status !== undefined) data['status'] = patch.status;
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
