---
doc_id: 01_spec
version: 1.0.0
depends_on: [FORMULARIO]
read_before: [02_constraints, 04_schema_json]
purpose: Especificação funcional completa. Define O QUE o sistema faz. Não trata de COMO (isso é stack) nem de LIMITES (isso é constraints).
---

# 01 — Especificação Funcional

## 0. Como usar este doc

Cada **feature** tem:
- **ID** estável (ex: `F-AL-01`)
- **Fluxo principal** em prosa
- **Regras de negócio** em bullets
- **Estados** possíveis
- **Critérios de aceite** testáveis

Se você é um agente implementando uma feature, copie o ID no commit
para rastreabilidade (ex: `feat(F-PR-07): CRUD de disciplinas`).

Legenda de prefixos:
- `F-AL-*` → Feature do Aluno
- `F-PR-*` → Feature do Professor
- `F-SYS-*` → Feature de sistema (transversal)

---

## Parte I — Visão do Aluno

### F-AL-01 · Formulário de entrega

**Fluxo principal**
O aluno acessa a URL pública, escolhe a disciplina, informa seu nome
(e opcionalmente colegas de grupo), contato, faz upload do arquivo e
confirma. Recebe um código de protocolo.

**Regras**
- Sem login. Sessão anônima via Firebase Auth `signInAnonymously`.
- Seleção de disciplina popula dinamicamente a lista de nomes.
- Nomes são escolhidos de uma lista curada (combobox com busca fuzzy).
- Grupo permite 1 a 3 alunos. Adicionar colega é opcional.
- WhatsApp obrigatório (formato BR, validação `/^\+?55?\d{10,11}$/`).
- Email obrigatório (preferência institucional, mas não bloqueia `@gmail`).
- Arquivo: PDF, JPG, PNG, até 45MB. Validado no cliente E no Storage rule.
- Após submeter, aluno recebe `submissionId` curto legível (ex: `TRAB-7F3K`).

**Estados da tela**
- `idle` → formulário limpo
- `validating` → validação inline em tempo real
- `uploading` → barra de progresso real (não spinner)
- `success` → tela de confirmação com ID e opção "nova entrega"
- `error_network` → retry button
- `error_duplicate` → "já há entrega sua para esta disciplina" (com ID)
- `error_deadline` → se disciplina tem prazo, bloqueio claro

**Critérios de aceite**
- [ ] Funciona em iPhone SE (375px) sem scroll horizontal
- [ ] Upload progress real via `uploadBytesResumable`
- [ ] Validação não permite submissão sem campos obrigatórios
- [ ] Duplicata detectada antes do upload (economiza banda)
- [ ] ID de protocolo é legível e copiável em um tap

---

### F-AL-02 · Consulta por protocolo (opcional v2.1)

**Fluxo**
Aluno cola o `TRAB-XXXX` em uma página de consulta e vê:
status atual, data de entrega, e — se aprovado — a nota final.

**Regras**
- NÃO mostra feedback do professor por este canal (evita tensão em sala).
- NÃO mostra nomes de outros alunos do grupo.
- Rate limit: 10 consultas por IP por minuto.

---

## Parte II — Visão do Professor

### F-PR-01 · Autenticação

**Fluxo**
Professor acessa `/login`, clica "Entrar com Google", OAuth flow,
é verificado contra coleção `professors` no Firestore (claim
`role: professor` no JWT). Redirecionado para `/dashboard`.

**Regras**
- Apenas Firebase Auth com OAuth Google. **Zero senha em código.**
- Primeiro acesso requer claim customizado ser setado manualmente
  (via Cloud Function admin) pelo dono do produto.
- Sessão expira em 7 dias, renovável silenciosamente.
- Logout limpa IndexedDB e cookies do Firebase.

**Critérios de aceite**
- [ ] Usuário sem claim vê tela "Acesso não autorizado" e email de contato
- [ ] Claim é verificado no **servidor** (security rules), não só client
- [ ] Session token revogável via Firebase Console

---

### F-PR-02 · Dashboard de submissões

**Fluxo**
Lista paginada de trabalhos com filtros por disciplina, status,
período. Tabela densa (não cards). Clique abre drawer lateral.

**Regras**
- Carregar apenas trabalhos das disciplinas do professor logado
  (query filtrada, não client-side filter).
- Paginação: 50 por página via `startAfter` cursor do Firestore.
- Real-time apenas na página visível (não em todas).
- Ordenação padrão: mais recente primeiro. Cabeçalhos clicáveis.
- Estados da submissão com dot colorido + label.

**KPIs no topo**
- Total de trabalhos (da disciplina filtrada)
- Aguardando IA
- Pendentes de revisão humana
- Média da turma (apenas dos aprovados)

**Critérios de aceite**
- [ ] Filtro por disciplina atualiza KPIs em < 200ms
- [ ] Cmd+K abre busca global
- [ ] Paginação mantém estado ao voltar do drawer

---

### F-PR-03 · Revisão de trabalho (drawer lateral)

**Fluxo**
Clique em linha da tabela abre drawer direito de 560px com:
preview do documento, texto extraído (OCR), rubrica editável,
scores de plágio, campo de feedback, 3 ações.

**Regras**
- Preview do PDF via iframe ou `react-pdf` — nunca baixa para cliente.
- Texto OCR toggleable (colapsado por padrão).
- Cada critério da rubrica é um slider:
  - valor da IA mostrado em cinza atrás
  - valor editado em azul
  - soma atualiza em tempo real
  - se professor altera, flag `manually_adjusted: true`
- Feedback suporta markdown simples (bold, italic, list).
- Ações:
  - `Devolver para refazer` → status REJECTED + notificação (futuro)
  - `Reprocessar com IA` → descarta avaliação e volta para fila
  - `Publicar nota` → status APPROVED, grava audit log

**Critérios de aceite**
- [ ] Ajuste manual preservado mesmo se professor fecha drawer sem salvar
- [ ] "Publicar" pede confirmação se nota difere da IA em > 3 pontos
- [ ] Audit log registra: quem publicou, quando, nota IA vs nota final

---

### F-PR-04 · Gestão de disciplinas (CRUD) `NOVO NO V2`

**Fluxo**
Aba "Disciplinas" na sidebar. Grid de cards. Botão "+ Nova disciplina"
abre modal em 3 abas: Info · Rubrica · Perguntas · Regras custom.

**Regras — Criar/Editar**
- Nome (obrigatório, único por professor+período)
- Código (auto-gerado: `PARA-2026.1`, editável)
- Curso (select de `Farmácia | Biomedicina | outro`)
- Período (select de `1º | 2º | ... | 10º`)
- Ano/semestre (YYYY.N)

**Regras — Rubrica**
- Tabela editável de critérios: `nome`, `descricao`, `peso`
- Peso é número inteiro de 0 a 10
- Soma dos pesos deve ser **exatamente 10**
  - UI mostra soma em tempo real com alerta se ≠ 10
  - Salvar bloqueado se ≠ 10
- Drag para reordenar
- Mínimo 2 critérios, máximo 10

**Regras — Perguntas**
- Lista de perguntas que a IA deve responder a partir do texto do aluno
- Mínimo 1, máximo 10
- Drag para reordenar

**Regras — Regras custom (opcional)**
- Textarea mono-space para instruções adicionais ao system prompt
- Contador de tokens (limite: 2000 tokens)
- Preview: "como fica no prompt final"
- **Sanitização:** detectar tentativas de prompt injection
  (ver `07_examples.md` → padrão "sanitize-custom-rules")

**Regras — Exclusão**
- Soft-delete por padrão (campo `deletedAt`)
- Só pode excluir definitivamente se não houver submissões vinculadas
- Exclusão com submissões = arquivamento (visível em "Arquivo")

**Critérios de aceite**
- [ ] Criar disciplina, adicionar critérios, salvar → aparece no grid
- [ ] Tentar salvar com soma ≠ 10 → botão desabilitado com tooltip
- [ ] Editar rubrica de disciplina com submissões → versão antiga
      preservada nas submissões antigas (copy-on-write)

---

### F-PR-05 · Gestão de alunos (CRUD) `NOVO NO V2`

**Fluxo**
Aba "Alunos", dentro do contexto de uma disciplina. Tabela.
Toolbar com "+ Adicionar", "Importar", "Exportar CSV".

**Regras — Modelo**
- Aluno pertence a 1+ disciplinas (many-to-many via junction)
- Campos: `name` (obrigatório, uppercase), `email` (opcional),
  `note` (texto livre, opcional)

**Regras — Importar lista**
Modal com 2 abas:
- **Colar texto**: textarea, um nome por linha
  - Parser ignora linhas vazias
  - Trim automático
  - Opção "converter para MAIÚSCULAS" (default: on)
  - Opção "remover acentos para comparação" (default: off)
  - Detecta duplicatas internas no input
- **CSV**: upload de .csv com colunas `name,email?,note?`
  - Preview antes de confirmar
  - Erros por linha (email inválido, nome vazio)

Após parse, mostrar diff:
- X novos (serão adicionados)
- Y já existiam (serão ignorados)
- Z com conflito (mesmo nome, email diferente — pedir decisão)

**Regras — Editar**
- Alterar nome **não** propaga para submissões antigas
- Excluir aluno com submissões = marca `archived: true`

**Critérios de aceite**
- [ ] Colar 100 nomes → processar em < 500ms
- [ ] Diff exibido antes de confirmar importação
- [ ] Após importar, combobox do aluno (F-AL-01) reflete em tempo real

---

### F-PR-06 · Relatórios e exportação

**Fluxo**
Aba "Relatórios". Filtros de disciplina + período. Toggle de visualização.

**3 Visualizações**
1. **Por aluno** — tabela individual (explodindo grupos)
2. **Por grupo** — tabela com grupo inteiro, nota compartilhada
3. **Por critério** — heatmap alunos × critérios, cor por desempenho

**Exportações**
- CSV com BOM UTF-8 e delimitador `;` (Excel-BR)
- Ordem das colunas: `disciplina;aluno;curso;periodo;nota_final`
- Nota formatada com vírgula (padrão BR): `7,5` não `7.5`
- Layout de impressão A4 (tipografia serif, preto e branco)

**Critérios de aceite**
- [ ] CSV abre no Excel-BR sem corromper acentos
- [ ] Impressão A4 não quebra em cabeçalhos
- [ ] Heatmap é acessível (aria-label em cada célula)

---

### F-PR-07 · Processamento em lote

**Fluxo**
Botão no dashboard: "Processar pendentes em lote".
Dispara Cloud Function que processa fila com concorrência limitada.

**Regras**
- Concorrência máxima: 3 chamadas simultâneas ao Gemini
- Delay mínimo: 1.5s entre chamadas (pacing)
- Se rate limit (429), backoff exponencial: 2s, 4s, 8s, 16s, desiste
- UI mostra progresso real: X de Y, erros separados
- Pode ser cancelado (flag `batch_cancelled` no documento de controle)
- **Executado no servidor, não no cliente** (Cloud Function)

**Critérios de aceite**
- [ ] 50 trabalhos processam em < 3 min (limitado pela IA)
- [ ] Cancelar no meio para a fila; trabalhos já processados ficam
- [ ] Falha em 1 trabalho não trava os próximos

---

## Parte III — Sistema (transversal)

### F-SYS-01 · OCR e extração de texto

**Fluxo**
1. PDF digital → `pdf.js` extrai texto (primeiras 30 páginas)
2. Se texto < 100 chars → fallback: rasterizar páginas
3. Rasterização: JPEG qualidade 0.6, scale 1.5, máx 8 páginas
4. Envia texto ou lista de imagens para Gemini
5. Gemini retorna JSON estruturado (schema fixo)

**Regras**
- Execução no servidor (Cloud Function), não no cliente
- Se truncar (> 30 páginas), **avisar o professor explicitamente**
  no campo `truncation_notice` da avaliação
- OCR é re-executável (botão "Reprocessar")

---

### F-SYS-02 · Detecção de similaridade entre grupos

**Fluxo**
Após cada novo documento processado, Cloud Function calcula
similaridade Jaccard via shingling (tamanho 5) contra TODOS os
outros da mesma disciplina+período.

**Regras**
- Shingles de 5 palavras, minúsculas, sem stopwords
- Threshold de alerta: Jaccard ≥ 0.6
- Score persistido em `submissions/{id}/similarity_matches[]`
- Dashboard mostra banner se houver matches
- Cálculo é server-side (evita carregar documentos no cliente)

---

### F-SYS-03 · Auditoria (audit log)

**Fluxo**
Toda ação sensível grava linha em coleção `audit_log`.

**Eventos**
- `submission.created` — aluno enviou
- `submission.graded_by_ai` — IA avaliou
- `submission.published` — professor publicou
- `submission.rejected` — professor devolveu
- `submission.deleted` — quem, quando, motivo
- `discipline.created / updated / archived`
- `student.imported` (quantos, de onde)
- `auth.professor_login / logout`

**Regras**
- Imutável (regra `allow update: if false`)
- Retenção: 2 anos
- Exportável para o dono via Cloud Function

---

## Parte IV — Não-escopo (v2)

Deliberadamente **fora** do escopo v2 (para não poluir a roadmap):
- App mobile nativo
- Integração com sistema acadêmico da universidade
- Comentários inline no PDF (estilo Google Docs)
- Notificação push para alunos
- IA com streaming (vale para v2.1)
- Multi-tenant (vários professores independentes no mesmo app)

Se alguma dessas aparecer como pedido, ver `05_halt_protocol.md` §
"Scope creep".
