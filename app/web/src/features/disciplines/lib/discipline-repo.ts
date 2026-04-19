import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DisciplineSchema,
  type Discipline,
  type DisciplineInput,
} from '@/core/domain/discipline';

const COL = 'disciplines';

// ---------------------------------------------------------------------------
// Parser resiliente: lê 1 snapshot e retorna Discipline tipada (ou lança)
// ---------------------------------------------------------------------------
function parseSnapshot(
  snap: QuerySnapshot<DocumentData>,
): Discipline[] {
  const out: Discipline[] = [];
  for (const d of snap.docs) {
    const raw = { id: d.id, ...d.data() };
    const result = DisciplineSchema.safeParse(raw);
    if (result.success) {
      out.push(result.data);
    } else {
      // Loga em dev mas não quebra UI — provavelmente doc antigo/quebrado
      console.warn(`[disciplines] documento ${d.id} inválido:`, result.error.flatten());
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// listByOwner — lista disciplinas do professor (exclui soft-deleted)
// ---------------------------------------------------------------------------
export async function listDisciplinesByOwner(ownerUid: string): Promise<Discipline[]> {
  const q = query(
    collection(db, COL),
    where('ownerUid', '==', ownerUid),
    where('deletedAt', '==', null),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return parseSnapshot(snap);
}

// ---------------------------------------------------------------------------
// getById — busca única disciplina
// ---------------------------------------------------------------------------
export async function getDisciplineById(id: string): Promise<Discipline | null> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const parsed = DisciplineSchema.safeParse({ id: snap.id, ...snap.data() });
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// create — cria nova disciplina (server-side dispara trigger de audit log)
// ---------------------------------------------------------------------------
export async function createDiscipline(
  ownerUid: string,
  input: DisciplineInput,
): Promise<string> {
  const payload = {
    ownerUid,
    name: input.name,
    code: input.code,
    course: input.course,
    period: input.period,
    semester: input.semester,
    rubric: {
      ...input.rubric,
      version: 1, // primeira versão ao criar
    },
    deadline: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

// ---------------------------------------------------------------------------
// update — edita disciplina (bump rubric.version se a rubrica mudou)
// ---------------------------------------------------------------------------
export async function updateDiscipline(
  id: string,
  patch: Partial<DisciplineInput>,
  currentRubricVersion: number,
  rubricChanged: boolean,
): Promise<void> {
  const ref = doc(db, COL, id);
  const updateData: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  if (patch.rubric) {
    updateData['rubric'] = {
      ...patch.rubric,
      version: rubricChanged ? currentRubricVersion + 1 : currentRubricVersion,
    };
  }
  await updateDoc(ref, updateData);
}

// ---------------------------------------------------------------------------
// archive — soft-delete (seta deletedAt)
// ---------------------------------------------------------------------------
export async function archiveDiscipline(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, {
    deletedAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// unarchive — restaura disciplina arquivada
// ---------------------------------------------------------------------------
export async function unarchiveDiscipline(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}
