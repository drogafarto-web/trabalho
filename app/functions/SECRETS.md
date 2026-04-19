# Secrets — Configuração e Rotação

Este doc explica como funcionam os segredos das Cloud Functions e
como rotacioná-los sem redeploy.

## 🔑 Quais secrets existem

| Nome | Descrição | Usado por |
|---|---|---|
| `GEMINI_API_KEY` | Chave do Google AI Studio para correção de trabalhos | `bootstrapProfessorClaim` (Fase 1), `gradeSubmission` (Fase 5) |

## 📂 Onde os secrets ficam

### Desenvolvimento local (Emulator)

Arquivo: `app/functions/.secret.local` (git-ignored, nunca commitado)

Formato:

```env
GEMINI_API_KEY=sua-chave-aqui
```

O Firebase CLI injeta este arquivo como variável de ambiente quando
você roda `firebase emulators:start`.

### Produção (Cloud Functions)

Armazenado em **Firebase Secret Manager** (Google Cloud Secret Manager
por baixo). Criptografado em repouso, versionado, rotacionável.

## 🔄 Como rotacionar uma chave

### 1. Em produção

```bash
# No diretório app/
firebase functions:secrets:set GEMINI_API_KEY
```

O CLI vai pedir pra você colar a chave nova (input oculto).
Responda `Y` pra confirmar. O Secret Manager cria uma nova versão.

**Nenhum redeploy necessário** — as Functions que declararam o secret
via `defineSecret('GEMINI_API_KEY')` leem automaticamente a nova
versão na próxima invocação.

### 2. Em dev local

Edite `app/functions/.secret.local` e reinicie os emulators.

### 3. Listar versões existentes

```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### 4. Destruir uma chave comprometida

```bash
firebase functions:secrets:destroy GEMINI_API_KEY
```

Remove permanentemente. Só depois de setar uma nova.

## 🛡️ Boas práticas

1. **Jamais colar chave em chat/código** — use `firebase functions:secrets:set`
   que pede input oculto.
2. **Rotacionar ao mínimo sinal de exposição** — chat, screenshot, log.
3. **Usar chaves diferentes em dev e prod** — mesmo que seja "apenas dev",
   a chave de dev pode ter cotas/permissões diferentes.
4. **Restringir chave no Google Cloud Console** — por domínio HTTP referer,
   por IP, ou por API habilitada. Veja
   https://console.cloud.google.com/apis/credentials.
5. **Auditoria**: Google Cloud Console mostra uso da chave em tempo real
   (chamadas, erros, cotas).

## 🧪 Como as Functions consomem o secret

Padrão canônico (ver `src/grading/grade-submission.ts`):

```ts
import { defineSecret } from 'firebase-functions/params';
import { onCall } from 'firebase-functions/v2/https';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const gradeSubmission = onCall(
  {
    region: 'southamerica-east1',
    secrets: [GEMINI_API_KEY], // DECLARAÇÃO obrigatória
    timeoutSeconds: 120,
  },
  async (request) => {
    const key = GEMINI_API_KEY.value(); // Lê no runtime
    // ... usa a chave
  },
);
```

**Nunca** ler `process.env.GEMINI_API_KEY` direto — não funciona em
produção, porque secrets não são variáveis de ambiente convencionais.
