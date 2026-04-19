---
doc_id: DECISIONS
version: 1.0.0
depends_on: [FORMULARIO]
purpose: Architecture Decision Records (ADRs) — decisões arquiteturais importantes, com contexto, alternativas consideradas e consequências. Imutável por design (novas decisões = novas ADRs, não reescrita das antigas).
---

# Decisions — ADRs

> **Para o agente**: ADRs são imutáveis. Se uma decisão mudar, adicione
> uma nova ADR que **supersede** (deprecia) a anterior — não apague a
> antiga. Contexto histórico é parte do valor.

---

## ADR-001 — Single environment no bootstrap (sem staging)

**Data:** 2026-04-19
**Status:** Accepted (temporária — revisão obrigatória antes do primeiro aluno real)
**Decisor:** drogafarto@gmail.com

### Contexto

Durante a Fase 0 do v2, a recomendação técnica padrão é provisionar
dois projetos Firebase: `trabalhos-staging` e `trabalhos-prod`, com
CI promovendo staging→prod após smoke tests
(`02_constraints.md §Pc-2`).

O dono optou conscientemente por criar apenas **um** projeto no momento:
`trabalhos-prod`, rodando em modo "staging-mental" até o primeiro aluno
real usar o sistema.

### Decisão

- Um único projeto Firebase: `trabalhos-prod`
- Plano Blaze habilitado
- Variável de ambiente `VITE_APP_ENV=staging-mental` sinaliza o estado
- Rules e schema podem ser reescritos à vontade enquanto neste modo
- Seed de dados fake é permitido
- Antes do **primeiro aluno real** entrar, criar `trabalhos-staging`
  e promover o modo para `production`

### Alternativas consideradas

**A. Dois projetos desde o início** (recomendação original)
- Pró: isolamento total, CI/CD tradicional, playground livre em staging
- Contra: mais setup inicial, 2x credenciais para gerenciar

**B. Um projeto, modo staging-mental** (escolhida)
- Pró: setup mais rápido, 1x credenciais, custo idêntico (free tier)
- Contra: risco se alguém subir URL pública antes de separar ambientes

**C. Um projeto com coleções prefixadas** (`staging_submissions`, `prod_submissions`)
- Pró: separação lógica
- Contra: rules ficam complexas, erro humano fácil, NÃO recomendado

### Consequências

**Positivas**
- Iteração mais rápida no começo do projeto
- Um único conjunto de credenciais para configurar

**Negativas / Mitigadas**
- Qualquer bug em rules = vazamento potencial real
  → mitigado por Emulator Suite obrigatório em dev (nunca testar rule
  nova direto em prod)
- Agentes (Claude Code) precisam manter disciplina extra — toda
  escrita em produção ainda exige HALT conforme `05_halt_protocol §2.2`
- A promoção para produção real (ADR-002 futura) precisa acontecer
  ANTES de qualquer URL pública ser compartilhada com alunos reais

### Gatilhos para revisão

Reabrir esta decisão e criar **ADR-002 — Adoção de ambiente staging separado**
quando qualquer um destes acontecer:

- [ ] URL pública do app compartilhada com primeiro aluno real
- [ ] Primeira submissão com PII real entrou no Firestore
- [ ] Primeiro deploy em produção oficial (v2.0.0)
- [ ] Qualquer pessoa além do dono recebe acesso de professor

**Dono do gatilho:** drogafarto@gmail.com
**Prazo para ADR-002 (se atingir gatilho):** mesmo dia

### Referências

- `02_constraints.md §Pc-2` — Constraint original de dois ambientes
- `05_halt_protocol.md §2.1, §2.2` — Gatilhos de halt para produção

---

## Template para novas ADRs

Copie e preencha:

```markdown
## ADR-XXX — <título curto imperativo>

**Data:** YYYY-MM-DD
**Status:** Proposed | Accepted | Superseded by ADR-YYY | Deprecated
**Decisor:** <email>

### Contexto
<o que motivou a decisão, com links para docs/código>

### Decisão
<o que foi decidido, em imperativo>

### Alternativas consideradas
**A.** <...> — pró/contra
**B.** <...> — pró/contra

### Consequências
**Positivas** ...
**Negativas / Mitigadas** ...

### Gatilhos para revisão
- [ ] <condição concreta>

### Referências
- <links>
```
