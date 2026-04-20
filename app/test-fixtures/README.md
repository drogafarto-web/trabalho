# Test fixtures — Controle de Trabalhos

Pacote de mocks pronto pra um agente autônomo (Antigravity / Gemini 3 Flash)
exercitar o sistema end-to-end em produção.

Tudo aqui é **fictício** — nomes, emails, whatsapps e trabalhos acadêmicos
foram gerados sinteticamente. Os e-mails usam o domínio `fictnicio.edu.br`
(propositalmente inválido como TLD — não envia nem recebe de verdade) exceto
o e-mail que o agente usar pra si mesmo, que precisa ser real pra confirmar
o recibo.

## Conteúdo

```text
test-fixtures/
├── README.md              ← este arquivo
├── agent-prompt.md        ← prompt pro Antigravity / agente browser autônomo
├── test-scenarios.md      ← cenários E2E numerados (spec autoritativa)
├── personas/              ← perfis que o agente vai assumir
│   ├── professor.md
│   ├── aluno-joao.md      ← submitter do trabalho em grupo (bom)
│   ├── aluno-maria.md     ← AECO individual, PDF
│   ├── aluno-lucas.md     ← submitter do trabalho ruim (pra testar nota baixa)
│   ├── aluno-ana.md       ← AECO individual com submissão via DOCX
│   └── aluno-youtube.md   ← entrega via link do YouTube (Fase 4.3)
├── planilhas/
│   ├── estrutura.xlsx     ← 2 disciplinas, 3 etapas, 4 atividades
│   └── alunos.xlsx        ← 8 alunos + 12 matrículas
└── trabalhos/
    ├── leishmaniose-grupo.pdf       ← bom (4 páginas, referências)
    ├── leishmaniose-ruim.pdf        ← ruim (1 parágrafo, sem refs)
    ├── aeco-caso-clinico.pdf
    └── aeco-caso-clinico.docx
```

## Como regenerar

Tudo vem de um script determinístico:

```bash
cd app/web
npm run generate:fixtures
```

Isso regrava `planilhas/` e `trabalhos/` sem tocar nos `.md`. Se mudar o
schema de domínio, rode o script pra garantir que os fixtures batem.

## Pré-requisitos pro teste

1. **Professor já criado** — o domínio `drogafarto@gmail.com` precisa
   estar logado ao menos uma vez e ter claim `role=professor` ativo
   (ver [app/EMAIL_SETUP.md](../EMAIL_SETUP.md) ou `npm run set-claim` em
   `app/functions/`).
2. **Resend configurado** (opcional — recibos) — ver [EMAIL_SETUP.md](../EMAIL_SETUP.md).
3. **Providers LLM** configurados em `/config` — pelo menos Gemini
   pra o fluxo YouTube funcionar.
4. **Deploy atualizado** em prod (rules + functions + hosting).

## URL de produção

`https://trabalhos-e0647.web.app`

## Ordem sugerida de execução

1. Login como professor → imports ([cenário 1](test-scenarios.md#1))
2. Submissões de aluno (anon) → várias personas, formatos diversos ([2–6](test-scenarios.md#2))
3. Revisão pelo professor → publica notas ([cenário 7](test-scenarios.md#7))
4. Casos de borda → duplicata, lock, email inválido ([8–10](test-scenarios.md#8))
