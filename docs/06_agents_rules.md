---
doc_id: 06_agents_rules
version: 1.0.0
depends_on: [FORMULARIO, 02_constraints, 05_halt_protocol]
purpose: Protocolo de operação para agentes (Claude Code, Opus, Sonnet, Haiku). Define ritual de início de sessão, estilo de output, uso de ferramentas, commit discipline.
---

# 06 — Regras dos Agentes

> **Para o agente**: Este é o seu manual operacional. Seguir estas
> regras é o que separa um colaborador world-class de um gerador
> de código. Velocidade sem rigor vira retrabalho. Rigor sem velocidade
> vira perfeccionismo estéril. Buscamos os dois.

---

## 1. Ritual de início de sessão

Toda sessão começa com:

1. Ler `FORMULARIO.md`
2. Ler `02_constraints.md`
3. Ler `05_halt_protocol.md`
4. Ler `06_agents_rules.md` (este arquivo)
5. Ler seção relevante de `01_spec.md` (se task específica)
6. Declarar ao usuário, em 1-2 frases, o que entendeu e vai fazer
7. Aguardar confirmação **apenas se** a task envolver halt-triggers
8. Caso contrário, executar

Se a sessão é curta (1-2 turnos), pular 1-4 é OK — mas **nunca pule 5-6**.

---

## 2. Princípios de operação

### P1 · Entender antes de agir
- Nunca edite arquivo que você não leu completo (ou o trecho relevante)
- Nunca assuma como algo funciona — leia o código
- Se a task está vaga, faça UMA pergunta de clarificação, depois execute

### P2 · Menor diff possível
- Prefira editar a criar
- Prefira mudança cirúrgica a refator "enquanto estou aqui"
- Se identificar code smell alheio ao task, anote mas não conserte

### P3 · Zero premissa sobre o que existe
- Não invente função, arquivo, pacote. Verifique com `Read`, `Grep`, `Glob`.
- Se menciona função `X`, grep por `X` antes de usar
- Se menciona arquivo `Y`, leia-o antes de importar

### P4 · Failure modes explícitos
- Código que pode falhar → tratar explicitamente
- Mensagem de erro → escrita para o usuário, não para o dev
- Logs → estruturados, sem PII

### P5 · Testabilidade
- Lógica pura separada de UI
- Funções pequenas com entrada/saída clara
- Se não consegue testar, provavelmente está mal estruturado

### P6 · Comentários proibidos por padrão
- Bons nomes eliminam 90% dos comentários
- Comente apenas o **porquê** quando ele não é óbvio
- Nunca comente o **o quê** (o código já diz)
- Zero comentário sobre "adicionado em X", "usado por Y"

### P7 · Sem sobre-engenharia
- 3 linhas parecidas > abstração prematura
- Não adicione feature flag sem pedido explícito
- Não adicione fallback para cenário impossível

---

## 3. Uso de ferramentas (Claude Code)

### 3.1 Prioridade
1. `Read` — ler arquivo que você conhece o path
2. `Grep` — buscar padrão em arquivos
3. `Glob` — listar arquivos por padrão
4. `Edit` — modificar arquivo existente (preferência)
5. `Write` — criar arquivo novo (última opção)
6. `Bash` — operações shell que nenhuma das acima cobre
7. `Agent` — delegar pesquisa aberta ou tarefa paralela

### 3.2 Padrões de uso
- **Paralelismo**: múltiplas chamadas independentes no mesmo turno
- **Sequencial**: só quando B depende de A
- **TodoWrite**: se task tem 3+ etapas, use. Se é trivial, não use.
- **Agent Explore**: para buscar em codebase grande — melhor que Grep + Grep + Grep

### 3.3 Antes de cada ferramenta destrutiva
- `Edit`: leu o arquivo inteiro? Sabe exatamente o que está mudando?
- `Write` em arquivo existente: tem certeza que não é um `Edit`?
- `Bash rm`: ver §2.9 de `05_halt_protocol.md`

---

## 4. Estilo de código

### 4.1 TypeScript
```ts
// ✅ BOM
export async function publishGrade(
  submissionId: SubmissionId,
  evaluation: Evaluation,
  reviewedBy: ProfessorUid,
): Promise<Result<Submission, PublishError>> {
  const ref = doc(db, 'submissions', submissionId);
  // ...
}

// ❌ RUIM
export async function publish(id: any, data: any) {
  // implementação...
}
```

Regras:
- Tipos explícitos em exports públicos
- `Result<T, E>` para funções que podem falhar previsivelmente
- Branded types para IDs (`SubmissionId`, `UserId`)
- Sem `any`, sem `as any`, sem `@ts-ignore`

### 4.2 React
```tsx
// ✅ BOM — componente focado, props mínimas
export function GradePill({ score }: { score: number }) {
  const color = gradeToColor(score);
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-mono', color)}>
      {score.toFixed(1)}
    </span>
  );
}
```

Regras:
- Componente < 150 linhas. Se maior, decompor.
- Props tipadas com interface/type exportada
- `useMemo`/`useCallback` **só** com justificativa de perf real
- Forms: sempre `react-hook-form` + Zod
- Server state: sempre TanStack Query, nunca `useState` + `useEffect` + `fetch`

### 4.3 Firestore
```ts
// ✅ BOM — query filtrada, paginada
const q = query(
  collection(db, 'submissions'),
  where('disciplineOwnerUid', '==', uid),
  where('status', '==', 'PENDING_REVIEW'),
  orderBy('submittedAt', 'desc'),
  limit(50),
);

// ❌ RUIM — carrega tudo
const q = query(collection(db, 'submissions'));
```

### 4.4 Naming
- Arquivos: `kebab-case.ts`, componentes em `PascalCase.tsx`
- Variáveis: `camelCase`
- Constantes: `UPPER_SNAKE_CASE` apenas para configs verdadeiramente imutáveis
- Tipos/interfaces: `PascalCase`, sem prefixo `I`

---

## 5. Commits

### 5.1 Quando commitar
- Nunca faça commit sem o usuário pedir
- Se pediu "implementa X e commita", OK
- Se pediu só "implementa X", ao final pergunte "commit?"

### 5.2 Formato (Conventional Commits)
```
<tipo>(<escopo>): <descrição no imperativo, ≤ 72 chars>

[corpo opcional com porquê]

[footer opcional: Co-Authored-By, refs]
```

Tipos:
- `feat` — nova funcionalidade
- `fix` — bug fix
- `refactor` — mudança sem alterar comportamento
- `perf` — ganho de performance
- `test` — só testes
- `docs` — só documentação
- `chore` — build, deps, config

Escopo preferido:
- ID da feature (`feat(F-PR-04): ...`)
- Nome do módulo (`fix(submissions): ...`)

### 5.3 Exemplo
```
feat(F-PR-04): adiciona CRUD de disciplinas com rubrica editável

Implementa a gestão completa de disciplinas na área do professor:
criação, edição, arquivamento, com validação de rubrica (soma = 10)
e detecção de prompt injection em regras custom.

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 5.4 Anti-padrões
- ❌ `fix: stuff`
- ❌ `WIP`
- ❌ Commit gigante misturando feat + refactor + fix
- ❌ Commit que deixa código quebrado
- ❌ Commit com `console.log` esquecido

---

## 6. Review e entrega

### 6.1 Antes de dizer "pronto"
- [ ] `npm run type-check` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa (relevantes)
- [ ] `npm run build` passa
- [ ] Dark mode testado
- [ ] a11y: teclado funciona
- [ ] Nenhum `TODO` sem issue

### 6.2 Formato de entrega
Quando terminar uma task, envie:

```
✅ <task> concluída

O que mudou:
- <arquivo1>: <mudança>
- <arquivo2>: <mudança>

Verificações executadas:
- <check1>
- <check2>

Próximos passos sugeridos:
- <passo opcional>
```

Máximo 10 linhas. Se ficou maior, provavelmente o diff é grande demais.

---

## 7. Quando delegar para sub-agentes

Use `Agent` tool quando:
- Busca aberta (> 3 queries previstas) → `Explore`
- Pesquisa independente enquanto você faz outra coisa → `general-purpose`
- Revisão independente do seu próprio trabalho → outro agente
- Planejamento de implementação complexa → `Plan`

Não use quando:
- Sabe o path exato do arquivo → `Read`
- Conhece o símbolo exato → `Grep`
- Vai gastar mais descrevendo do que fazendo

---

## 8. Comunicação com o humano

### 8.1 Tom
- Direto. Sem "Claro!", "Com prazer!", "Excelente pergunta!"
- Português fluente, sem anglicismos desnecessários
- Sem emojis salvo quando o usuário os usa (CLAUDE.md)
- Sem elogios à pergunta ou à ideia — vai direto à resposta

### 8.2 Tamanho
- Resposta a pergunta simples: 1-3 frases
- Relatório de task complexa: seguir §6.2
- Nunca "concluindo", "em resumo", "espero ter ajudado"

### 8.3 Código no chat
- Só quando for prática mostrar o diff
- Diffs grandes → aplicar e referenciar path:linha
- Se o usuário não pediu código, não despejar código

### 8.4 Markdown
- Links clicáveis para arquivos: `[nome](path#Lx-Ly)`
- Blocos de código com linguagem: ```ts, ```bash
- Evitar títulos H1 em resposta (são para docs, não para chat)

---

## 9. Segurança operacional

### 9.1 Nunca exfiltre
- Não copie chaves, tokens, segredos para respostas
- Se achar `.env` com valores, referencie mas não imprima
- Se o usuário cola segredo acidentalmente, avise e peça para rotar

### 9.2 Teste em branco
- Não assuma que você é o primeiro a tocar o repo
- `git status` antes de mudanças amplas
- Preserve mudanças locais do usuário

### 9.3 Assinatura
Todo commit feito por você leva:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```
Identifica autoria sem esconder.

---

## 10. Extended thinking (quando ativado)

Se você tem acesso a extended thinking (thinking mode):

- Use para tasks com alta ambiguidade, múltiplos caminhos
- Use para debug de causa-raiz (não só sintoma)
- Use para design de schema / arquitetura
- **Não use** para edição trivial conhecida

O thinking fica invisível para o usuário — use-o para chegar à resposta
certa, depois apresente só a resposta (ou o plano).

---

## 11. Structured output (JSON schema)

Quando produzir JSON (resposta da IA, input para Cloud Function):

- Use `responseMimeType: 'application/json'` + `responseSchema`
- Nunca peça ao modelo para "retornar JSON" em markdown
- Temperature baixa (0.1) para consistência
- Valide com Zod do outro lado antes de usar
- Tenha fallback para JSON malformado (log + erro explícito)

---

## 12. Anti-padrões que nos custaram tempo no passado

Não repita:

- "Vou adicionar try/catch preventivo em tudo" — não, só onde falha real
- "Vou criar uma abstração" — 3 usos primeiro, depois abstrai
- "Vou remover 'código morto'" — confirma com grep primeiro, muitos `unused` são exports de API
- "Vou 'melhorar' a UI enquanto estou aqui" — não. Faça o task.
- "Vou fazer um commit gigante cobrindo tudo" — partes pequenas, reversíveis
- "Vou confiar no texto que vem do usuário" — sanitiza. Sempre.
- "Vou rodar só o teste da minha mudança" — roda a suíte inteira no fim

---

## 13. Quando escalar para Opus vs Sonnet vs Haiku

Heurística (modelo pode já estar escolhido, mas se você influencia):

| Task | Modelo |
|---|---|
| Decisão de arquitetura | Opus |
| Refator complexo inter-arquivos | Opus |
| Código novo dentro de padrão claro | Sonnet |
| Escrita de testes | Sonnet |
| Lint fix, formatação | Haiku |
| Busca em código, leitura | Haiku/Sonnet |

---

## 14. Regra das 3 decisões

Antes de tomar uma decisão técnica, liste em sua cabeça:
1. O caminho óbvio
2. Um caminho alternativo viável
3. Por que você está escolhendo um e não o outro

Se não consegue justificar, **pare e pergunte** — provavelmente você
não entende o problema ainda.
