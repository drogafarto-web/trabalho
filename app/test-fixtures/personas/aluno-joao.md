# Persona — Aluno João (submitter de trabalho em grupo, PDF)

**Papel:** submitter do trabalho em grupo sobre Leishmaniose visceral.
Exercita o fluxo de entrega em grupo com arquivo PDF bem-feito.

## Dados pro form

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| Disciplina      | `Parasitologia Clínica · 2026.1`                   |
| Atividade       | `Trabalho · Revisão narrativa sobre Leishmaniose visceral` |
| Aluno 1         | `JOÃO PEDRO PEREIRA`                               |
| Aluno 2         | `MARIA DA SILVA SANTOS`                            |
| Aluno 3         | `PEDRO HENRIQUE COSTA`                             |
| WhatsApp        | `31988001234`                                      |
| E-mail          | *(email real do agente, pra confirmar recibo)*    |
| Formato         | Arquivo                                            |
| Arquivo         | `test-fixtures/trabalhos/leishmaniose-grupo.pdf`   |

## Comportamento esperado

1. Form aceita a disciplina e lista atividades agrupadas por etapa.
2. Na atividade selecionada, step 2 mostra toggle **Arquivo / Link** (atividade aceita os dois).
3. Aluno seleciona Arquivo → dropzone aceita o PDF.
4. Submissão bem-sucedida → tela de sucesso com protocolo `TRAB-XXXX`.
5. Em até 30 s, chega email de recibo no endereço informado (se Resend estiver configurado).
6. Após ~60 s o status muda de `WAITING_FOR_AI` → `PENDING_REVIEW` no dashboard do professor.
7. A avaliação da IA deve dar nota ≥ 7.0 na rubrica (0-10), escalando pra ≥ 5.6 no `scaledScore` (0-8).
