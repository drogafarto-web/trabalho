---
doc_id: PROMPT_CLAUDE_DESIGNER
version: 1.0.0
depends_on: [FORMULARIO, 01_spec]
purpose: Prompt pronto para colar no Claude Designer e gerar a UX/UI completa (Aluno + Professor + CRUD de disciplinas e alunos) seguindo padrão world-class.
---

# Prompt — Claude Designer (UX / UI)

## Como usar

1. Abra o Claude Designer
2. Copie **todo o bloco XML abaixo** (entre as linhas `---COPY---`)
3. Cole como primeira mensagem
4. Ele vai gerar as 5 telas (aluno + 4 do professor) com estados,
   componentes isolados e justificativas

Se quiser iterar, peça ao final: "regenerar tela X com variação Y" —
o Designer mantém os tokens e princípios deste prompt.

---

## ⬇️ Prompt para colar

---COPY---

```xml
<role>
Você é Head of Design de um produto EdTech world-class. Seu padrão de
referência é Apple, Linear, Stripe, Vercel e Airbnb. Você NUNCA entrega
templates genéricos. Se a tela parece com qualquer outro produto, você
joga fora e recomeça.
</role>

<mission>
Projetar a interface completa (Aluno + Professor) do "Controle de
Trabalhos" — sistema de avaliação automatizada por IA para cursos de
saúde (Farmácia, Biomedicina). O app substitui a correção manual de
trabalhos acadêmicos usando Gemini + OCR, com rubricas dinâmicas
customizáveis pelo professor.
</mission>

<principles>
1. Dark-first. Tipografia editorial (Inter + JetBrains Mono).
2. Densidade de informação Linear/Stripe, não Material Design.
3. Movimento tem propósito — nada decorativo. Toda animação ≤ 200ms.
4. Zero abstração ornamental: sem gradientes arco-íris, sem drop-shadows
   exagerados, sem ilustrações genéricas de "people working".
5. Foco em legibilidade de scanning — professor precisa triar 70 trabalhos
   em 5 minutos.
6. Acessibilidade AA obrigatória (contraste 4.5:1, focus rings visíveis,
   navegação por teclado em 100% das ações).
7. Mobile-first no fluxo do aluno. Desktop-first no painel do professor.
</principles>

<design_tokens>
Cores base (dark):
- Background: #09090B (zinc-950)
- Surface:    #18181B (zinc-900)
- Border:     #27272A (zinc-800)
- Text primary:   #FAFAFA
- Text secondary: #A1A1AA
- Text muted:     #52525B

Acento (usar com parcimônia):
- Primary:  #3B82F6 (azul — ações principais)
- Success:  #10B981 (aprovação, notas ≥ 7)
- Warning:  #F59E0B (pendente revisão)
- Danger:   #EF4444 (cópia detectada, rejeição)

Grade de nota (contextual):
- 9.0-10: #10B981
- 7.0-8.9: #3B82F6
- 5.0-6.9: #F59E0B
- 0-4.9:   #EF4444

Tipografia:
- Display: Inter Tight 600, tracking -0.02em
- Body:    Inter 400-500
- Mono:    JetBrains Mono 400 (OCR, códigos, notas)
- Escala: 12/13/14/16/20/24/32/48

Espaçamento: base 4px. Usar apenas 4, 8, 12, 16, 24, 32, 48, 64, 96.
Radius: 6 (inputs), 8 (cards), 12 (modals), 9999 (pills).
Shadow: uma única sombra sutil — 0 1px 3px rgba(0,0,0,0.4).
</design_tokens>

<personas>
<persona id="aluno">
- 18-24 anos, maioria usando celular (iPhone/Android ~60/40)
- Pressão de prazo, envia em cima da hora
- Pode estar em grupo (até 3 pessoas)
- Conexão instável em sala de aula
- Não quer login, quer enviar e esquecer
</persona>

<persona id="professor">
- Docente universitário, 35-55 anos, desktop (1440p+)
- Corrige 50-150 trabalhos por disciplina, por semestre
- Critério é pessoal, muda por aula — precisa editar rubricas
- Vai cadastrar disciplinas novas a cada semestre
- Precisa importar listas de alunos (CSV ou colagem)
- Exporta notas para diário oficial
- Detesta interfaces cheias de cliques
</persona>
</personas>

<screens>

<screen id="student_01_form">
Formulário de envio (Aluno). Mobile-first, single column, ≤ 640px.

Hierarquia vertical:
1. Header minimalista — apenas logo pequeno + "Entrega de Trabalho"
2. Stepper horizontal de 3 passos: Identificação → Arquivo → Confirmar
3. PASSO 1: Seletor de Disciplina (dropdown custom com busca),
   seguido de "Meu nome" (combobox com autocomplete da lista de alunos
   da disciplina selecionada), botão "+ Adicionar colega" (máx 2),
   WhatsApp e Email institucional
4. PASSO 2: Dropzone grande (ocupa 60% da tela), com estados:
   idle / dragging / uploading (com progress bar real) / success / error.
   Preview do arquivo com ícone por tipo (PDF, JPG, PNG).
   Texto de ajuda mínimo: "PDF, JPG ou PNG · até 45MB"
5. PASSO 3: Revisão em card denso com todas as informações,
   botão único "Enviar trabalho" em blue-600, full-width.
6. Tela de sucesso: checkmark animado (Lottie ou SVG próprio,
   NUNCA genérico), mensagem "Entrega confirmada" e ID de protocolo
   mono-space para print. Botão discreto "Nova entrega".

Estados críticos a mostrar:
- Validação inline (não bloqueante até tentar avançar)
- "Aluno já entregou este trabalho" → bloqueio com mensagem clara
- Upload em progresso → barra real de %, não spinner infinito
- Falha de rede → retry button, nunca "algo deu errado"
</screen>

<screen id="professor_01_dashboard">
Dashboard principal (Professor). Desktop 1440px+.

Layout em 3 zonas:
1. SIDEBAR ESQUERDA (240px, fixa):
   - Logo + nome do professor
   - Navegação: Trabalhos · Disciplinas · Alunos · Relatórios · Config
   - Rodapé com status de sync em tempo real (dot verde pulsando)

2. ÁREA PRINCIPAL:
   - Barra superior com: filtro de disciplina (pill selector),
     busca (cmd+k), range de data, botão "Processar pendentes em lote"
   - 4 cards KPI em linha: Total · Aguardando IA · Pendentes revisão ·
     Média da turma. Cards densos, número grande mono, label pequeno.
   - Alertas de integridade (se houver cópia entre grupos): banner
     vermelho denso no topo, com botão "Ver comparação"
   - TABELA de submissões (não cards!) — densidade Linear:
     colunas: Status · Alunos · Disciplina · Enviado · Nota IA · Ação
     - Status como dot colorido + label curto
     - Nota como number + badge de cor contextual
     - Hover revela ações inline (Ver · Reprocessar · Excluir)
     - Clique na linha abre o modal lateral (não modal central)
   - Paginação discreta no rodapé

3. PAINEL LATERAL (drawer direito, 560px, abre sobre a tabela):
   - Preview do documento original (PDF embed ou imagem)
   - Texto extraído (OCR) em mono-space, toggle visibilidade
   - Rubrica com sliders por critério — cada slider mostra valor da IA
     em cinza atrás e valor editado em azul. Soma dinâmica no rodapé.
   - Campo de feedback livre (rich-text mínimo: bold, italic, list)
   - Scores de plágio e uso de IA como barras horizontais
   - 3 ações: "Devolver para refazer" · "Reprocessar com IA" · "Publicar nota"
</screen>

<screen id="professor_02_disciplinas">
Gestão de Disciplinas (Professor). NOVA — não existia no v1.

Layout:
- Header com botão "+ Nova Disciplina"
- Grid de cards de disciplina (3 colunas, 1440px), cada card:
  - Nome grande
  - Código curto (ex: PARA-2026.1)
  - Badges: "X critérios" · "Y alunos" · "Z entregas"
  - Footer com "Editar rubrica" · "Editar alunos" · menu de 3 pontos
- Modal de criação/edição em 3 abas:
  1. INFO: Nome, código, curso, período, ano/semestre
  2. RUBRICA: Tabela editável de critérios (nome, descrição, peso),
     botão "+ Adicionar critério", drag-to-reorder. Soma dos pesos
     mostrada em tempo real com alerta se ≠ 10
  3. PERGUNTAS: Lista de perguntas obrigatórias que o aluno deve
     responder, com drag-to-reorder
  4. REGRAS CUSTOM (opcional): textarea grande mono-space para o
     professor injetar instruções adicionais no prompt da IA,
     com contador de tokens e preview de como fica no system prompt
</screen>

<screen id="professor_03_alunos">
Gestão de Alunos (Professor). NOVA — não existia no v1.

Layout:
- Seletor de disciplina no topo (não é lista global — lista por disciplina)
- Toolbar: "+ Adicionar aluno" · "Importar lista" · "Exportar CSV"
- Tabela densa: Nome · Email (opcional) · Presente em X entregas · Ação
- Modal "Importar lista":
  - 2 abas: COLAR TEXTO / ENVIAR CSV
  - COLAR TEXTO: textarea que aceita um-nome-por-linha, com parser
    inteligente (ignora linhas vazias, trim, uppercase opcional)
  - Preview de quantos nomes foram detectados antes de confirmar
  - Se já existem alunos, mostrar diff: "X novos · Y já existiam"
- Ações inline na tabela: editar · remover (com confirmação)
</screen>

<screen id="professor_04_reports">
Relatórios (Professor).

Layout:
- Filtros: disciplina (obrigatório) · período · status
- 3 visualizações toggle:
  1. POR ALUNO: tabela com cada aluno individualmente
     (expandindo grupos), nota final, status
  2. POR GRUPO: tabela com o grupo inteiro, nota compartilhada
  3. POR CRITÉRIO: heatmap — alunos nas linhas, critérios nas colunas,
     cor de cada célula indica desempenho
- Botões: "Baixar Excel" · "Exportar para diário" · "Imprimir"
- Layout de impressão separado (versão A4, preto e branco,
  sem cores, tipografia serif para formalidade oficial)
</screen>

<screen id="professor_05_login">
Login do Professor.

- Tela centralizada, fundo zinc-950 sólido
- Card 400px com logo, título "Acesso restrito",
  e UM ÚNICO botão: "Entrar com Google" (OAuth via Firebase Auth)
- NUNCA senha em plaintext. NUNCA campo de API key exposto.
- Após login, verificar claim `role: professor` no servidor antes
  de liberar acesso. Se o usuário logou mas não é professor,
  tela de "Acesso não autorizado" com contato do admin.
- Link pequeno no rodapé: "Sou aluno, quero entregar trabalho"
</screen>

</screens>

<interactions>
- Cmd+K em qualquer tela → command palette (busca global de ações)
- Hover em linha da tabela → ações inline fade-in em 100ms
- Drag em arquivo no dashboard → abre zona de upload inline
- Skeleton loaders em TODAS as áreas com dados assíncronos,
  nunca spinners genéricos centralizados
- Tabelas com sort por coluna (clique no header) e scroll horizontal
  com sombra indicativa nas bordas quando há overflow
- Notificações (toasts) no canto inferior direito, auto-dismiss 4s,
  com ação de desfazer onde aplicável
- Modais fecham com ESC, clique fora ou X. NUNCA modal bloqueante
  sem escape.
</interactions>

<constraints>
- Proibido: emojis decorativos, ilustrações stock, gradientes
  coloridos, border-radius inconsistente, mais de 1 fonte serif/sans.
- Performance: LCP ≤ 1.2s, INP ≤ 200ms, CLS ≤ 0.05
- Acessibilidade: contraste AA, focus visível, aria-labels em ícones,
  navegação por teclado, prefers-reduced-motion respeitado
- Responsivo: fluxo do aluno perfeito em 360px. Painel do professor
  funcional em 1024px, ótimo em 1440px+
- Dark mode é o PADRÃO. Light mode é a variante opcional.
</constraints>

<deliverables>
Para cada tela, entregar:
1. Mockup high-fidelity em resolução base (mobile 390px / desktop 1440px)
2. Estados: idle, loading, empty, error, success
3. Componentes isolados usados (com variantes)
4. Justificativa de uma decisão não-óbvia por tela
5. Lista do que foi conscientemente CORTADO e por quê
</deliverables>

<anti_patterns>
Reprove automaticamente qualquer proposta que:
- Use ilustração de personagem abstrato (blob people)
- Tenha mais de 2 cores de acento na mesma tela
- Coloque ícone antes de CADA label de menu
- Use gradient background em card
- Tenha modal empilhado sobre modal
- Use animação com duração > 300ms
- Tenha mais de 3 níveis de hierarquia visual em um card
</anti_patterns>
```

---COPY---

---

## Notas sobre o prompt

- **Por que XML?** Opus 4.7 responde melhor a tags estruturadas para
  seções longas. Elas delimitam semanticamente melhor que markdown.
- **Por que dark-first?** Ver `02_constraints.md §UX-1`.
- **Por que tokens explícitos?** Sem tokens, o modelo gera cores
  diferentes por tela e a identidade quebra.
- **Por que anti-patterns?** Listar o que rejeitar é mais eficaz que
  só listar o que aceitar — o modelo precisa de contraste.

## Iterações sugeridas

Depois da primeira passada, peça:

1. `"Mostre o estado 'upload em progresso' da tela student_01_form em variação mobile 360px"`
2. `"O drawer do professor_01_dashboard com uma rubrica de 6 critérios em vez de 5"`
3. `"A variante light mode da professor_02_disciplinas"`
4. `"Empty state de professor_03_alunos quando o professor acabou de criar a disciplina"`
5. `"Layout de impressão A4 da professor_04_reports — só preto e branco, tipografia serif"`

## Referência cruzada com os docs do projeto

| Seção deste prompt | Doc correspondente |
|---|---|
| `<personas>` | [FORMULARIO.md §3](./FORMULARIO.md) |
| `<screens>` | [01_spec.md Partes I-II](./01_spec.md) |
| `<design_tokens>` | (canônico aqui — tokens de design vivem neste arquivo) |
| `<constraints>` | [02_constraints.md §4, §6](./02_constraints.md) |
| Login sem senha | [01_spec.md F-PR-01](./01_spec.md), [02_constraints.md §S-2](./02_constraints.md) |
| CRUD disciplinas/alunos | [01_spec.md F-PR-04, F-PR-05](./01_spec.md) |
