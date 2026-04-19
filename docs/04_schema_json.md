---
doc_id: 04_schema_json
version: 1.0.0
depends_on: [FORMULARIO, 01_spec, 02_constraints, 03_stack]
purpose: Fonte única de verdade dos modelos de dados (Firestore, Zod, JSON Schema do Gemini). Se existe um schema aqui, ele é canônico. Divergir = bug.
---

# 04 — Schemas de Dados

> **Para o agente**: Esses schemas são a espinha dorsal do sistema.
> Para cada um existe uma definição Zod em `web/src/core/domain/*.ts`
> que deve estar 1:1 com este doc. Se você mexer em um, mexa no outro.

---

## 1. Coleções Firestore (mapa geral)

```
/professors/{uid}                     # 1 doc por professor logado
/disciplines/{disciplineId}           # disciplinas criadas pelo professor
/students/{studentId}                 # alunos (por disciplina via junction)
/discipline_students/{...}            # junction table
/submissions/{submissionId}           # trabalhos entregues
/submissions/{id}/similarity_matches/ # subcoleção: matches de plágio
/audit_log/{logId}                    # log imutável
/stats/{disciplineId}                 # agregados pré-computados
```

---

## 2. `professors/{uid}`

### Firestore document
```ts
{
  uid: string;                // = Firebase Auth UID
  email: string;              // Google email
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences: {
    defaultDiscipline: string | null;  // disciplineId
    tableDensity: 'compact' | 'comfortable';
  };
}
```

### Zod
```ts
export const ProfessorSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  photoURL: z.string().url().nullable(),
  createdAt: z.instanceof(Timestamp),
  lastLoginAt: z.instanceof(Timestamp),
  preferences: z.object({
    defaultDiscipline: z.string().nullable(),
    tableDensity: z.enum(['compact', 'comfortable']),
  }),
});
export type Professor = z.infer<typeof ProfessorSchema>;
```

### Regras Firestore (resumo)
- Read: próprio dono (`request.auth.uid == resource.id`)
- Write: apenas via Cloud Function admin (set-claim)

---

## 3. `disciplines/{disciplineId}`

### Firestore
```ts
{
  id: string;                          // auto-gerado
  ownerUid: string;                    // = professor.uid
  name: string;                        // "Parasitologia Clínica"
  code: string;                        // "PARA-2026.1" (auto, editável)
  course: 'Farmácia' | 'Biomedicina' | 'Outro';
  period: string;                      // "1º", "2º", ... "10º"
  semester: string;                    // "2026.1"
  rubric: {
    criteria: Array<{
      id: string;                      // slug auto
      name: string;                    // "identificacao_clinica"
      description: string;
      weight: number;                  // 0..10
      order: number;                   // para sort
    }>;
    questions: Array<{
      id: string;
      text: string;
      order: number;
    }>;
    customRules: string | null;        // max 2000 chars sanitizados
    version: number;                   // bump ao editar
  };
  deadline: Timestamp | null;          // prazo de entrega
  deletedAt: Timestamp | null;         // soft delete
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Zod
```ts
export const CriterionSchema = z.object({
  id: z.string(),
  name: z.string().regex(/^[a-z_]+$/),
  description: z.string().min(3).max(200),
  weight: z.number().int().min(0).max(10),
  order: z.number().int().nonnegative(),
});

export const RubricSchema = z.object({
  criteria: z.array(CriterionSchema).min(2).max(10)
    .refine(c => c.reduce((s, x) => s + x.weight, 0) === 10,
      { message: 'Soma dos pesos deve ser exatamente 10' }),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string().min(3).max(300),
    order: z.number().int().nonnegative(),
  })).min(1).max(10),
  customRules: z.string().max(2000).nullable(),
  version: z.number().int().nonnegative(),
});

export const DisciplineSchema = z.object({
  id: z.string(),
  ownerUid: z.string(),
  name: z.string().min(3).max(80),
  code: z.string().regex(/^[A-Z]{3,5}-\d{4}\.\d$/),
  course: z.enum(['Farmácia', 'Biomedicina', 'Outro']),
  period: z.string().regex(/^\d{1,2}º$/),
  semester: z.string().regex(/^\d{4}\.\d$/),
  rubric: RubricSchema,
  deadline: z.instanceof(Timestamp).nullable(),
  deletedAt: z.instanceof(Timestamp).nullable(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
```

### Regras Firestore
- Read: `ownerUid == request.auth.uid` OU usuário anônimo lendo
  apenas os campos públicos (`name`, `code`, para popular o form do aluno)
- Create/Update/Delete: `ownerUid == request.auth.uid`

### Índices necessários
```json
{ "collectionGroup": "disciplines",
  "fields": [
    {"fieldPath":"ownerUid","order":"ASCENDING"},
    {"fieldPath":"deletedAt","order":"ASCENDING"},
    {"fieldPath":"updatedAt","order":"DESCENDING"}
  ]
}
```

---

## 4. `students/{studentId}`

### Firestore
```ts
{
  id: string;
  ownerUid: string;                  // professor dono
  name: string;                      // uppercase por convenção
  email: string | null;
  note: string | null;
  archivedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Zod
```ts
export const StudentSchema = z.object({
  id: z.string(),
  ownerUid: z.string(),
  name: z.string().min(2).max(80).transform(s => s.toUpperCase().trim()),
  email: z.string().email().nullable(),
  note: z.string().max(500).nullable(),
  archivedAt: z.instanceof(Timestamp).nullable(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
```

---

## 5. `discipline_students/{disciplineId}_{studentId}` (junction)

### Firestore
```ts
{
  disciplineId: string;
  studentId: string;
  studentName: string;     // denormalizado para query rápida
  ownerUid: string;        // denormalizado para rules
  addedAt: Timestamp;
}
```

ID composto garante unicidade. Escrita via batch com `students`.

---

## 6. `submissions/{submissionId}`

### Firestore
```ts
{
  id: string;
  shortId: string;                       // "TRAB-7F3K" legível
  disciplineId: string;
  disciplineOwnerUid: string;            // denormalizado para rules
  rubricVersion: number;                 // congelado no momento do envio

  students: Array<{                      // grupo (1..3)
    id: string;                          // studentId
    name: string;                        // denormalizado
  }>;
  submitter: {                           // quem efetivamente enviou
    whatsapp: string;                    // +5531999999999
    email: string;
  };

  file: {
    storagePath: string;                 // submissions/{id}/original.pdf
    fileName: string;                    // nome original sanitizado
    mimeType: string;
    sizeBytes: number;
    sha256: string;                      // fingerprint para dedupe
  };

  status: 'WAITING_FOR_AI'
        | 'AI_PROCESSING'
        | 'PENDING_REVIEW'
        | 'APPROVED'
        | 'REJECTED';

  ai: {
    processedAt: Timestamp | null;
    model: string;                       // "gemini-2.5-flash"
    durationMs: number | null;
    extractedText: string | null;        // max 50k chars
    truncationNotice: string | null;     // aviso se > 30 págs
    evaluation: Evaluation | null;       // ver abaixo
    error: string | null;
  };

  review: {
    reviewedAt: Timestamp | null;
    reviewedByUid: string | null;
    finalEvaluation: Evaluation | null;  // após ajuste humano
    professorFeedback: string | null;    // max 5k chars
    manuallyAdjusted: boolean;           // true se difere da IA
  };

  plagiarism: {
    aiProbability: number;               // 0..1
    similarityScore: number;             // max Jaccard vs outros grupos
    topMatches: Array<{                  // até 5
      submissionId: string;
      jaccard: number;
    }>;
  };

  submittedAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Evaluation (subtipo reutilizado)
```ts
{
  criterionScores: Record<string, number>;  // { "identificacao_clinica": 2.5, ... }
  finalScore: number;                        // soma, 0..10, 1 casa decimal
  answers: string[];                         // 1 por pergunta da rubrica
  report: string;                            // relatório textual da IA/prof
}
```

### Zod
```ts
export const EvaluationSchema = z.object({
  criterionScores: z.record(z.string(), z.number().min(0).max(10)),
  finalScore: z.number().min(0).max(10),
  answers: z.array(z.string()),
  report: z.string().max(2000),
});

export const SubmissionStatusSchema = z.enum([
  'WAITING_FOR_AI', 'AI_PROCESSING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED',
]);

// (schema completo de Submission omitido aqui — segue o mesmo padrão)
```

### Regras Firestore (exemplo)
```js
match /submissions/{id} {
  // Aluno anônimo cria, mas só com campos aprovados
  allow create: if request.auth != null
    && request.resource.data.status == 'WAITING_FOR_AI'
    && request.resource.data.disciplineId is string;

  // Leitura apenas do dono da disciplina
  allow read: if resource.data.disciplineOwnerUid == request.auth.uid;

  // Atualização só por owner E só com custom claim
  allow update: if resource.data.disciplineOwnerUid == request.auth.uid
    && request.auth.token.role == 'professor';

  allow delete: if resource.data.disciplineOwnerUid == request.auth.uid
    && request.auth.token.role == 'professor';
}
```

### Índices necessários
- `disciplineId + status + submittedAt DESC`
- `disciplineOwnerUid + status + submittedAt DESC`
- `shortId` (único)

---

## 7. `submissions/{id}/similarity_matches/{matchId}`

Subcoleção, um doc por match acima do threshold.
```ts
{
  otherSubmissionId: string;
  jaccard: number;               // 0..1
  detectedAt: Timestamp;
}
```

---

## 8. `audit_log/{logId}`

### Firestore (imutável)
```ts
{
  id: string;
  timestamp: Timestamp;
  actorUid: string | null;       // null = system (Cloud Function)
  actorRole: 'professor' | 'student' | 'system';
  event: string;                 // ver lista em 01_spec §F-SYS-03
  targetType: 'submission' | 'discipline' | 'student' | 'auth';
  targetId: string;
  metadata: Record<string, unknown>;   // dados extras relevantes
  ip: string | null;
  userAgent: string | null;
}
```

### Regras
- `allow read: if request.auth.token.role == 'professor'`
- `allow update: if false` (imutável)
- `allow delete: if false`
- Create: apenas via Cloud Function com Admin SDK

---

## 9. `stats/{disciplineId}` (agregado)

Pré-computado por Cloud Function após cada `submission.published`.

```ts
{
  disciplineId: string;
  totalSubmissions: number;
  byStatus: Record<SubmissionStatus, number>;
  classAverage: number | null;         // média dos aprovados
  criterionAverages: Record<string, number>;
  lastUpdatedAt: Timestamp;
}
```

---

## 10. JSON Schema para o Gemini

Passado em `config.responseSchema` para `generateContent`.
**Deve espelhar a rubrica da disciplina.** Construído dinamicamente
a partir da rubrica versionada da submissão (não do atual!).

### Template
```ts
import { Type } from '@google/genai';

export function buildGeminiSchema(rubric: Rubric) {
  const criterionProps: Record<string, unknown> = {};
  for (const c of rubric.criteria) {
    criterionProps[c.name] = {
      type: Type.NUMBER,
      description: `Nota para "${c.description}". Valor entre 0 e ${c.weight}.`,
    };
  }

  return {
    type: Type.OBJECT,
    required: ['avaliacao', 'plagio', 'relatorio', 'respostas', 'texto_extraido'],
    properties: {
      avaliacao: {
        type: Type.OBJECT,
        required: [...rubric.criteria.map(c => c.name), 'nota_final'],
        properties: {
          ...criterionProps,
          nota_final: {
            type: Type.NUMBER,
            description: 'Soma das notas dos critérios. Entre 0 e 10.',
          },
        },
      },
      plagio: {
        type: Type.OBJECT,
        required: ['indice_uso_ia'],
        properties: {
          indice_uso_ia: {
            type: Type.NUMBER,
            description: 'Probabilidade de 0.0 a 1.0 de uso de IA na escrita.',
          },
        },
      },
      relatorio: {
        type: Type.STRING,
        description: 'Relatório técnico conciso (3-4 frases) justificando notas.',
      },
      respostas: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `Exatamente ${rubric.questions.length} respostas, na ordem das perguntas.`,
      },
      texto_extraido: {
        type: Type.STRING,
        description: 'Texto completo extraído via OCR (max 50000 chars).',
      },
    },
  };
}
```

### System prompt (template)
```
Você é um professor universitário sênior de {disciplineName}.
Tarefa: corrigir trabalho acadêmico da área de {course}.

Regras:
1. Atribua notas rigorosas baseadas nos critérios.
2. Se receber imagem ou PDF escaneado, faça OCR visual COMPLETO.
3. Detecte indícios de uso de IA generativa.
4. Retorne APENAS JSON válido no schema fornecido. Zero markdown.

Critérios (peso máximo entre parênteses):
{criteria_list}

Perguntas a responder a partir do texto:
{questions_list}

{custom_rules_block}
```

### Sanitização de `customRules`
Ver `07_examples.md` → `sanitize-custom-rules`. Regras-chave:
- Remover tentativas de escape (ex: `</system_instruction>`)
- Delimitar com marcadores fortes:
  `<regras_professor>…</regras_professor>`
- Limitar a 2000 chars

---

## 11. Contratos client ↔ server (Cloud Functions callable)

### `gradeSubmission`
```ts
// Input (Zod)
const GradeSubmissionInput = z.object({
  submissionId: z.string(),
  force: z.boolean().default(false),   // reprocessar mesmo se já avaliado
});

// Output
{
  success: true,
  durationMs: number,
  evaluation: Evaluation,
} | {
  success: false,
  error: 'RATE_LIMITED' | 'AI_TIMEOUT' | 'INVALID_FILE' | 'UNKNOWN',
  message: string,
}
```

### `importStudents`
```ts
const ImportStudentsInput = z.object({
  disciplineId: z.string(),
  source: z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), raw: z.string().max(50000) }),
    z.object({ type: z.literal('csv'), csv: z.string().max(200000) }),
  ]),
  uppercase: z.boolean().default(true),
});

// Output
{
  inserted: number,
  duplicatesSkipped: number,
  conflicts: Array<{ name: string; existing: {email: string}; incoming: {email: string} }>,
  errors: Array<{ line: number; reason: string }>,
}
```

### `setProfessorClaim` (admin only)
```ts
// Apenas o dono do produto executa, via chamada autenticada com
// email fixo (allowlist em Secret Manager).
{
  email: string;    // email do novo professor
  action: 'grant' | 'revoke';
}
```

---

## 12. Migrations (quando schema muda)

Regras:
- Schema mudou → bump `rubric.version` (se for rubrica) ou `schemaVersion` global em `meta/config`
- Migração via Cloud Function one-shot, logado em `audit_log`
- Sempre copy-on-write: documentos antigos mantêm versão antiga
- Documento nunca muda de formato retroativamente sem nova cópia
