import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { generateShortId } from './short-id';
import {
  fileExtension,
  sanitizeFileName,
  type SubmissionInput,
  type SubmissionStudentRef,
  type Submitter,
} from '@/core/domain/submission';

export interface CreatedSubmission {
  id: string;
  shortId: string;
}

export interface UploadProgress {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

/**
 * Orquestra: (1) gera ID, (2) upload com progresso, (3) cria doc.
 * Se o upload falha, nenhum doc é criado (não polui o Firestore).
 * Se o create falha depois do upload, o arquivo fica no Storage
 * — GC manual via Cloud Function na Fase 5 (detecta órfãos > 1h).
 */
export async function submitAssignment(params: {
  input: SubmissionInput;
  disciplineOwnerUid: string;
  rubricVersion: number;
  file: File;
  onProgress?: (p: UploadProgress) => void;
}): Promise<CreatedSubmission> {
  const { input, disciplineOwnerUid, rubricVersion, file, onProgress } = params;

  // 1. Gera IDs
  const submissionRef = doc(collection(db, 'submissions'));
  const shortId = generateShortId();

  // 2. Upload
  const ext = fileExtension(file.name) || 'bin';
  const cleanName = sanitizeFileName(file.name);
  const storagePath = `submissions/${submissionRef.id}/original_${cleanName}.${ext}`;
  const uploadRef = storageRef(storage, storagePath);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(uploadRef, file, {
      contentType: file.type,
    });

    task.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => {
        onProgress?.({
          percent: Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
          bytesTransferred: snap.bytesTransferred,
          totalBytes: snap.totalBytes,
        });
      },
      (err) => reject(err),
      () => resolve(),
    );
  });

  // 3. Create doc (batch garante atomicidade em relação a possíveis junções futuras)
  const batch = writeBatch(db);
  batch.set(submissionRef, {
    shortId,
    disciplineId: input.disciplineId,
    disciplineOwnerUid,
    rubricVersion,
    students: input.students satisfies SubmissionStudentRef[],
    submitter: input.submitter satisfies Submitter,
    file: {
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
    status: 'WAITING_FOR_AI',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return { id: submissionRef.id, shortId };
}
