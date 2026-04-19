import { z } from 'zod';

/**
 * Validação de variáveis de ambiente em tempo de boot.
 * Se qualquer variável crítica estiver faltando ou malformada,
 * o app falha cedo com mensagem clara — melhor que runtime error.
 */
const envSchema = z.object({
  FIREBASE_API_KEY: z.string().min(10, 'VITE_FIREBASE_API_KEY inválido'),
  FIREBASE_AUTH_DOMAIN: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  FIREBASE_APP_ID: z.string().min(1),
  USE_EMULATORS: z.boolean(),
  EMULATOR_HOST: z.string().default('127.0.0.1'),
  APP_ENV: z.enum(['staging-mental', 'production']).default('staging-mental'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
});

function parseEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse({
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    USE_EMULATORS: import.meta.env.VITE_USE_EMULATORS === 'true',
    EMULATOR_HOST: import.meta.env.VITE_EMULATOR_HOST,
    APP_ENV: import.meta.env.VITE_APP_ENV,
    SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || undefined,
    SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  });

  if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
    throw new Error('Configuração de ambiente inválida. Veja web/.env.local.');
  }
  return parsed.data;
}

export const env = parseEnv();
