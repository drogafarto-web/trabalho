# Setup de email transacional — Resend

Checklist operacional pra habilitar envio de recibos aos alunos em produção.

**Decisão:** compartilhar o domínio `app.labclinmg.com.br` (já verificado pelo
HC Quality) em vez de criar `trabalhos.labclinmg.com.br`. Tradeoff: reputação
de entregabilidade compartilhada. Mitigação: API key própria (domain-scoped),
alias único (`trabalhos@`) pra diferenciar no inbox do destinatário.

## 1. DNS

**Pular.** O domínio `app.labclinmg.com.br` já está verificado no Resend
(região sa-east-1) pelo projeto HC Quality. SPF, DKIM e MX já configurados
no Hostinger.

Opcional: se ainda não existir, adicionar DMARC no subdomínio:

```text
_dmarc.app    TXT    v=DMARC1; p=none; rua=mailto:drogafarto@gmail.com; pct=100
```

Se o HC Quality já colocou DMARC, mantém como está.

## 2. Criar API key no Resend

Mesma dashboard do outro projeto (<https://resend.com/api-keys>). Cria uma
**nova key exclusiva** pro `trabalhos-e0647` — não reaproveita a do HC
Quality pra ter isolamento de blast radius.

- Name: `trabalhos-e0647`
- Permission: **Sending access** (não full)
- Domain: restringe a `app.labclinmg.com.br`
- Copia o valor (começa com `re_...`) — vai ser usado no passo 3

## 3. Setar secrets no Firebase

Dois secrets. O webhook secret pode receber um placeholder agora e ser
atualizado depois do deploy (ver passo 5).

```bash
cd app/functions

firebase functions:secrets:set RESEND_API_KEY --project trabalhos-e0647
# cola o valor re_... e enter

firebase functions:secrets:set RESEND_WEBHOOK_SECRET --project trabalhos-e0647
# temporário: cola qualquer coisa tipo "placeholder-update-after-deploy"
```

Verifica que existem:

```bash
firebase functions:secrets:access RESEND_API_KEY --project trabalhos-e0647
```

## 4. Deploy functions

```bash
cd app
firebase deploy --only functions --project trabalhos-e0647
```

Isso publica:

- Trigger `onSubmissionCreated` com envio de recibo
- Endpoint `resendWebhook` (URL fica visível na saída do deploy)
- Grading atualizado (Fase 4.1 maxScore + 4.2 docx + 4.3 URL/YouTube)

Anota a URL do webhook que aparece na saída — algo tipo
`https://resendwebhook-<hash>-sa.a.run.app`.

## 5. Configurar webhook no Resend

1. <https://resend.com/webhooks> → **Add Webhook**
2. Endpoint: URL do passo 4
3. Events: marcar **Email Delivered**, **Email Bounced**, **Email Complained**
4. Copia o **Signing Secret** (começa com `whsec_...`)
5. Atualiza o secret no Firebase com o valor real:

   ```bash
   cd app/functions
   firebase functions:secrets:set RESEND_WEBHOOK_SECRET --project trabalhos-e0647
   # cola o whsec_...
   ```

6. Redeploy apenas o webhook pra pegar o novo secret:

   ```bash
   cd app
   firebase deploy --only functions:resendWebhook --project trabalhos-e0647
   ```

## 6. Smoke test

1. Janela anônima → https://trabalhos-e0647.web.app/
2. Envia um trabalho com **seu email** em `E-mail institucional`
3. Confirma:
   - Recibo de `Controle de Trabalhos <trabalhos@app.labclinmg.com.br>` chega em ≤30s
   - Dashboard do Resend mostra o envio + tags `module=submission_receipt`
   - Firestore → `mail_events/` tem doc `submission_receipt.sent`
   - Em ~5s após delivered, webhook popula evento `email.delivered`

## Gotchas

- **Secret scoping:** cada function que manda email precisa declarar
  `secrets: [RESEND_API_KEY]` nas options. Hoje só o trigger
  `onSubmissionCreated` envia. Adicionar futuras chamadas requer incluir
  o secret na lista daquela function.
- **Idempotência:** `receipt_{submissionId}` — retries da trigger não
  duplicam email.
- **Bounce duro:** webhook popula `mail_suppressions/`. O sistema ainda
  **não bloqueia** envios pra emails supprimidos — fica como débito
  quando a lista crescer.
- **Reputação compartilhada:** alunos que marcam spam afetam a reputação
  do HC Quality também (mesmo domínio). Monitora via dashboard do Resend.
- **Recibo em grupo:** hoje só o `submitter.email` recebe. Integrantes
  não recebem. Se quiser mudar, precisa capturar emails de cada integrante
  no form.
