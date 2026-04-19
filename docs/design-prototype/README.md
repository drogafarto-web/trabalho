---
doc_id: design-prototype
version: 1.0.0
source: Claude Designer (2026-04-19)
purpose: Protótipo interativo de alta fidelidade das 6 telas principais. Referência visual canônica — quando implementar uma tela no app real, abra este protótipo no browser e use como espec.
---

# Design Prototype — Controle de Trabalhos

Protótipo interativo entregue pelo Claude Designer em **2026-04-19**,
gerado a partir de [`PROMPT_CLAUDE_DESIGNER.md`](../PROMPT_CLAUDE_DESIGNER.md).

## Como abrir

Clique duplo em `Controle de Trabalhos.html` (abre no browser padrão).

> ⚠️ O arquivo usa React 18 via CDN + Babel standalone — roda direto no
> navegador, sem build. É **apenas referência visual**. O código real
> do app vai em `app/web/` com Tailwind, TypeScript e nosso stack.

## Telas incluídas (6)

| Tela | Arquivo | Resolução base |
|---|---|---|
| Aluno — Entrega | `StudentForm.jsx` | 390×844 (iPhone 15) |
| Professor — Login | inline em HTML | 1440×900 |
| Professor — Trabalhos (dashboard) | `ProfessorDashboard.jsx` | 1440×900 |
| Professor — Disciplinas | `ProfessorOther.jsx` | 1440×900 |
| Professor — Alunos | `ProfessorOther.jsx` | 1440×900 |
| Professor — Relatórios | `ProfessorOther.jsx` | 1440×900 |

## Painel de tweaks

No canto do protótipo há um painel interativo que alterna estados:
- Passo do form do aluno (Identificação / Arquivo / Confirmar)
- Estado do upload (idle, enviando, sucesso, erro)
- Banner de integridade (cópia detectada)
- Drawer de detalhe aberto/fechado
- Modal de disciplina em cada aba
- Empty state de alunos
- Modal de importação
- Visualização de relatórios (por aluno / grupo / critério)
- Login autorizado/não autorizado

## Como usar ao implementar

Quando estiver implementando uma feature nas Fases 4-7:

1. Abra `Controle de Trabalhos.html` no browser
2. Clique na tela correspondente no switcher topo
3. Use o painel de tweaks para explorar cada estado
4. Inspecione o DOM/CSS com DevTools quando precisar
5. Porte para Tailwind (não copie CSS cru — ver `../03_stack.md`)

## Tokens usados (e incorporados ao projeto)

O protótipo usou os mesmos tokens do nosso design system + refinamentos
que foram portados para [`app/web/tailwind.config.ts`](../../app/web/tailwind.config.ts):

| Token do CSS protótipo | Tailwind equivalente |
|---|---|
| `--bg` | `bg-bg` |
| `--surface` | `bg-bg-surface` |
| `--surface-hi` | `bg-bg-surface-hi` |
| `--border` | `border-border` |
| `--border-hi` | `border-border-strong` |
| `--text` / `--text-2` / `--text-3` | `text-text` / `text-text-secondary` / `text-text-muted` |
| `--primary` / `--primary-hi` | `text-primary` / `text-primary-hover` |
| `--success` / `--warning` / `--danger` | `text-success` / `text-warning` / `text-danger` |
| `--shadow` / `--shadow-lg` | `shadow-subtle` / `shadow-elevated` |

## Políticas

- ❌ **NÃO editar** os arquivos deste diretório. Se o design evoluir,
  rode o Designer de novo e substitua tudo.
- ❌ **NÃO importar** código daqui para `app/web/` — é outro stack.
- ✅ **Usar como referência** ao implementar componentes reais.
- ✅ **Consultar em code review** quando houver dúvida visual.
