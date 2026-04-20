# Persona — Aluna Maria (AECO individual, PDF)

**Papel:** entrega AECO (Atividade de Ensino Centrada em Objeto) individual.
Testa modo `individual` + `accepts.file: true` + `accepts.url: false`.

## Dados pro form

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| Disciplina      | `Parasitologia Clínica · 2026.1`                   |
| Atividade       | `AECO · AECO — Caso clínico parasitário`           |
| Aluno           | `MARIA DA SILVA SANTOS`                            |
| WhatsApp        | `31999001234`                                      |
| E-mail          | *(email real do agente pra confirmar recibo)*      |
| Formato         | Arquivo (forçado — atividade não aceita URL)       |
| Arquivo         | `test-fixtures/trabalhos/aeco-caso-clinico.pdf`    |

## Comportamento esperado

1. No step 2 **não deve aparecer toggle Arquivo/Link** — a atividade só
   aceita arquivo (`accepts.url: false`), então o modo é fixo.
2. Campo de grupo não permite adicionar colega (modo `individual`).
3. Submissão bem-sucedida → IA escala nota 0-10 da rubrica pra 0-2
   (`maxScore` da AECO).
