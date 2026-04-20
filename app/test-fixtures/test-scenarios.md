# Smoke test — cenários end-to-end

Sequência pro agente autônomo executar. Cada cenário tem:

- **Persona** — quem "loga" ou submete
- **Pré-requisitos** — estado do sistema antes
- **Passos** — cliques/inputs concretos
- **Verificações** — o que deve estar verdadeiro no fim

Executar na ordem. Falhas em um cenário não bloqueiam os seguintes, mas
gera log pra review manual.

> **Regra geral:** sempre capture o `TRAB-XXXX` de cada submissão — serve
> pra cruzar com Firestore / dashboard / Resend depois.

---

## 1. Import — Estrutura + Alunos

**Persona:** [Professor](personas/professor.md)
**Pré-requisitos:** login realizado, `/importar` acessível.

**Passos:**
1. Login em `https://trabalhos-e0647.web.app/login` com `drogafarto@gmail.com`.
2. Abre `https://trabalhos-e0647.web.app/importar`.
3. No card **Estrutura**, clica **Baixar template** (testa link funciona).
4. Sobe `test-fixtures/planilhas/estrutura.xlsx`.
5. Aguarda preview aparecer. Verifica:
   - Disciplinas: 2 novas
   - Etapas: 3 novas
   - Atividades: 4 novas
   - Zero erros
6. Clica **Confirmar importação**. Aguarda tela de sucesso.
7. Repete com o card **Alunos** + arquivo `planilhas/alunos.xlsx`.
   - Alunos: 8 novos
   - Matrículas: 12 novas (8 em PARA + 4 em FARM)

**Verificações:**
- `/disciplinas` lista `PARASITOLOGIA CLÍNICA` e `FARMACOLOGIA CLÍNICA`.
- Abrindo `PARA-2026.1` mostra 2 etapas e 2 atividades.
- `/alunos` → filtrando por `PARA-2026.1` mostra 8 alunos.

---

## 2. Submissão — Trabalho em grupo, PDF bom

**Persona:** [João](personas/aluno-joao.md)
**Pré-requisitos:** cenário 1 concluído.

**Passos:**
1. Abre **janela anônima** em `https://trabalhos-e0647.web.app/`.
2. Seleciona disciplina `Parasitologia Clínica · 2026.1`.
3. Atividade: `Trabalho — Revisão narrativa sobre Leishmaniose visceral`.
4. Adiciona integrantes: JOÃO, MARIA, PEDRO.
5. WhatsApp `31988001234`, email real do agente.
6. Avança → Step 2: confirma que toggle Arquivo/Link aparece, deixa em **Arquivo**.
7. Sobe `trabalhos/leishmaniose-grupo.pdf`.
8. Avança → confirma revisão → **Enviar trabalho**.
9. Salva o `TRAB-XXXX` mostrado na tela de sucesso.

**Verificações:**
- Email chega em ≤30 s com protocolo e link de download (se Resend ok).
- Após ~60 s, `/dashboard` do professor mostra a submission com status
  `PENDING_REVIEW`.
- Abrindo a submissão no dashboard, `ai.evaluation.finalScore` (0-10) ≥ 7.0
  e `scaledScore` (0-8) ≥ 5.6.

---

## 3. Submissão — Trabalho individual fraco

**Persona:** [Lucas](personas/aluno-lucas.md)

**Passos idem cenário 2**, exceto:
- Aluno único: LUCAS MARTINS SOUZA
- Arquivo: `trabalhos/leishmaniose-ruim.pdf`

**Verificações:**
- `finalScore` (0-10) ≤ 4.0.
- `ai.evaluation.report` menciona superficialidade e/ou ausência de referências.

---

## 4. Submissão — AECO individual, PDF

**Persona:** [Maria](personas/aluno-maria.md)

**Passos:**
1. Janela anônima → disciplina PARA → atividade `AECO — Caso clínico parasitário`.
2. Confirma que:
   - Step 2 **não mostra toggle** (atividade só aceita arquivo).
   - Form de integrantes aceita apenas 1 aluno.
3. Aluno: MARIA DA SILVA SANTOS.
4. Sobe `trabalhos/aeco-caso-clinico.pdf`.

**Verificações:**
- Submissão ok, status vira `PENDING_REVIEW`.
- `finalScore` (0-10) coerente com qualidade do caso (≥ 6.0).
- `scaledScore` está na faixa 0–2 (maxScore da AECO).
- `maxScore` gravado no doc = 2.

---

## 5. Submissão — AECO com DOCX (Fase 4.2)

**Persona:** [Ana](personas/aluno-ana.md)

**Passos idem cenário 4**, exceto:
- Aluno: ANA CLARA OLIVEIRA
- Arquivo: `trabalhos/aeco-caso-clinico.docx`

**Verificações:**
- Dropzone aceita `.docx` sem erro de mime.
- Firestore doc: `file.mimeType` é `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- `ai.evaluation` populado (indica que mammoth extraiu texto com sucesso).

---

## 6. Submissão — URL YouTube (Fase 4.3)

**Persona:** [Aluno YouTube](personas/aluno-youtube.md)

**Passos:**
1. Janela anônima → disciplina PARA → atividade `Trabalho — Leishmaniose visceral`.
2. Alunos: ISABELA + BRUNO.
3. Step 2: troca toggle pra **Link**.
4. Cola URL de YouTube real (ver nota na persona).
5. Confirma que aparece o feedback verde "Link do YouTube reconhecido".
6. Envia.

**Verificações:**
- Firestore doc: `file == null`, `submittedUrl.url` preenchido, `submittedUrl.kind == 'youtube'`.
- Status vira `PENDING_REVIEW`.
- `ai.evaluation` populado com análise coerente com o vídeo.
- Recibo no email menciona "Link entregue" e CTA é "Abrir link enviado".
- No dashboard, o ReviewDrawer mostra card com URL clicável (sem tentar preview PDF).

---

## 7. Revisão e publicação

**Persona:** [Professor](personas/professor.md)

**Passos:**
1. Login como professor → `/dashboard`.
2. Para cada submissão dos cenários 2–6, abre a gaveta de revisão.
3. Revisa a avaliação da IA, ajusta nota se quiser, escreve feedback curto e clica **Publicar**.

**Verificações:**
- Status de cada submission vira `APPROVED`.
- `review.reviewedByUid` == UID do professor.
- `review.finalEvaluation.finalScore` presente.
- `/relatorios` mostra todas as entregas publicadas.

---

## 8. Duplicata — Import roda duas vezes

**Persona:** Professor.

**Passos:**
1. `/importar` → sobe novamente `planilhas/estrutura.xlsx`.
2. Observa o preview.

**Verificações:**
- Todas as 2 disciplinas viram **"2 já existe"**.
- Todas as etapas e atividades viram unchanged.
- Botão **Confirmar importação** fica desabilitado (nada pra criar).
- Repete pra `alunos.xlsx` → mesmo comportamento.

---

## 9. Lock de atividade — aluno tenta reenviar

**Persona:** Lucas (do cenário 3).

**Passos:**
1. Janela anônima → repete cenário 3 (mesmo aluno, mesma atividade, qualquer arquivo).

**Verificações:**
- Form **aceita** a submissão (o lock só é verificado server-side).
- Protocolo novo `TRAB-XXXX` é gerado.
- Em ≤10 s, no dashboard do professor, essa submissão nova aparece com status **`REJECTED`**.
- `review.professorFeedback` começa com `"LUCAS MARTINS SOUZA já entregou esta atividade..."`.
- Logs da Cloud Function (`firebase functions:log --only onSubmissionCreated`) mostram `[trigger] conflito de lock`.

---

## 10. Casos de form inválido

**Persona:** qualquer aluno.

**Casos a exercitar:**
1. URL não-YouTube (ex: `https://vimeo.com/123`) — botão "Próximo" desabilitado com mensagem.
2. WhatsApp com menos de 10 dígitos — erro no campo.
3. Email malformado (`aluno@`) — erro no campo.
4. Arquivo `.exe` ou `.txt` não listado — Dropzone rejeita com "Formato não aceito".
5. Arquivo > 45 MB — rejeição no Dropzone.

---

## 11. Smoke final — integrity check

**Persona:** Professor.

Confirma que nada ficou em estado inconsistente:
- `/dashboard` não mostra IntegrityBanner (fixture populado deve casar com schemas).
- `/config` → provider configurado é Gemini (pré-requisito do cenário 6).
- Firestore console → coleções `submissions`, `assignment_locks`, `mail_events` têm docs coerentes com os testes acima.
