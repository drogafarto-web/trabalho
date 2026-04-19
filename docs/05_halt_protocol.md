---
doc_id: 05_halt_protocol
version: 1.0.0
depends_on: [FORMULARIO, 02_constraints]
priority: P0
purpose: Define QUANDO o agente deve parar e pedir confirmação humana. Violar este protocolo é a falha mais grave que um agente pode cometer.
---

# 05 — Halt Protocol

> **Para o agente**: Este é o documento mais importante do projeto
> depois de `02_constraints.md`. Autonomia é um privilégio, não um
> direito. Quando em dúvida, **pare**. "Eu achei que era certo" não
> é uma defesa válida contra perda de dados ou falha de segurança.

---

## 1. Filosofia

> **"Mede duas vezes, corta uma. Na dúvida, pergunta."**

Ações têm duas dimensões:
1. **Reversibilidade** — posso desfazer em 1 clique? Ou é perda permanente?
2. **Blast radius** — afeta só a minha máquina? Ou usuários reais?

Toda ação com **baixa reversibilidade + alto blast radius** exige halt.

| | Local & reversível | Local & irreversível | Produção |
|---|---|---|---|
| **Ler** | GO | GO | GO |
| **Escrever** | GO | HALT | HALT |
| **Apagar** | GO* | HALT | HALT |

*Local & reversível: apagar arquivo versionado no git. OK.
Local & irreversível: apagar arquivo não versionado. HALT.

---

## 2. Gatilhos de HALT obrigatório

Se QUALQUER um destes se aplica, **pare e pergunte** antes de agir:

### 2.1 Segurança / Autenticação
- Alterar `firestore.rules` ou `storage.rules`
- Alterar configuração de Auth (providers, claims)
- Adicionar nova origin/domain autorizado
- Mexer em qualquer arquivo em `functions/src/admin/`
- Rotacionar ou gerar nova API key / segredo
- Alterar CORS em Cloud Function pública

### 2.2 Dados em produção
- Qualquer operação de escrita em Firestore de produção
- Qualquer `deleteDoc`, `deleteField`, `deleteObject` em produção
- Migration que afeta documentos existentes
- Alterar schema de coleção com dados
- Alterar nome de campo (rename)

### 2.3 Superfície pública
- Push em `main` sem PR
- Deploy para produção (staging tudo bem)
- Merge de PR com conflitos resolvidos sem revisão humana
- Tag de release (`git tag v*`)

### 2.4 Dependências e stack
- `npm install` de pacote não listado em `03_stack.md`
- Atualizar versão **major** de qualquer dep
- Remover dep em uso
- Mudar versão do Node, do TypeScript, do React

### 2.5 Escopo
- Implementar feature não listada em `01_spec.md`
- Alterar funcionalidade existente de forma não retrocompatível
- Refatoração que toca > 10 arquivos sem PR específico para isso
- Criar novo documento em `docs/` (esta pasta é curada)

### 2.6 Custo
- Habilitar serviço pago novo no Firebase/GCP
- Subir o plano (Blaze → superior) sem aviso
- Criar Cloud Function de execução longa (> 60s) que multiplica cobrança

### 2.7 Dados pessoais (LGPD)
- Coletar campo novo não previsto em `02_constraints.md §P-2`
- Enviar dados para terceiro não listado
- Mudar política de retenção

### 2.8 Commits e git
- `git reset --hard`, `git push --force`, `git rebase` destrutivo
- `git commit --amend` em commit já publicado
- Criar branch com nome que colide com branch remota
- `git clean -fd` sem saber o que está apagando

### 2.9 Operações de filesystem
- `rm -rf` de qualquer diretório que não seja `node_modules` ou `.cache`
- Sobrescrever arquivo com conteúdo muito diferente do original
- Mover arquivo para fora do repositório
- Apagar arquivo que não foi criado nesta sessão

### 2.10 IA e prompts
- Editar system prompt do Gemini sem revisão
- Mudar `temperature`, `model`, `responseSchema` em produção
- Remover sanitização de input do usuário
- Expor a chave Gemini no cliente

---

## 3. Como executar um HALT

### 3.1 Formato de saída
Quando parar, sua resposta ao usuário deve ser exatamente:

```
🛑 HALT — preciso de confirmação

Ação proposta: <1 frase clara>

Motivo do halt: <qual regra acima se aplica>

Impacto se eu proceder:
- <efeito 1>
- <efeito 2>

Alternativas consideradas:
- <A: descrever e qual o trade-off>
- <B: descrever e qual o trade-off>

Minha recomendação: <A ou B ou aguardar>

Posso proceder?
```

### 3.2 Exemplo concreto
```
🛑 HALT — preciso de confirmação

Ação proposta: Alterar firestore.rules para permitir leitura anônima
de /disciplines/* em campos públicos (name, code).

Motivo do halt: §2.1 — alteração de regras de segurança.

Impacto se eu proceder:
- Qualquer pessoa não autenticada poderá ler nome e código de todas
  as disciplinas do professor.
- Não expõe dados sensíveis (sem rubrica, sem alunos).
- É necessário para o formulário do aluno funcionar sem login.

Alternativas consideradas:
- A: Abrir leitura dos campos mínimos como proposto.
- B: Criar Cloud Function callable "listPublicDisciplines" que retorna
     apenas os campos públicos. Mais seguro, +1 chamada, +1 Function.

Minha recomendação: B (mais alinhado com 02_constraints §S-3).

Posso proceder com B?
```

---

## 4. O que NÃO precisa de halt

Para não virar paranoia, estes são explicitamente OK:

- Criar arquivo novo em `web/src/features/` dentro do escopo de `01_spec.md`
- Editar componente React existente
- Adicionar testes
- Rodar `npm run dev`, `npm test`, `npm run build` local
- Criar branch local, commitar em branch local
- Editar CSS/Tailwind em componente
- Refatoração pequena (1-3 arquivos) dentro do mesmo feature
- Renomear variável local
- Melhorar mensagem de erro para usuário
- Adicionar log de desenvolvimento (que depois será removido)

---

## 5. Protocolo de recuperação após erro

Se você cometeu um erro mesmo assim:

1. **Pare imediatamente** — não tente "consertar" fazendo mais mudanças
2. **Avise o usuário** — seja específico sobre o que fez
3. **Mostre o estado atual** — `git status`, logs, o que quer que seja
4. **Proponha recuperação** — rollback, revert, restauração
5. **Aguarde instrução** — não execute a recuperação sozinho

### Formato
```
⚠️ ERRO — executei algo que não deveria

O que fiz: <descrição exata>
Estado atual: <git status, ou equivalente>
Consequência: <o que já aconteceu>
Reversibilidade: <o que ainda é possível desfazer>

Proposta de recuperação:
1. <passo>
2. <passo>

Aguardando sua instrução.
```

---

## 6. Gatilhos de HALT "soft" (avisar, mas seguir com cautela)

Estes não exigem parada total, mas merecem um aviso inline:

- Mudança que aumenta bundle em > 20KB
- Adicionar novo listener real-time que pode escalar leituras
- Refator que toca arquivo > 500 linhas (risco de side-effect)
- Mudança em texto visível ao usuário (pode impactar i18n futuro)
- Adição de `useEffect` com dependência não-trivial

Aviso sugerido:
> ℹ️ Observação: vou adicionar um `useEffect` que escuta mudanças em
> `submission.status`. Isso pode disparar re-renders. Considerei memoizar
> com `useMemo` e pareceu desnecessário dado o escopo. OK?

---

## 7. Escalation ladder

| Nível | Ação | Quem decide |
|---|---|---|
| L0 | Sigo o protocolo e executo | Agente |
| L1 | Aviso inline (halt soft) | Agente executa após avisar |
| L2 | HALT — aguardo confirmação | Dono (drogafarto@gmail.com) |
| L3 | HALT + propor rollback | Dono obrigatório |
| L4 | Parar TUDO, incluindo o que já rodou | Dono + rollback manual |

L4 casos: exposição acidental de segredo, perda de dados de produção,
violação de LGPD detectada, incidente de segurança.

---

## 8. Regra final

> Se este documento não cobre seu caso e você está em dúvida:
> **assuma que é HALT**. O custo de uma pergunta extra é baixíssimo.
> O custo de uma ação errada irreversível é altíssimo.
