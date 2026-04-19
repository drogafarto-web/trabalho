---
doc_id: 08_glossary
version: 1.0.0
depends_on: [FORMULARIO]
purpose: Vocabulário controlado do projeto. Use estes termos literalmente em código, UI e docs. Uma palavra = um conceito.
---

# 08 — Glossary

> **Para o agente**: Se vai escrever nome de variável, label de UI ou
> nome de campo de schema, consulte aqui PRIMEIRO. Consistência de
> vocabulário é um dos maiores diferenciais de um produto world-class.

---

## A — Domínio acadêmico

### Aluno (`student`)
Pessoa física matriculada em uma disciplina que entrega trabalho.
Pode não ter conta no sistema — identificado por nome dentro de uma lista.

### Avaliação (`evaluation`)
Resultado da correção de um trabalho. Inclui notas por critério,
nota final, respostas e relatório. Duas versões coexistem:
`aiEvaluation` (gerada pela IA) e `finalEvaluation` (após revisão humana).

### Critério (`criterion` / `criteria`)
Item de avaliação da rubrica. Tem `name`, `description`, `weight`.
Ex: `identificacao_clinica`, `ciclo_biologico`.

### Disciplina (`discipline`)
Matéria/curso com rubrica própria. Ex: "PARASITOLOGIA CLÍNICA 2026.1".
**Convenção:** nome sempre em **MAIÚSCULAS** (estilo diário escolar).
O schema aplica `toUpperCase()` no parse. Ver `DisciplineInputSchema`.
**Não confundir** com `course` (Farmácia, Biomedicina).

### Grupo (`group`)
Conjunto de 1 a 3 alunos que entregam um trabalho em conjunto.
Armazenado como `submission.students[]`.

### Nota final (`finalScore`)
Soma das notas por critério. Vai de 0 a 10, com 1 casa decimal.
Só é "oficial" após `status === 'APPROVED'`.

### Peso (`weight`)
Número inteiro de 0 a 10 que indica o máximo de pontos de um critério.
A soma dos pesos de uma rubrica deve ser **exatamente 10**.

### Protocolo (`shortId`)
ID legível dado ao aluno após envio. Formato: `TRAB-XXXX`
(4 caracteres alfanuméricos em maiúsculo, sem 0/O/1/I).

### Pergunta (`question`)
Item a ser respondido pela IA a partir do texto do aluno.
Faz parte da rubrica.

### Revisão (`review`)
Ato do professor de analisar a avaliação da IA e ajustar antes de publicar.
Sempre human-in-the-loop.

### Rubrica (`rubric`)
Conjunto versionado de `criteria` + `questions` + `customRules`
associado a uma disciplina. Congelada no momento da submissão.

### Trabalho (`submission`)
Entrega de um aluno/grupo. Contém arquivo, metadados e avaliações.

---

## B — Ciclo de vida da submissão

### Status (`SubmissionStatus`)
Máquina de estados explícita:

| Status | Significado | Transições válidas |
|---|---|---|
| `WAITING_FOR_AI` | Aluno enviou, aguardando processamento | → `AI_PROCESSING` |
| `AI_PROCESSING` | IA está avaliando agora | → `PENDING_REVIEW`, → `WAITING_FOR_AI` (retry) |
| `PENDING_REVIEW` | IA avaliou, professor precisa revisar | → `APPROVED`, → `REJECTED`, → `WAITING_FOR_AI` (reprocessar) |
| `APPROVED` | Nota publicada | (terminal) |
| `REJECTED` | Trabalho devolvido ao aluno | (terminal) |

---

## C — Ações

### Publicar (`publish`)
Professor confirma nota final → status vira `APPROVED`.
Gera evento `submission.published` no audit log.

### Reprocessar (`reprocess`)
Descarta avaliação atual e volta para `WAITING_FOR_AI`.
Guarda histórico da avaliação anterior.

### Devolver (`return` / `reject`)
Marca como `REJECTED` com justificativa do professor.

### Arquivar (`archive`)
Soft-delete. Campo `archivedAt` preenchido. Registro fica invisível
em listas normais mas disponível em "Arquivo".

### Entregar (`submit`)
Aluno envia trabalho pela primeira vez. Gera `submission.created`.

---

## D — IA e processamento

### Rasterização (`rasterization`)
Converter páginas de PDF em imagens JPEG para enviar ao Gemini
quando o PDF é escaneado/manuscrito (sem texto extraível).

### OCR visual
Leitura de texto de imagem pela IA multimodal (Gemini Vision).
Diferente de OCR tradicional — o modelo interpreta contexto.

### Structured output
Resposta da IA forçada a seguir um JSON Schema.
Reduz parseamento frágil. Implementado via `responseSchema`.

### Shingling
Quebra de texto em n-gramas (janelas de N palavras) para comparação.
Usado na detecção de similaridade.

### Jaccard (coeficiente)
Métrica de similaridade entre dois conjuntos:
`|A ∩ B| / |A ∪ B|`. Vai de 0 a 1.

### Threshold de similaridade
Valor acima do qual dois trabalhos são considerados suspeitos.
Padrão: 0.6.

### Prompt injection
Ataque em que conteúdo do usuário manipula o comportamento do modelo.
Mitigado por sanitização + delimitadores.

---

## E — Infraestrutura

### Claim (`custom claim`)
Campo no JWT do Firebase Auth. Usamos `role: 'professor'` para
autorização server-side.

### Callable (Function)
Cloud Function invocada pelo cliente via SDK (não HTTP raw).
Auth é automática; validação via Zod no input.

### Emulator Suite
Ambiente local que simula Firestore, Auth, Storage, Functions.
Obrigatório para testes de integração.

### Rule (`security rule`)
Expressão em `firestore.rules` / `storage.rules` que autoriza ou nega
acesso no servidor Firebase.

### Trigger (Function)
Cloud Function disparada por evento (`onCreate`, `onUpdate`, `onDelete`
em Firestore ou Storage).

---

## F — UI

### Command palette
Overlay acessível por `Cmd+K` / `Ctrl+K` para buscar e executar ações.

### Dashboard
Tela principal do professor, com tabela de submissões + KPIs.

### Drawer
Painel lateral deslizante. Usado para revisão de submissão. 560px.

### Pill
Chip arredondado (`border-radius: 9999px`). Usado para filtros de disciplina.

### Skeleton
Placeholder visual durante carregamento. Substitui spinner infinito.

### Toast
Notificação temporária no canto inferior direito. Auto-dismiss 4s.

---

## G — Qualidade e operação

### Audit log
Coleção imutável com histórico de ações sensíveis.

### Backoff exponencial
Estratégia de retry: 2s, 4s, 8s, 16s... até desistir.

### Budget (performance / custo)
Limite pré-definido. Ver `02_constraints.md`.

### Golden path
Fluxo principal de uso do produto. Deve funcionar 100% sempre.

### Halt
Ato do agente de parar e pedir confirmação humana. Ver `05_halt_protocol.md`.

### Rate limit
Teto de requisições por janela de tempo. Aplicado ao Gemini (429)
e a endpoints públicos.

### Soft delete
Marcar como deletado via campo (`deletedAt`, `archivedAt`) sem remover
o documento. Reversível.

### Throttle
Limitar frequência de chamadas repetitivas (ex: digitação em campo de busca).

---

## H — Convenções de nomenclatura

### Variáveis
- `camelCase` sempre, inclusive siglas: `userId`, `aiResponse`
- Booleans com verbo: `isLoading`, `hasError`, `canPublish`
- Coleções no plural: `submissions`, `disciplines`
- IDs com sufixo `Id`: `submissionId`, `disciplineId`

### Tipos
- `PascalCase`, sem prefixo `I`: `Submission`, não `ISubmission`
- Enums como string literal union ou `as const` — evitar `enum` do TS

### Arquivos
- Kebab-case: `submission-form.tsx`, `use-submissions.ts`
- Componentes React: `PascalCase.tsx` se for acorde com o projeto

### Firestore
- Coleções: plural, lowercase: `submissions`, `disciplines`
- Campos: camelCase: `submittedAt`, `ownerUid`
- Timestamps: sufixo `At`: `createdAt`, `updatedAt`, `archivedAt`

### Eventos (audit log)
- Formato: `<entity>.<action>`: `submission.published`, `discipline.archived`
- Verbos no particípio passado (representam fato consumado)

---

## I — Anti-termos (não use)

| ❌ Evite | ✅ Use | Motivo |
|---|---|---|
| "usuário" (no contexto professor) | "professor" | Role-specific é mais claro |
| "remover aluno" | "arquivar aluno" | Soft delete é o padrão |
| "correção" | "avaliação" | Termo mais neutro e técnico |
| "nota IA" e "nota real" | "avaliação IA" e "avaliação final" | "Real" sugere que IA é fake |
| "excluir trabalho" | "arquivar trabalho" | Idem remover aluno |
| "senha do admin" | N/A | Não existe — só OAuth Google |
| "login do aluno" | "envio anônimo do aluno" | Aluno não loga |
| "professor logado" | "professor autenticado" | Ninguém "loga", autentica |
| "disciplina ativa" | "disciplina atual" / "vigente" | "Ativa" é ambíguo |

---

## J — Abreviações aceitas

| Sigla | Significado | Contexto |
|---|---|---|
| AI | Artificial Intelligence | Código e docs técnicos |
| IA | Inteligência Artificial | Copy/UI para usuário |
| LGPD | Lei Geral de Proteção de Dados | Sempre em PT |
| OCR | Optical Character Recognition | Uso técnico |
| PR | Pull Request | Commits, CI |
| UID | User Identifier | Firebase Auth |
| WCAG | Web Content Accessibility Guidelines | A11y specs |

Qualquer sigla nova exige registro aqui antes de entrar no código.

---

## K — Perguntas frequentes de nomenclatura

**"Posso chamar de `user` em vez de `professor`?"**
Não, salvo em código verdadeiramente genérico (ex: `AuthUser` para
representar qualquer pessoa autenticada).

**"Criterion ou criteria no nome do campo?"**
Array = `criteria`. Item = `criterion`. Segue inglês.

**"nota_final ou finalScore?"**
Depende da camada:
- Schema do Gemini: `nota_final` (o modelo é PT)
- TypeScript/Firestore: `finalScore` (código é EN)
- UI: "Nota final" (usuário é PT)

A tradução acontece no boundary (código que chama a IA).
