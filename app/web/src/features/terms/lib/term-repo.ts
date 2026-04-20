import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultTermLabel, TermSchema, type Term, type TermInput } from '@/core/domain/term';

const COL = 'terms';

function parseSnapshot(snap: QuerySnapshot<DocumentData>): Term[] {
  const out: Term[] = [];
  for (const d of snap.docs) {
    const parsed = TermSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success) out.push(parsed.data);
    else console.warn(`[terms] doc ${d.id} inválido:`, parsed.error.flatten());
  }
  return out;
}

function sortTerms(items: Term[]): Term[] {
  return items.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.number - b.number;
  });
}

/**
 * Etapas de uma disciplina. Sem orderBy no Firestore (evita índice composto);
 * ordenação client-side. Volume esperado: poucas etapas por disciplina.
 */
export async function listTermsByDiscipline(disciplineId: string): Promise<Term[]> {
  const q = query(collection(db, COL), where('disciplineId', '==', disciplineId));
  const snap = await getDocs(q);
  return sortTerms(parseSnapshot(snap));
}

/**
 * Todas as etapas do professor (todas as disciplinas). Usado apenas pelo fluxo
 * de "copiar etapas de outra disciplina".
 */
export async function listTermsByOwner(ownerUid: string): Promise<Term[]> {
  const q = query(collection(db, COL), where('ownerUid', '==', ownerUid));
  const snap = await getDocs(q);
  return sortTerms(parseSnapshot(snap));
}

export async function createTerm(
  ownerUid: string,
  disciplineId: string,
  input: TermInput,
): Promise<string> {
  const label = input.label?.trim() || defaultTermLabel(input.number, input.year);
  const ref = await addDoc(collection(db, COL), {
    ownerUid,
    disciplineId,
    year: input.year,
    number: input.number,
    label,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Cria várias etapas de uma vez (presets + copiar de outra disciplina).
 * Batch atômico: se uma falha, nenhuma é gravada.
 */
export async function createTermsBatch(
  ownerUid: string,
  disciplineId: string,
  inputs: TermInput[],
): Promise<string[]> {
  if (inputs.length === 0) return [];
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const input of inputs) {
    const ref = doc(collection(db, COL));
    const label = input.label?.trim() || defaultTermLabel(input.number, input.year);
    batch.set(ref, {
      ownerUid,
      disciplineId,
      year: input.year,
      number: input.number,
      label,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ids.push(ref.id);
  }
  await batch.commit();
  return ids;
}

export async function updateTerm(id: string, patch: Partial<TermInput>): Promise<void> {
  const ref = doc(db, COL, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.year !== undefined) data['year'] = patch.year;
  if (patch.number !== undefined) data['number'] = patch.number;
  if (patch.label !== undefined) data['label'] = patch.label;
  if (patch.startsAt !== undefined) data['startsAt'] = patch.startsAt;
  if (patch.endsAt !== undefined) data['endsAt'] = patch.endsAt;
  await updateDoc(ref, data);
}

export async function archiveTerm(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveTerm(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTerm(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
