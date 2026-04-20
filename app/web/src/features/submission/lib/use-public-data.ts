import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DisciplineSchema, type Discipline } from '@/core/domain/discipline';
import {
  DisciplineStudentSchema,
  type DisciplineStudent,
} from '@/core/domain/student';
import { AssignmentSchema, type Assignment } from '@/core/domain/assignment';
import { TermSchema, type Term } from '@/core/domain/term';

/**
 * Lista TODAS as disciplinas ativas (públicas, leitura aberta via rules).
 * Usado no combobox de seleção do aluno no form público.
 * Retorna apenas campos mínimos necessários.
 */
export function usePublicDisciplines() {
  return useQuery({
    queryKey: ['public', 'disciplines'],
    queryFn: async (): Promise<Discipline[]> => {
      const q = query(
        collection(db, 'disciplines'),
        where('deletedAt', '==', null),
        orderBy('name', 'asc'),
      );
      const snap = await getDocs(q);
      const out: Discipline[] = [];
      for (const d of snap.docs) {
        const parsed = DisciplineSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) out.push(parsed.data);
      }
      return out;
    },
    staleTime: 60_000,
  });
}

/**
 * Busca uma disciplina específica (para extrair rubricVersion ao enviar).
 */
export function usePublicDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId ? ['public', 'discipline', disciplineId] : ['public', 'discipline', 'none'],
    queryFn: async (): Promise<Discipline | null> => {
      if (!disciplineId) return null;
      const snap = await getDoc(doc(db, 'disciplines', disciplineId));
      if (!snap.exists()) return null;
      const parsed = DisciplineSchema.safeParse({ id: snap.id, ...snap.data() });
      return parsed.success ? parsed.data : null;
    },
    enabled: !!disciplineId,
  });
}

/**
 * Lista alunos vinculados a uma disciplina (leitura pública via rules).
 * Usado pra popular combobox de nomes depois que o aluno escolhe a disciplina.
 */
export function usePublicStudentsByDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? ['public', 'students', disciplineId]
      : ['public', 'students', 'none'],
    queryFn: async (): Promise<DisciplineStudent[]> => {
      if (!disciplineId) return [];
      const q = query(
        collection(db, 'discipline_students'),
        where('disciplineId', '==', disciplineId),
        orderBy('studentName', 'asc'),
      );
      const snap = await getDocs(q);
      const out: DisciplineStudent[] = [];
      for (const d of snap.docs) {
        const parsed = DisciplineStudentSchema.safeParse(d.data());
        if (parsed.success) out.push(parsed.data);
      }
      return out;
    },
    enabled: !!disciplineId,
    staleTime: 30_000,
  });
}

/**
 * Atividades abertas de uma disciplina (leitura pública via rules).
 * Ordenação client-side por createdAt desc — evita índice composto.
 */
export function usePublicOpenAssignments(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? ['public', 'assignments', disciplineId]
      : ['public', 'assignments', 'none'],
    queryFn: async (): Promise<Assignment[]> => {
      if (!disciplineId) return [];
      const q = query(
        collection(db, 'assignments'),
        where('disciplineId', '==', disciplineId),
        where('status', '==', 'open'),
      );
      const snap = await getDocs(q);
      const out: Assignment[] = [];
      for (const d of snap.docs) {
        const parsed = AssignmentSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) out.push(parsed.data);
      }
      return out.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    },
    enabled: !!disciplineId,
    staleTime: 30_000,
  });
}

/**
 * Etapas de uma disciplina (leitura pública via rules) — usadas pra agrupar
 * atividades no form do aluno.
 */
export function usePublicTermsByDiscipline(disciplineId: string | null) {
  return useQuery({
    queryKey: disciplineId
      ? ['public', 'terms', disciplineId]
      : ['public', 'terms', 'none'],
    queryFn: async (): Promise<Term[]> => {
      if (!disciplineId) return [];
      const q = query(
        collection(db, 'terms'),
        where('disciplineId', '==', disciplineId),
      );
      const snap = await getDocs(q);
      const out: Term[] = [];
      for (const d of snap.docs) {
        const parsed = TermSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) out.push(parsed.data);
      }
      return out.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return a.number - b.number;
      });
    },
    enabled: !!disciplineId,
    staleTime: 60_000,
  });
}
