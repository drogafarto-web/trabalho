# Persona — Entrega por YouTube (Fase 4.3)

**Papel:** testa o fluxo novo de entrega via URL. Usa o trabalho em grupo
da Parasitologia, que tem `accepts.url: true`.

Para evitar duplicata com a persona [João](aluno-joao.md), este aluno usa
uma combinação diferente do grupo — **Ana + Isabela** — e entrega vídeo no
lugar de PDF.

> Requer que a persona do João **ainda não tenha** submetido pra essa
> atividade, OU que este teste rode antes. O lock de atividade impede que
> o mesmo aluno apareça em duas submissões pra mesma activity.

## Dados pro form

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| Disciplina      | `Parasitologia Clínica · 2026.1`                   |
| Atividade       | `Trabalho · Revisão narrativa sobre Leishmaniose visceral` |
| Aluno 1         | `ISABELA RIBEIRO DUARTE`                           |
| Aluno 2         | `BRUNO CARVALHO ALVES`                             |
| WhatsApp        | `31911001234`                                      |
| E-mail          | *(email real do agente pra confirmar recibo)*      |
| Formato         | **Link**                                           |
| URL             | *(URL do YouTube — ver nota abaixo)*               |

## Escolha da URL

**Escolha manualmente** um vídeo real do YouTube que pareça um seminário
acadêmico sobre leishmaniose visceral (3–10 min, conteúdo técnico). Exemplos
plausíveis: aula gravada em canal universitário, boletim epidemiológico, etc.

A URL precisa bater no regex:
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`
- `https://www.youtube.com/embed/...`

## Comportamento esperado

1. Step 2 mostra toggle **Arquivo / Link** (atividade aceita os dois).
2. Seleciona **Link** → input de URL aparece.
3. Cola a URL → feedback verde "Link do YouTube reconhecido" aparece.
4. Submissão bem-sucedida, **sem upload pro Storage** (doc tem `file: null`, `submittedUrl: { url, kind: 'youtube' }`).
5. Recibo no email menciona "Link entregue" em vez de "Arquivo" + CTA vira "Abrir link enviado".
6. Gemini processa o vídeo via `fileData.fileUri` e gera avaliação.
7. Dashboard do professor renderiza o card com link clicável (não tenta
   preview de PDF).

## Casos de falha

- Cola uma URL não-YouTube (ex: Vimeo) → form mostra erro "Por enquanto só aceitamos links do YouTube"; botão "Próximo" fica desabilitado.
- Professor troca pra Anthropic/Qwen em `/config` e tenta reprocessar →
  grading falha com erro `UNSUPPORTED_CONTENT` e mensagem "troque o provider em /config".
