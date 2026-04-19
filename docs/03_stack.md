---
doc_id: 03_stack
version: 1.0.0
depends_on: [FORMULARIO, 02_constraints]
purpose: Stack técnica definitiva com justificativas. Se algo não está aqui, não está no projeto. Adicionar dependência exige revisão.
---

# 03 — Stack Técnica

> **Para o agente**: Antes de `npm install` qualquer pacote, verifique
> se já está listado aqui. Se não está, pare e pergunte. Toda dep
> tem custo: tamanho, superfície de bug, risco de supply chain.

---

## 1. Princípios de escolha

1. **Boring tech** onde possível. Popular + maduro bate "último hype".
2. **Defaults fortes**. Evitar pacotes que exigem configuração extensa.
3. **TypeScript-first**. Nada de pacote com `@types` de terceiros precários.
4. **Tree-shakable**. Nada de lib que importa tudo.
5. **Uma forma só de fazer a coisa**. Sem 2 state managers, 2 form libs.

---

## 2. Frontend

### Runtime
| Camada | Escolha | Versão | Por quê |
|---|---|---|---|
| UI | React | 19.x | Padrão do ecossistema, concurrent features |
| Build | Vite | 5.x | HMR rápido, build pequeno, bom para SPA |
| Linguagem | TypeScript | 5.5+ | `strict: true` obrigatório |
| CSS | Tailwind CSS | 3.4+ | Utility-first, design tokens por config |
| Componentes | shadcn/ui | — | Componentes copiados, não dependência |
| Ícones | Lucide React | latest | Consistência visual, tree-shakable |
| Animação | Framer Motion | 11.x | Apenas para micro-interações intencionais |

### Estado e dados
| Camada | Escolha | Por quê |
|---|---|---|
| Server state | TanStack Query | Cache, revalidação, otimista, offline |
| Client state | Zustand | Leve, sem boilerplate. Evita Redux. |
| Forms | react-hook-form + Zod | Validação unificada client/server |
| Roteamento | React Router v6 | SPA simples, não precisa Next.js |

### Desenvolvimento
| Ferramenta | Uso |
|---|---|
| ESLint + `@typescript-eslint` | Lint estático |
| Prettier | Formatting |
| Husky + lint-staged | Pre-commit |
| Vitest | Unit tests |
| Playwright | E2E |
| MSW | Mock de API em testes |

### **Proibido no frontend**
- `redux`, `mobx`, `recoil` (usamos Zustand)
- `formik`, `final-form` (usamos react-hook-form)
- `axios` (usamos `fetch` + TanStack Query)
- `moment`, `date-fns` pesado (usamos `date-fns` com tree-shake ou `Intl` nativo)
- CSS-in-JS runtime (`styled-components`, `emotion`) — Tailwind cobre
- Tailwind via CDN em produção (dev OK, prod não)

---

## 3. Backend

### Plataforma
| Camada | Escolha | Por quê |
|---|---|---|
| Auth | Firebase Authentication | OAuth Google + anônimo + custom claims |
| DB | Cloud Firestore | Real-time, offline, escala sem ops |
| Storage | Firebase Storage | CDN integrada, regras co-localizadas |
| Serverless | Cloud Functions v2 | Cold start melhor, triggers Firestore |
| Secrets | Firebase Secret Manager | Rotação + auditoria |
| Hosting | Firebase Hosting | CDN global, rollback 1-clique |

### Cloud Functions (Node 20 LTS)
| Lib | Uso |
|---|---|
| `firebase-functions` v5 | Runtime |
| `firebase-admin` | Acesso privilegiado ao Firestore/Storage |
| `@google/genai` | SDK oficial Gemini |
| `zod` | Validação de entrada |
| `pino` | Logs estruturados |
| `pdf-parse` | PDF text extraction server-side |
| `sharp` | Image processing (rasterização) |

### **Proibido no backend**
- Express ou outro framework HTTP (Functions v2 já tem router)
- Acesso direto a Firestore do cliente para dados sensíveis
- Bibliotecas que não têm `@types` oficiais
- ORMs sobre Firestore (ele é document store, respeite)

---

## 4. IA

### Provedor
**Google Gemini** (via `@google/genai`)

### Modelos
| Caso de uso | Modelo | Por quê |
|---|---|---|
| Correção de trabalho | `gemini-2.5-flash` | Suficiente, rápido, barato |
| OCR visual (manuscrito) | `gemini-2.5-flash` com vision | Nativo multimodal |
| Detecção de similaridade | (não é IA — Jaccard manual) | Determinístico, gratuito |

### Configuração obrigatória
```ts
{
  model: 'gemini-2.5-flash',
  config: {
    temperature: 0.1,
    responseMimeType: 'application/json',
    responseSchema: <schema-da-rubrica>,  // ver 04_schema_json.md
    systemInstruction: <system-prompt>,
  }
}
```

### Regras
- Chave **apenas no servidor**, via Secret Manager
- Timeout: 90s
- Retry: 3 tentativas com backoff exponencial (2s, 4s, 8s)
- Log de cada chamada: `submissionId`, `duration`, `tokens`, `success`

---

## 5. Observabilidade

| Área | Ferramenta |
|---|---|
| Erros cliente | Sentry (com PII scrubber) |
| Erros servidor | Cloud Logging (GCP nativo) |
| Performance cliente | Firebase Performance Monitoring |
| Métricas custom | Cloud Monitoring (métricas manuais) |
| Uptime | Firebase Hosting health + UptimeRobot (free tier) |

---

## 6. CI/CD

### GitHub Actions (único)
- **`ci.yml`** (em cada PR): lint, type-check, test, build
- **`deploy-staging.yml`** (merge em `main`): deploy Firebase Hosting canal `staging`
- **`deploy-prod.yml`** (tag `v*`): promove staging → produção

### Ambientes
| Nome | URL | Firebase Project |
|---|---|---|
| local | `localhost:5173` | emulator suite |
| staging | `staging.trabalho.app` | `trabalhos-staging` |
| production | `trabalho.app` | `trabalhos-edad9` |

---

## 7. Estrutura de pastas

```
/trabalho
├── web/                     # Frontend Vite
│   ├── src/
│   │   ├── app/             # Rotas e layouts
│   │   ├── features/        # F-AL-*, F-PR-* (um dir por feature)
│   │   │   ├── submission/
│   │   │   ├── dashboard/
│   │   │   ├── disciplines/
│   │   │   └── students/
│   │   ├── core/            # Lógica pura (sem React)
│   │   │   ├── domain/      # Tipos, validadores Zod
│   │   │   ├── similarity/  # Jaccard, shingling
│   │   │   └── rubric/
│   │   ├── shared/          # Componentes e hooks reutilizáveis
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   └── hooks/
│   │   └── lib/             # Config Firebase, queryClient
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/
│   └── public/
│
├── functions/               # Cloud Functions
│   ├── src/
│   │   ├── submissions/     # Triggers e callable para submissions
│   │   ├── grading/         # Integração Gemini
│   │   ├── similarity/      # Jaccard server-side
│   │   ├── admin/           # Set-claims, expurgo
│   │   └── lib/
│   └── tests/
│
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── docs/                    # <-- Você está aqui
└── README.md
```

---

## 8. Versionamento de dependências

- `package.json` usa `^` (caret) para minor updates
- `package-lock.json` commitado
- Dependabot configurado:
  - patch: auto-merge se CI passa
  - minor: PR para review
  - major: PR com label "breaking"

---

## 9. Adição de nova dependência

Checklist antes de instalar:

- [ ] Já existe algo no projeto que resolve? (ver este doc)
- [ ] É mantida (último commit < 6 meses)?
- [ ] Tem TypeScript nativo ou `@types` oficiais?
- [ ] Bundle size aceitável? (`bundlephobia.com`)
- [ ] Licença compatível? (MIT, Apache-2.0, BSD OK)
- [ ] CVE recente? (`npm audit`)
- [ ] Se passou em tudo, **pergunte ao dono antes de instalar**

---

## 10. Migrações planejadas (fora do v2)

Conscientemente adiado:

- **Next.js** — se precisarmos de SSR/edge, v3
- **tRPC** — se precisarmos de RPC end-to-end, v3
- **Turborepo** — se tiver múltiplos apps, v3
- **PostgreSQL + Supabase** — se Firestore ficar caro, v4
