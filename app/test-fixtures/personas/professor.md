# Persona — Professor

**Nome:** Otávio Andrade
**Email / login:** `drogafarto@gmail.com` (credencial real do owner)
**Role:** `professor` (custom claim já setada)
**Instituição fictícia:** Labclin MG — Centro Universitário

## Objetivo

Popular o sistema com disciplinas, etapas, atividades e alunos via **Importar
(XLSX)**, receber as submissões dos alunos, revisar e publicar notas.

## Login

1. Acessa `https://trabalhos-e0647.web.app/login`
2. Clica em "Entrar com Google"
3. Escolhe a conta `drogafarto@gmail.com`
4. É redirecionado pro `/dashboard`

## Disciplinas que o professor mantém (pós-import)

| Código       | Nome                     | Curso       | Período | Etapas ativas |
|--------------|--------------------------|-------------|---------|---------------|
| PARA-2026.1  | Parasitologia Clínica    | Biomedicina | 5º      | 1ª, 2ª        |
| FARM-2026.1  | Farmacologia Clínica     | Farmácia    | 6º      | 1ª            |

## Rubricas

### PARA-2026.1 (soma = 10)

- `conteudo_tecnico` peso **4** — profundidade técnica e correção
- `estrutura_apresentacao` peso **3** — organização e coerência
- `referencias_fundamentacao` peso **3** — qualidade das referências

**Perguntas:**
1. Qual a principal conclusão apresentada?
2. Quais limitações foram identificadas?

**Regras customizadas:** exigir ao menos 3 referências indexadas publicadas nos últimos 5 anos.

### FARM-2026.1 (soma = 10)

- `raciocinio_clinico` peso **5**
- `evidencias` peso **3**
- `clareza` peso **2**

## Atividades abertas

| Disciplina   | Etapa   | Tipo      | Título                                           | Max score | Mode       | Aceita        |
|--------------|---------|-----------|--------------------------------------------------|-----------|------------|---------------|
| PARA-2026.1  | 2026/1  | trabalho  | Revisão narrativa sobre Leishmaniose visceral    | 8         | group (≤4) | arquivo + URL |
| PARA-2026.1  | 2026/1  | aeco      | AECO — Caso clínico parasitário                  | 2         | individual | arquivo       |
| PARA-2026.1  | 2026/2  | trabalho  | Seminário — Toxoplasmose congênita               | 10        | group (≤5) | arquivo + URL |
| FARM-2026.1  | 2026/1  | trabalho  | Revisão — Anti-hipertensivos de primeira linha   | 10        | group (≤5) | arquivo       |
