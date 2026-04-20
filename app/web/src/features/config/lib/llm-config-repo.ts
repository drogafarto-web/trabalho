import { doc, getDoc, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type LlmProvider = 'gemini' | 'anthropic' | 'qwen';

export interface LlmConfig {
  provider: LlmProvider;
  model: string | null;
  apiKey: string;
  updatedAt: Timestamp | null;
  updatedByUid: string | null;
}

export interface LlmConfigInput {
  provider: LlmProvider;
  model: string | null;
  apiKey: string;
}

const CONFIG_REF = () => doc(db, 'config', 'llm');

export async function getLlmConfig(): Promise<LlmConfig | null> {
  const snap = await getDoc(CONFIG_REF());
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    provider: (data['provider'] as LlmProvider) ?? 'gemini',
    model: (data['model'] as string | undefined) ?? null,
    apiKey: (data['apiKey'] as string | undefined) ?? '',
    updatedAt: (data['updatedAt'] as Timestamp | undefined) ?? null,
    updatedByUid: (data['updatedByUid'] as string | undefined) ?? null,
  };
}

export async function setLlmConfig(
  input: LlmConfigInput,
  actorUid: string,
): Promise<void> {
  await setDoc(CONFIG_REF(), {
    provider: input.provider,
    model: input.model && input.model.trim().length > 0 ? input.model.trim() : null,
    apiKey: input.apiKey.trim(),
    updatedAt: serverTimestamp(),
    updatedByUid: actorUid,
  });
}
