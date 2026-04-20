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
  type SubmittedUrl,
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

export type SubmissionPayload =
  | { kind: 'file'; file: File }
  | { kind: 'url'; submittedUrl: SubmittedUrl };

/**
 * Orquestra a criação da submissão. Dois caminhos:
 *  - File: upload pro Storage, doc aponta pro storagePath.
 *  - URL: sem upload; doc guarda `submittedUrl` + `file: null`.
 *
 * Se o upload falha, nenhum doc é criado. Se o create falha depois do
 * upload, o arquivo fica órfão no Storage — GC manual fica pra Fase 5.
 */
export async function submitAssignment(params: {
  input: SubmissionInput;
  disciplineOwnerUid: string;
  rubricVersion: number;
  payload: SubmissionPayload;
  onProgress?: (p: UploadProgress) => void;
}): Promise<CreatedSubmission> {
  const { input, disciplineOwnerUid, rubricVersion, payload, onProgress } = params;

  const submissionRef = doc(collection(db, 'submissions'));
  const shortId = generateShortId();

  let fileField: {
    storagePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null = null;
  let urlField: SubmittedUrl | null = null;

  if (payload.kind === 'file') {
    const file = payload.file;
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

    fileField = {
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  } else {
    urlField = payload.submittedUrl;
    onProgress?.({ percent: 100, bytesTransferred: 0, totalBytes: 0 });
  }

  const batch = writeBatch(db);
  batch.set(submissionRef, {
    shortId,
    disciplineId: input.disciplineId,
    disciplineOwnerUid,
    assignmentId: input.assignmentId,
    rubricVersion,
    students: input.students satisfies SubmissionStudentRef[],
    submitter: input.submitter satisfies Submitter,
    file: fileField,
    submittedUrl: urlField,
    status: 'WAITING_FOR_AI',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return { id: submissionRef.id, shortId };
}
