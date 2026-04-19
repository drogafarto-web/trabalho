import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  StudentSchema,
  DisciplineStudentSchema,
  makeDisciplineStudentId,
  type Student,
  type StudentInput,
  type DisciplineStudent,
  type ParsedRow,
} from '@/core/domain/student';

const STUDENTS = 'students';
const JUNCTION = 'discipline_students';

function parseStudents(snap: QuerySnapshot<DocumentData>): Student[] {
  const out: Student[] = [];
  for (const d of snap.docs) {
    const parsed = StudentSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success) out.push(parsed.data);
    else console.warn(`[students] doc ${d.id} inválido:`, parsed.error.flatten());
  }
  return out;
}

function parseJunctions(snap: QuerySnapshot<DocumentData>): DisciplineStudent[] {
  const out: DisciplineStudent[] = [];
  for (const d of snap.docs) {
    const parsed = DisciplineStudentSchema.safeParse(d.data());
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Listagens
// ---------------------------------------------------------------------------

export async function listStudentsByOwner(ownerUid: string): Promise<Student[]> {
  const q = query(
    collection(db, STUDENTS),
    where('ownerUid', '==', ownerUid),
    where('archivedAt', '==', null),
    orderBy('name', 'asc'),
  );
  return parseStudents(await getDocs(q));
}

export async function listStudentsByDiscipline(disciplineId: string): Promise<DisciplineStudent[]> {
  const q = query(
    collection(db, JUNCTION),
    where('disciplineId', '==', disciplineId),
    orderBy('studentName', 'asc'),
  );
  return parseJunctions(await getDocs(q));
}

// ---------------------------------------------------------------------------
// Criar aluno individual (fora de contexto de disciplina)
// ---------------------------------------------------------------------------

export async function createStudent(
  ownerUid: string,
  input: StudentInput,
): Promise<string> {
  const ref = await addDoc(collection(db, STUDENTS), {
    ownerUid,
    name: input.name,
    email: input.email,
    note: input.note,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStudent(
  id: string,
  patch: Partial<StudentInput>,
): Promise<void> {
  const ref = doc(db, STUDENTS, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveStudent(id: string): Promise<void> {
  const ref = doc(db, STUDENTS, id);
  await updateDoc(ref, {
    archivedAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Junção: vincular aluno à disciplina
// ---------------------------------------------------------------------------

export async function linkStudentToDiscipline(params: {
  ownerUid: string;
  disciplineId: string;
  studentId: string;
  studentName: string;
}): Promise<void> {
  const { ownerUid, disciplineId, studentId, studentName } = params;
  const junctionId = makeDisciplineStudentId(disciplineId, studentId);
  const ref = doc(db, JUNCTION, junctionId);
  await setDoc(ref, {
    ownerUid,
    disciplineId,
    studentId,
    studentName,
    addedAt: serverTimestamp(),
  });
}

export async function unlinkStudentFromDiscipline(
  disciplineId: string,
  studentId: string,
): Promise<void> {
  const junctionId = makeDisciplineStudentId(disciplineId, studentId);
  await deleteDoc(doc(db, JUNCTION, junctionId));
}

// ---------------------------------------------------------------------------
// Importação em lote — cria alunos + junction em 1 batch
// ---------------------------------------------------------------------------

export interface BulkImportResult {
  created: number;
  linked: number;
}

export async function bulkImportStudents(params: {
  ownerUid: string;
  disciplineId: string;
  rowsToCreate: ParsedRow[]; // novos alunos
  existingStudentIdsToLink: Array<{ id: string; name: string }>; // reuso
}): Promise<BulkImportResult> {
  const { ownerUid, disciplineId, rowsToCreate, existingStudentIdsToLink } = params;

  const batch = writeBatch(db);
  let created = 0;
  let linked = 0;

  // 1. Cria novos alunos
  for (const row of rowsToCreate) {
    const studentRef = doc(collection(db, STUDENTS));
    batch.set(studentRef, {
      ownerUid,
      name: row.name,
      email: row.email,
      note: row.note,
      archivedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const junctionRef = doc(
      db,
      JUNCTION,
      makeDisciplineStudentId(disciplineId, studentRef.id),
    );
    batch.set(junctionRef, {
      ownerUid,
      disciplineId,
      studentId: studentRef.id,
      studentName: row.name,
      addedAt: serverTimestamp(),
    });

    created++;
    linked++;
  }

  // 2. Linka alunos existentes (se não linkados ainda)
  for (const { id: studentId, name: studentName } of existingStudentIdsToLink) {
    const junctionRef = doc(
      db,
      JUNCTION,
      makeDisciplineStudentId(disciplineId, studentId),
    );
    batch.set(junctionRef, {
      ownerUid,
      disciplineId,
      studentId,
      studentName,
      addedAt: serverTimestamp(),
    });
    linked++;
  }

  await batch.commit();
  return { created, linked };
}
