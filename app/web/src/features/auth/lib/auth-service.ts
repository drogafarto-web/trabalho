import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

type BootstrapResult =
  | { ok: true; role: 'professor' }
  | { ok: false; error: 'NOT_ALLOWLISTED' };

export async function bootstrapClaim(): Promise<BootstrapResult> {
  const fn = httpsCallable<undefined, BootstrapResult>(
    functions,
    'bootstrapProfessorClaim',
  );
  const res = await fn();
  return res.data;
}

/**
 * Força refresh do ID Token para carregar claims recém-concedidas.
 */
export async function refreshToken(user: User): Promise<{ role: string | null }> {
  const result = await user.getIdTokenResult(true);
  const role = (result.claims['role'] as string | undefined) ?? null;
  return { role };
}
