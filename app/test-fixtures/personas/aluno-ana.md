# Persona — Aluna Ana (AECO individual, DOCX)

**Papel:** exerciza o suporte a `.docx` adicionado na Fase 4.2 (mammoth).
Mesmo fluxo da Maria, mas com arquivo Word em vez de PDF.

## Dados pro form

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| Disciplina      | `Parasitologia Clínica · 2026.1`                   |
| Atividade       | `AECO · AECO — Caso clínico parasitário`           |
| Aluno           | `ANA CLARA OLIVEIRA`                               |
| WhatsApp        | `31966001234`                                      |
| E-mail          | *(email real do agente pra confirmar recibo)*      |
| Formato         | Arquivo                                            |
| Arquivo         | `test-fixtures/trabalhos/aeco-caso-clinico.docx`   |

## Comportamento esperado

1. Dropzone aceita `.docx` (mime `application/vnd.openxmlformats-officedocument.wordprocessingml.document` OU extensão `.docx`).
2. Backend extrai texto via **mammoth** (ver `extract-content.ts`) → passa como `kind: 'text'` pro Gemini.
3. Nota deve ser coerente com conteúdo do caso clínico (≥ 6.0 na rubrica).
