---
doc_id: FORMULARIO
version: 1.0.0
owner: drogafarto@gmail.com
last_updated: 2026-04-19
status: canonical
purpose: Entry point e índice mestre para todo agente (Claude Code, Opus, Sonnet) que for trabalhar neste projeto. Lê este arquivo PRIMEIRO.
---

# FORMULARIO.md — Briefing Master

> **Para o agente**: Este é o documento-raiz. Leia este arquivo inteiro
> antes de qualquer outra ação. Os demais arquivos (`01_spec.md` até
> `08_glossary.md`) são aprofundamentos. Se você está aqui pela primeira
> vez, carregue também `02_constraints.md` e `05_halt_protocol.md` —
> eles contêm as regras **inegociáveis**.

---

## 1. Identidade do projeto

| Campo | Valor |
|---|---|
| Nome | Controle de Trabalhos |
| Tagline | Avaliação acadêmica com IA, com o professor no controle |
| Repositório | `github.com/drogafarto-web/trabalho` |
| Dono | drogafarto@gmail.com |
| Domínio | EdTech · Ensino superior · Cursos de saúde |
| Estágio | v2 em design — v1 existente tem falhas críticas de segurança |
| Padrão | world-class (ref: Linear, Stripe, Vercel, Apple) |

---

## 2. Missão em uma frase

Eliminar o gargalo de correção manual de trabalhos acadêmicos em cursos
de saúde, entregando ao professor uma primeira avaliação rigorosa por IA
em segundos — mantendo a nota final 100% sob decisão humana.

---

## 3. Personas

### 3.1 Aluno
- 18-24 anos, curso superior em Farmácia ou Biomedicina
- Maioria mobile (iPhone/Android ~60/40)
- Sem login. Envia trabalho em grupo (até 3) e vai embora
- Conexão instável, envia em cima do prazo
- Frustração com interfaces lentas

### 3.2 Professor
- Docente universitário, 35-55 anos, desktop
- Corrige 50-150 trabalhos por disciplina por semestre
- Autoridade final sobre a nota — a IA **nunca** decide
- Muda critérios a cada semestre, cria disciplinas novas
- Precisa importar listas de alunos e exportar notas

---

## 4. Fluxo de valor (golden path)

```
Aluno preenche formulário
  → Upload do PDF/imagem para Storage
  → Firestore grava status: WAITING_FOR_AI
  → Cloud Function trigger processa (OCR + Gemini)
  → Status vira PENDING_REVIEW
  → Professor abre dashboard, revisa notas, ajusta se preciso
  → Publicação → status APPROVED
  → Relatório consolidado exportável
```

---

## 5. Documentos-irmãos (leia na ordem)

| # | Arquivo | Para quê serve | Quando ler |
|---|---|---|---|
| 1 | [`01_spec.md`](./01_spec.md) | Escopo funcional completo (todas as telas e regras) | Antes de projetar feature |
| 2 | [`02_constraints.md`](./02_constraints.md) | Restrições inegociáveis (segurança, perf, LGPD, a11y) | **SEMPRE antes de escrever código** |
| 3 | [`03_stack.md`](./03_stack.md) | Stack técnica definitiva com justificativas | Antes de instalar qualquer dep |
| 4 | [`04_schema_json.md`](./04_schema_json.md) | Schemas Firestore, Zod, Gemini JSON Schema | Antes de mexer em dados |
| 5 | [`05_halt_protocol.md`](./05_halt_protocol.md) | Quando parar e perguntar ao humano | **Quando em dúvida** |
| 6 | [`06_agents_rules.md`](./06_agents_rules.md) | Protocolo de operação dos agentes | No começo de toda sessão |
| 7 | [`07_examples.md`](./07_examples.md) | Padrões canônicos (o que copiar) e anti-padrões | Antes de criar padrão novo |
| 8 | [`08_glossary.md`](./08_glossary.md) | Vocabulário de domínio e técnico | Ao encontrar termo novo |

---

## 6. Regras de ouro (resumo executivo)

1. **Nunca** escreva senha, chave, token ou segredo em código cliente.
2. **Nunca** libere Firestore/Storage com `allow ... if true`.
3. **Nunca** invente dado — se não sabe, pergunte ou leia o código.
4. **Nunca** delete dado sem confirmação humana explícita na sessão.
5. **Sempre** consulte `02_constraints.md` antes de decidir arquitetura.
6. **Sempre** prefira editar a criar arquivo novo.
7. **Sempre** teste em dark mode — é o padrão.
8. **Sempre** escreva mensagem de erro para humano, não stack trace.

---

## 7. Estado atual (v1 existente)

### Funciona
- Fluxo base de envio → IA → revisão → publicação
- Structured output via `responseSchema` no Gemini
- OCR fallback (texto → rasterização)
- CSV export formatado para Excel-BR
- Detecção de duplicatas por disciplina+aluno

### Quebrado (bloqueadores de produção)
- Senha do admin hardcoded no bundle (`Login.tsx:14`)
- Firestore/Storage com regras `if true`
- Sessão de professor persistida em `localStorage` sem JWT
- Chave Gemini no cliente (cota exposta)
- Trabalhos com PII roteados por CORS proxies públicos
- `onSnapshot` sem filtro (vaza dados entre alunos)
- Disciplinas e alunos hardcoded em `constants.ts`

### A construir no v2
- Auth real via Firebase Auth + Custom Claims
- Gemini via Cloud Function (chave no servidor)
- CRUD de disciplinas (com rubrica editável)
- CRUD de alunos (com import CSV)
- Heatmap de desempenho por critério
- Command palette (Cmd+K)
- Layout de impressão A4 para diário oficial

---

## 8. Como iniciar uma sessão como agente

```
1. Leia FORMULARIO.md (este arquivo)
2. Leia 02_constraints.md e 05_halt_protocol.md
3. Leia 06_agents_rules.md
4. Declare em uma frase o que vai fazer
5. Se a tarefa envolve dados → leia 04_schema_json.md
6. Se a tarefa envolve UI → leia 01_spec.md seção relevante
7. Prefira PEQUENAS mudanças verificáveis a PR gigante
8. Ao terminar, deixe um resumo de 3 linhas do que mudou
```

---

## 9. Definição de "pronto" (Definition of Done)

Uma tarefa só é considerada completa quando:

- [ ] Código compila sem warning de TS em modo `strict`
- [ ] Testes unitários passam (se aplicável à camada)
- [ ] Regras de Firestore/Storage atualizadas e testadas
- [ ] Sem `console.log` esquecido, sem `TODO` sem issue ligada
- [ ] Sem `@ts-ignore` novo sem comentário justificando
- [ ] Dark mode funciona
- [ ] a11y: navegável por teclado, contraste AA
- [ ] Mensagens de erro em português, dirigidas ao usuário
- [ ] Documentação relevante (se rompe contrato público) atualizada

---

## 10. Ponto de contato

Qualquer decisão que afete **um dos seguintes** exige confirmação humana:
- Schema de dados em produção
- Regras de segurança (Firestore/Storage)
- Alteração em `02_constraints.md` ou `03_stack.md`
- Deploy para produção
- Custo recorrente novo (ex: subir plano do Firebase)

Ver `05_halt_protocol.md` para o protocolo completo.
