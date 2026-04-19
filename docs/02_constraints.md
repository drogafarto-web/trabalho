---
doc_id: 02_constraints
version: 1.0.0
depends_on: [FORMULARIO]
priority: P0
purpose: Restrições INEGOCIÁVEIS. Violar qualquer item deste arquivo sem autorização explícita do dono é motivo para halt (ver 05_halt_protocol.md).
---

# 02 — Constraints (Inegociáveis)

> **Para o agente**: Estas NÃO são sugestões. São guard-rails.
> Se o que você vai fazer viola um destes itens, PARE e pergunte.
> "Resolver rápido" não é desculpa para contornar constraint.

---

## 1. Segurança

### S-1 · Zero segredos no cliente
- **Proibido** commitar ou hardcoded: senha, API key de servidor, token,
  JWT secret, chave privada.
- Firebase Web API Key é exceção (é pública por design), mas exige
  Firestore Rules robustas.
- Gemini API Key **sempre no servidor** (Cloud Function + Secret Manager).
- `.env` nunca commitado. `.env.example` sim, com valores fake.

### S-2 · Auth é Firebase Auth + Custom Claims
- Professor: OAuth Google + claim `role: "professor"` setado manualmente.
- Aluno: `signInAnonymously` (sem login visível).
- Claim é validado **nas regras Firestore**, não só no cliente.
- Proibido: role vindo de localStorage, cookie próprio, JWT próprio.

### S-3 · Firestore/Storage rules nunca abertos
- `allow ... if true;` é **bug crítico**. Sempre condicionado a auth.
- Regras ficam em `firestore.rules` e `storage.rules`, versionadas.
- Toda regra tem teste em `@firebase/rules-unit-testing`.

### S-4 · CORS proxies públicos são proibidos
- Trabalhos de alunos contêm PII (nome, email, WhatsApp).
- `corsproxy.io`, `allorigins.win` etc **nunca** podem tocar em dados.
- Download de arquivos do Storage é feito pelo Cloud Function com
  Admin SDK, ou via URL assinada de curta duração (< 5 min).

### S-5 · Sanitização de input
- Nomes de arquivo do upload: sanitizar para `[a-z0-9._-]`, limitar 100 chars.
- Regras custom de disciplina (campo livre): detectar padrões de
  prompt injection (ver `07_examples.md` → `sanitize-custom-rules`).
- Conteúdo do aluno que vai no prompt: **delimitado** com marcadores
  explícitos (`<student_content>...</student_content>`).

### S-6 · Nenhum dado de aluno em logs
- Proibido `console.log(submission)` que vaze PII em produção.
- Logs estruturados via `pino` no servidor — mascarar email/whatsapp.
- Sentry (se usado) com PII scrubber configurado.

---

## 2. Privacidade (LGPD)

### P-1 · Base legal
- Alunos consentem ao enviar (checkbox explícito na F-AL-01).
- Texto do consentimento em `docs/legal/consent.md` (a criar).
- Professor como controlador; dono do app como operador.

### P-2 · Minimização
- Coletar apenas o necessário: nome, email, WhatsApp, trabalho.
- NUNCA CPF, RG, endereço.

### P-3 · Retenção e expurgo
- Trabalhos e notas: 5 anos (prazo legal acadêmico) — configurável.
- Após expurgo: dados anonimizados, só estatística agregada fica.
- Professor pode solicitar expurgo antecipado por aluno.

### P-4 · Direitos do titular
- Endpoint para aluno solicitar cópia dos dados dele (via protocolo).
- Endpoint para solicitar exclusão (via email ao dono).

### P-5 · Terceiros
- Gemini (Google) processa o conteúdo — informar no consentimento.
- Firebase (Google) armazena — informar.
- Qualquer novo terceiro exige atualização do consentimento.

---

## 3. Performance

### Pf-1 · Core Web Vitals (orçamento fixo)
- **LCP** ≤ 1.2s (p75, 4G)
- **INP** ≤ 200ms
- **CLS** ≤ 0.05
- **TTFB** ≤ 400ms

Medição: Firebase Performance Monitoring + manual Lighthouse em CI.

### Pf-2 · Bundle
- JS inicial ≤ 180KB gzipped
- Total de imagens acima da dobra ≤ 100KB
- Fontes: apenas Inter e JetBrains Mono, `font-display: swap`
- Code split por rota

### Pf-3 · Firestore
- Nenhum listener sem filtro (`where`, `limit`)
- Paginação: sempre `startAfter` com cursor, nunca `offset`
- Leituras agregadas pré-computadas em `stats/*` via Cloud Function

### Pf-4 · Gemini
- Sempre `responseMimeType: 'application/json'` + `responseSchema`
- `temperature: 0.1` (consistência)
- Timeout: 90s por chamada
- Retry com backoff exponencial em 429/503

---

## 4. Acessibilidade

### A-1 · WCAG 2.1 nível AA
- Contraste texto/fundo ≥ 4.5:1 (3:1 para texto grande ≥ 18px bold)
- Focus visível em TODOS os elementos interativos
- Todo ícone com `aria-label` ou texto equivalente

### A-2 · Teclado
- 100% das ações acessíveis sem mouse
- `Escape` fecha modais/drawers
- `Cmd+K` / `Ctrl+K` abre command palette
- Skip link no topo da página

### A-3 · Preferências do usuário
- Respeitar `prefers-reduced-motion` (desligar animações)
- Respeitar `prefers-color-scheme` (mas default é dark)
- Respeitar zoom até 200% sem perder funcionalidade

### A-4 · Screen readers
- Testar com NVDA (Windows) e VoiceOver (Mac) as 3 telas principais
- Regions semânticas (`main`, `nav`, `aside`)
- `aria-live="polite"` para notificações

---

## 5. Qualidade de código

### Q-1 · TypeScript strict
- `"strict": true`, `"noUncheckedIndexedAccess": true`,
  `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`
- Zero `any` sem comentário justificando
- Zero `@ts-ignore` sem comentário e issue vinculada

### Q-2 · Lint e formatting
- ESLint com `@typescript-eslint/recommended-strict`
- Prettier com configuração mínima (default + singleQuote)
- Husky + lint-staged em pre-commit

### Q-3 · Testes
- Unit: Vitest. Cobertura mínima para lógica pura: 80%.
- Integration: Firebase Emulator Suite + `@firebase/rules-unit-testing`
- E2E: Playwright para golden paths (envio + publicação)
- Nenhum `describe.skip` ou `it.only` no main

### Q-4 · Commits
- Conventional Commits (`feat:`, `fix:`, `refactor:`, ...)
- Scope com ID da feature quando aplicável: `feat(F-PR-04): ...`
- Sem commits "WIP" ou "fix stuff" no main

### Q-5 · Arquitetura
- Nenhum componente > 400 linhas. Se ultrapassar, decompor.
- Lógica de domínio em `core/` separada de React
- Server-side (Cloud Functions) em `functions/src/`, testável em Node puro

---

## 6. UX world-class (não-negociável)

### UX-1 · Dark mode é default
- Todo componente testado em dark antes de merge
- Light mode é variante opcional, não obrigatória

### UX-2 · Feedback sempre honesto
- Barra de progresso real (bytes enviados), nunca fake
- Mensagem de erro descreve **o que fazer**, não só **o que falhou**
- Skeleton loaders, nunca spinners centrais infinitos

### UX-3 · Nenhum `alert()` ou `confirm()` nativo
- Modais e toasts próprios
- Confirmação destrutiva exige digitar o nome do item (ex: nome da disciplina)

### UX-4 · Velocidade percebida
- Otimistic update onde seguro (publicar nota, editar nome)
- Rollback visual em caso de erro

---

## 7. Observabilidade

### O-1 · Logs estruturados
- JSON logs em Cloud Functions via `pino`
- Nunca log de PII
- Níveis: `debug`, `info`, `warn`, `error`

### O-2 · Métricas
- Firebase Performance + métricas custom:
  - `ai_grading_duration_ms` (histograma)
  - `ai_grading_success_rate`
  - `submission_upload_size_bytes`
  - `similarity_check_duration_ms`

### O-3 · Erros
- Sentry (ou Firebase Crashlytics) com sourcemaps
- PII scrubber ativo
- Alertas por email para taxa de erro > 1%

---

## 8. Custo

### C-1 · Orçamento mensal fixo
- Firebase: ≤ R$ 50/mês até 500 submissões/mês
- Gemini: ≤ R$ 200/mês até 500 submissões/mês
- Alerta de billing configurado em 80% do teto

### C-2 · Controles
- Rate limit por aluno: 3 submissões/hora (evita abuso)
- Rate limit por professor: 100 IA calls/hora
- Arquivos > 45MB rejeitados antes do upload

---

## 9. Processos

### Pc-1 · Zero merge direto no main
- Pull request obrigatório, review humano
- CI verde: lint, type-check, testes, build

### Pc-2 · Deploy
- Staging automático no merge em `main`
- Produção via promoção manual após smoke test
- Rollback em 1 comando (`firebase hosting:rollback`)

### Pc-3 · Changelog
- `CHANGELOG.md` atualizado a cada release
- Versionamento semântico

---

## 10. O que NÃO faremos

Deliberadamente fora do projeto, para manter foco:

- Multi-tenant (um workspace por dono, por enquanto)
- Internacionalização (pt-BR apenas)
- Temas customizáveis (dark + light fixos)
- Editor inline de PDF
- Chat com a IA (é um gradador, não um tutor)
- Microfrontends (monorepo único basta)
