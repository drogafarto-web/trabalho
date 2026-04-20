# Persona — Aluno Lucas (trabalho individual fraco, pra testar nota baixa)

**Papel:** submitter de entrega superficial. Objetivo é validar que a IA
reconhece trabalho pobre e dá nota baixa coerentemente.

> Observação: apesar da atividade-alvo ser "em grupo", o Lucas envia
> sozinho propositalmente (1 aluno num grupo de até 4). Isso é válido
> pelo schema (`students` entre 1 e maxGroupSize).

## Dados pro form

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| Disciplina      | `Parasitologia Clínica · 2026.1`                   |
| Atividade       | `Trabalho · Revisão narrativa sobre Leishmaniose visceral` |
| Aluno 1         | `LUCAS MARTINS SOUZA`                              |
| WhatsApp        | `31955001234`                                      |
| E-mail          | *(email real do agente pra confirmar recibo)*      |
| Formato         | Arquivo                                            |
| Arquivo         | `test-fixtures/trabalhos/leishmaniose-ruim.pdf`    |

## Comportamento esperado

1. Submissão bem-sucedida (schema não bloqueia conteúdo fraco).
2. IA atribui nota **≤ 4.0 na rubrica** (0-10), com `scaledScore ≤ 3.2` (0-8).
3. Relatório deve apontar ausência de referências e superficialidade.
4. Lock de atividade criado pra `LUCAS` nesta atividade — tentativas de
   reenvio pelo mesmo aluno devem virar `REJECTED` (ver [cenário 9](../test-scenarios.md#9)).
