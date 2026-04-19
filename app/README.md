# Controle de Trabalhos

> Avaliação acadêmica com IA, com o professor no controle.

Sistema de correção automatizada de trabalhos acadêmicos de cursos de
saúde (Farmácia, Biomedicina). Aluno envia trabalho sem login,
Gemini faz a primeira avaliação com OCR + rubrica dinâmica,
professor revisa e publica a nota final.

## 🗂️ Onde estão as regras

Antes de qualquer coisa, leia [`docs/FORMULARIO.md`](../docs/FORMULARIO.md).
Os 9 documentos em `docs/` são a fonte única de verdade do produto.

- Restrições inegociáveis: [`docs/02_constraints.md`](../docs/02_constraints.md)
- Stack técnica: [`docs/03_stack.md`](../docs/03_stack.md)
- Schemas de dados: [`docs/04_schema_json.md`](../docs/04_schema_json.md)

## 🧱 Estrutura

```text
app/
├── web/          # Frontend Vite + React 19 + TypeScript
├── functions/    # Cloud Functions v2 (Node 20)
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
└── .github/workflows/   # CI
```

## 🚀 Setup (primeira vez)

Pré-requisitos:

- Node.js 20 LTS ou superior
- npm 10+
- Firebase CLI (`npm i -g firebase-tools`)
- Conta Firebase com o projeto `trabalhos-prod` criado (plano Blaze)

> ⚠️ **Single-env temporário.** Ver [ADR-001](../docs/DECISIONS.md#adr-001).
> Estamos rodando `trabalhos-prod` em modo "staging-mental" até o
> primeiro aluno real entrar. ANTES disso, criar `trabalhos-staging`.

Passos:

```bash
# 1. Instalar dependências em ambos workspaces
cd web && npm install && cd ..
cd functions && npm install && cd ..

# 2. Configurar variáveis de ambiente do frontend
cp .env.example web/.env.local
# Edite web/.env.local com as chaves do seu projeto Firebase staging

# 3. Login no Firebase
firebase login

# 4. Confirmar os projetos
firebase use staging
```

## 🧪 Desenvolvimento local (com Emulators)

```bash
# Terminal 1 — emulator suite (Auth, Firestore, Storage, Functions)
firebase emulators:start

# Terminal 2 — frontend
cd web && npm run dev

# Abrir:
# - App:         http://localhost:5173
# - Emulator UI: http://localhost:4000
```

## 🏗️ Build e deploy

```bash
# Type-check + lint + test + build
npm run check    # ver package.json raiz (quando criado)

# Deploy para staging (automático via CI no merge em main)
firebase deploy --only hosting,functions,firestore:rules,storage

# Promover staging → produção (manual)
firebase use production
firebase deploy
```

## 🛡️ Segurança

- Regras Firestore/Storage começam em **deny-all**. Vão se abrindo
  conforme cada feature é liberada, sempre condicionadas a auth.
- Chave Gemini fica em Secret Manager do Firebase, **nunca no cliente**.
- Autenticação de professor via OAuth Google + Custom Claims.
- Aluno usa auth anônima para poder escrever no Storage com rule restrita.

## 📜 Licença

Privado. Todos os direitos reservados.
