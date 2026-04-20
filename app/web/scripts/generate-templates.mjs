/**
 * Gera os templates XLSX pré-formatados pro professor baixar e preencher.
 * Saída: app/web/public/templates/{estrutura,alunos}.xlsx — servidos
 * estaticamente pelo Vite/Firebase Hosting.
 *
 * Rodar: npm run generate:templates
 *
 * Se mudar um schema de domínio (discipline/term/assignment/student),
 * regenere os templates pra garantir que batem 1:1 com as validações Zod.
 */

import ExcelJS from 'exceljs';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'templates');

// -----------------------------------------------------------------------------
// Design tokens (dark editorial — combina com a UI)
// -----------------------------------------------------------------------------
const INK = 'FF0B0B0F';
const VIOLET = 'FF6366F1';
const WHITE = 'FFFFFFFF';
const MUTED = 'FF6B7280';
const SOFT = 'FFF4F4F5';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
const HEADER_FONT = { bold: true, color: { argb: WHITE }, size: 11, name: 'Calibri' };
const HEADER_ALIGN = { vertical: 'middle', horizontal: 'left', indent: 1 };
const HEADER_BORDER = { bottom: { style: 'medium', color: { argb: VIOLET } } };

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function styleHeader(sheet, row = 1) {
  const headerRow = sheet.getRow(row);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGN;
    cell.border = HEADER_BORDER;
  });
  headerRow.height = 28;
  sheet.views = [{ state: 'frozen', ySplit: row }];
}

function addInstructionsSheet(wb, title, blocks) {
  const sheet = wb.addWorksheet('Leia-me', {
    properties: { tabColor: { argb: VIOLET } },
    views: [{ showGridLines: false }],
  });
  sheet.columns = [{ width: 110 }];
  sheet.getColumn(1).alignment = { wrapText: true, vertical: 'top' };

  const t = sheet.getCell('A1');
  t.value = title;
  t.font = { bold: true, size: 20, name: 'Calibri', color: { argb: INK } };
  sheet.getRow(1).height = 36;

  let r = 3;
  for (const block of blocks) {
    if (block.heading) {
      const c = sheet.getCell(`A${r}`);
      c.value = block.heading;
      c.font = { bold: true, size: 13, name: 'Calibri', color: { argb: VIOLET } };
      sheet.getRow(r).height = 22;
      r++;
    }
    for (const line of block.lines ?? []) {
      const c = sheet.getCell(`A${r}`);
      c.value = line.startsWith('•') ? line : line;
      c.font = { size: 11, name: 'Calibri', color: { argb: INK } };
      r++;
    }
    r++; // blank spacer
  }
  return sheet;
}

function setColumns(sheet, defs) {
  sheet.columns = defs.map((d) => ({ header: d.header, key: d.key, width: d.width }));
}

/**
 * Aplica formatação alternada (zebra) pra facilitar leitura das linhas
 * Garante que colunas com tipo data exibem formato dd/mm/yyyy.
 */
function polishDataRows(sheet, dateColumnKeys = []) {
  const lastRow = sheet.lastRow?.number ?? 1;
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const isEven = r % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { size: 11, name: 'Calibri', color: { argb: INK } };
      if (!isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    });
    row.height = 22;
  }
  for (const key of dateColumnKeys) {
    const col = sheet.getColumn(key);
    if (col) col.numFmt = 'dd/mm/yyyy';
  }
}

function addListValidation(sheet, ref, values, { errorTitle, error } = {}) {
  sheet.dataValidations.add(ref, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${values.join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: errorTitle ?? 'Valor inválido',
    error: error ?? `Valores aceitos: ${values.join(', ')}`,
  });
}

function addNumberValidation(sheet, ref, min, max, { errorTitle, error } = {}) {
  sheet.dataValidations.add(ref, {
    type: 'whole',
    operator: 'between',
    allowBlank: true,
    formulae: [min, max],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: errorTitle ?? 'Número fora do intervalo',
    error: error ?? `Informe um número inteiro entre ${min} e ${max}`,
  });
}

function addDecimalValidation(sheet, ref, min, max, { errorTitle, error } = {}) {
  sheet.dataValidations.add(ref, {
    type: 'decimal',
    operator: 'between',
    allowBlank: true,
    formulae: [min, max],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: errorTitle ?? 'Número fora do intervalo',
    error: error ?? `Informe um número entre ${min} e ${max}`,
  });
}

// -----------------------------------------------------------------------------
// TEMPLATE 1 — estrutura.xlsx (disciplinas, etapas, atividades)
// -----------------------------------------------------------------------------
async function generateEstrutura() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Controle de Trabalhos';
  wb.created = new Date();
  wb.modified = new Date();

  addInstructionsSheet(wb, 'Estrutura acadêmica — como preencher', [
    {
      heading: 'Ordem de preenchimento',
      lines: [
        '1. Preencha a aba Disciplinas — uma linha por disciplina',
        '2. Preencha Etapas — vincule cada etapa ao código da disciplina',
        '3. Preencha Atividades — vincule a disciplina + etapa',
      ],
    },
    {
      heading: 'Código da disciplina',
      lines: [
        'Formato: PARA-2026.1 (3 a 5 letras maiúsculas, traço, ano, ponto, semestre)',
        'Exemplos: PARA-2026.1, FARM-2026.2, BIOQ-2026.1',
        'O mesmo código é usado pra vincular etapas e atividades nas outras abas.',
      ],
    },
    {
      heading: 'Rubrica (aba Disciplinas)',
      lines: [
        'A rubrica é a base da correção por IA — define o que vale nota.',
        'A soma dos pesos dos critérios deve ser EXATAMENTE 10.',
        'Mínimo 2 critérios, máximo 5 (se precisar de mais, duplique as colunas).',
        'Nome do critério em snake_case (ex: conteudo_tecnico, referencias).',
        'Perguntas são opcionais — servem pra guiar o aluno no formulário.',
      ],
    },
    {
      heading: 'Campos com dropdown',
      lines: [
        '• course: Farmácia, Biomedicina, Outro',
        '• period: 1º a 10º',
        '• kind (atividade): trabalho, aeco',
        '• mode (atividade): individual, group',
        '• status (atividade): draft, open, closed (padrão: open)',
        '• accepts_file / accepts_url: TRUE ou FALSE',
      ],
    },
    {
      heading: 'Datas',
      lines: [
        'Use o formato de data nativo do Excel/Google Sheets (ex: 30/04/2026).',
        'Campos de data opcionais (starts_at, ends_at, due_at, deadline) podem ficar vazios.',
      ],
    },
    {
      heading: 'No import',
      lines: [
        'Cada linha nova vira um registro novo no sistema.',
        'Se já existir uma disciplina com o mesmo código, o import vai perguntar antes.',
        'Toda a rubrica é criada junto com a disciplina.',
        'Etapas e atividades só conseguem ser importadas se a disciplina referenciada existir.',
      ],
    },
  ]);

  // ---------------------------------------------------------------------------
  // Aba Disciplinas
  // ---------------------------------------------------------------------------
  const disc = wb.addWorksheet('Disciplinas', {
    properties: { tabColor: { argb: INK } },
  });
  setColumns(disc, [
    { header: 'code', key: 'code', width: 14 },
    { header: 'name', key: 'name', width: 32 },
    { header: 'course', key: 'course', width: 14 },
    { header: 'period', key: 'period', width: 10 },
    { header: 'semester', key: 'semester', width: 12 },
    { header: 'deadline', key: 'deadline', width: 14 },
    { header: 'criterio_1_nome', key: 'c1n', width: 22 },
    { header: 'criterio_1_descricao', key: 'c1d', width: 40 },
    { header: 'criterio_1_peso', key: 'c1p', width: 14 },
    { header: 'criterio_2_nome', key: 'c2n', width: 22 },
    { header: 'criterio_2_descricao', key: 'c2d', width: 40 },
    { header: 'criterio_2_peso', key: 'c2p', width: 14 },
    { header: 'criterio_3_nome', key: 'c3n', width: 22 },
    { header: 'criterio_3_descricao', key: 'c3d', width: 40 },
    { header: 'criterio_3_peso', key: 'c3p', width: 14 },
    { header: 'criterio_4_nome', key: 'c4n', width: 22 },
    { header: 'criterio_4_descricao', key: 'c4d', width: 40 },
    { header: 'criterio_4_peso', key: 'c4p', width: 14 },
    { header: 'criterio_5_nome', key: 'c5n', width: 22 },
    { header: 'criterio_5_descricao', key: 'c5d', width: 40 },
    { header: 'criterio_5_peso', key: 'c5p', width: 14 },
    { header: 'pergunta_1', key: 'q1', width: 40 },
    { header: 'pergunta_2', key: 'q2', width: 40 },
    { header: 'pergunta_3', key: 'q3', width: 40 },
    { header: 'regras_customizadas', key: 'rules', width: 48 },
  ]);
  disc.addRow({
    code: 'PARA-2026.1',
    name: 'PARASITOLOGIA CLÍNICA',
    course: 'Biomedicina',
    period: '5º',
    semester: '2026.1',
    deadline: new Date(2026, 5, 30),
    c1n: 'conteudo_tecnico',
    c1d: 'Profundidade técnica e correção do conteúdo apresentado',
    c1p: 4,
    c2n: 'estrutura_apresentacao',
    c2d: 'Organização, clareza e coerência textual',
    c2p: 3,
    c3n: 'referencias_fundamentacao',
    c3d: 'Qualidade das referências e fundamentação científica',
    c3p: 3,
    q1: 'Qual a principal conclusão do trabalho?',
    q2: 'Quais limitações foram identificadas?',
    rules: 'Exigir ao menos 3 referências indexadas publicadas nos últimos 5 anos.',
  });
  disc.addRow({
    code: 'FARM-2026.1',
    name: 'FARMACOLOGIA CLÍNICA',
    course: 'Farmácia',
    period: '6º',
    semester: '2026.1',
    c1n: 'raciocinio_clinico',
    c1d: 'Qualidade do raciocínio clínico e justificativa terapêutica',
    c1p: 5,
    c2n: 'evidencias',
    c2d: 'Uso apropriado de evidências científicas',
    c2p: 3,
    c3n: 'clareza',
    c3d: 'Clareza e objetividade da exposição',
    c3p: 2,
    q1: 'Qual o mecanismo de ação do fármaco principal?',
  });
  styleHeader(disc);
  polishDataRows(disc, ['deadline']);

  // Validações
  addListValidation(disc, 'C2:C1000', ['Farmácia', 'Biomedicina', 'Outro'], {
    errorTitle: 'Curso inválido',
    error: 'Use Farmácia, Biomedicina ou Outro',
  });
  addListValidation(disc, 'D2:D1000', ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º'], {
    errorTitle: 'Período inválido',
    error: 'Escolha de 1º a 10º',
  });
  for (const col of ['I', 'L', 'O', 'R', 'U']) {
    addNumberValidation(disc, `${col}2:${col}1000`, 0, 10, {
      errorTitle: 'Peso inválido',
      error: 'Pesos devem ser inteiros de 0 a 10. Soma total deve dar 10.',
    });
  }

  // ---------------------------------------------------------------------------
  // Aba Etapas
  // ---------------------------------------------------------------------------
  const terms = wb.addWorksheet('Etapas', {
    properties: { tabColor: { argb: INK } },
  });
  setColumns(terms, [
    { header: 'discipline_code', key: 'dc', width: 16 },
    { header: 'year', key: 'year', width: 10 },
    { header: 'number', key: 'number', width: 10 },
    { header: 'label', key: 'label', width: 28 },
    { header: 'starts_at', key: 'starts_at', width: 14 },
    { header: 'ends_at', key: 'ends_at', width: 14 },
  ]);
  terms.addRow({
    dc: 'PARA-2026.1',
    year: 2026,
    number: 1,
    label: '1ª etapa 2026',
    starts_at: new Date(2026, 1, 3),
    ends_at: new Date(2026, 3, 30),
  });
  terms.addRow({
    dc: 'PARA-2026.1',
    year: 2026,
    number: 2,
    starts_at: new Date(2026, 4, 5),
    ends_at: new Date(2026, 6, 15),
  });
  terms.addRow({ dc: 'FARM-2026.1', year: 2026, number: 1 });
  styleHeader(terms);
  polishDataRows(terms, ['starts_at', 'ends_at']);

  addNumberValidation(terms, 'B2:B1000', 2020, 2100, {
    errorTitle: 'Ano inválido',
    error: 'Informe um ano entre 2020 e 2100',
  });
  addNumberValidation(terms, 'C2:C1000', 1, 8, {
    errorTitle: 'Número de etapa inválido',
    error: 'Informe um número de 1 a 8',
  });

  // ---------------------------------------------------------------------------
  // Aba Atividades
  // ---------------------------------------------------------------------------
  const acts = wb.addWorksheet('Atividades', {
    properties: { tabColor: { argb: INK } },
  });
  setColumns(acts, [
    { header: 'discipline_code', key: 'dc', width: 16 },
    { header: 'term_year', key: 'ty', width: 10 },
    { header: 'term_number', key: 'tn', width: 12 },
    { header: 'kind', key: 'kind', width: 11 },
    { header: 'title', key: 'title', width: 36 },
    { header: 'description', key: 'description', width: 40 },
    { header: 'max_score', key: 'max_score', width: 11 },
    { header: 'mode', key: 'mode', width: 12 },
    { header: 'max_group_size', key: 'mgs', width: 16 },
    { header: 'accepts_file', key: 'af', width: 13 },
    { header: 'accepts_url', key: 'au', width: 13 },
    { header: 'due_at', key: 'due_at', width: 14 },
    { header: 'status', key: 'status', width: 10 },
  ]);
  acts.addRow({
    dc: 'PARA-2026.1',
    ty: 2026,
    tn: 1,
    kind: 'trabalho',
    title: 'Revisão narrativa sobre Leishmaniose visceral',
    description: 'Revisão de 4 a 6 páginas com mínimo 3 referências recentes.',
    max_score: 8,
    mode: 'group',
    mgs: 4,
    af: true,
    au: true,
    due_at: new Date(2026, 3, 15),
    status: 'open',
  });
  acts.addRow({
    dc: 'PARA-2026.1',
    ty: 2026,
    tn: 1,
    kind: 'aeco',
    title: 'AECO — Caso clínico parasitário',
    description: 'Análise individual de caso clínico fornecido em aula.',
    max_score: 2,
    mode: 'individual',
    mgs: 2,
    af: true,
    au: false,
    due_at: new Date(2026, 3, 22),
    status: 'open',
  });
  acts.addRow({
    dc: 'FARM-2026.1',
    ty: 2026,
    tn: 1,
    kind: 'trabalho',
    title: 'Seminário — Anti-hipertensivos',
    max_score: 10,
    mode: 'group',
    mgs: 5,
    af: true,
    au: true,
    status: 'draft',
  });
  styleHeader(acts);
  polishDataRows(acts, ['due_at']);

  addListValidation(acts, 'D2:D1000', ['trabalho', 'aeco'], { errorTitle: 'Tipo inválido' });
  addDecimalValidation(acts, 'G2:G1000', 0.5, 100, {
    errorTitle: 'Nota máxima inválida',
    error: 'max_score deve estar entre 0.5 e 100',
  });
  addListValidation(acts, 'H2:H1000', ['individual', 'group'], { errorTitle: 'Modo inválido' });
  addNumberValidation(acts, 'I2:I1000', 2, 10, {
    errorTitle: 'Tamanho de grupo inválido',
    error: 'Tamanho do grupo entre 2 e 10 (obrigatório se mode = group)',
  });
  addListValidation(acts, 'J2:J1000', ['TRUE', 'FALSE'], { errorTitle: 'Valor booleano' });
  addListValidation(acts, 'K2:K1000', ['TRUE', 'FALSE'], { errorTitle: 'Valor booleano' });
  addListValidation(acts, 'M2:M1000', ['draft', 'open', 'closed'], { errorTitle: 'Status inválido' });

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'estrutura.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

// -----------------------------------------------------------------------------
// TEMPLATE 2 — alunos.xlsx (alunos + vínculos com disciplinas)
// -----------------------------------------------------------------------------
async function generateAlunos() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Controle de Trabalhos';
  wb.created = new Date();
  wb.modified = new Date();

  addInstructionsSheet(wb, 'Alunos — como preencher', [
    {
      heading: 'Como funciona',
      lines: [
        'Esse template cadastra alunos pra UMA disciplina específica.',
        'A vinculação é automática — você seleciona a disciplina dentro do app antes de subir.',
        'Não precisa repetir o código da disciplina por linha.',
      ],
    },
    {
      heading: 'Regras',
      lines: [
        'Nome é convertido pra MAIÚSCULAS automaticamente no import.',
        'E-mail e observação são opcionais.',
        'Se um aluno com o mesmo nome já existir no sistema, ele é apenas vinculado — não duplica.',
        'E-mail divergente (mesmo nome, e-mail diferente) bloqueia o import dessa linha pra resolução manual.',
      ],
    },
    {
      heading: 'Pra cada disciplina',
      lines: [
        'Pra carregar alunos em outra disciplina, suba o mesmo arquivo (ou variação) com a outra disciplina selecionada.',
        'Alunos repetidos em disciplinas diferentes não são duplicados — apenas re-vinculados.',
      ],
    },
  ]);

  const students = wb.addWorksheet('Alunos', {
    properties: { tabColor: { argb: INK } },
  });
  setColumns(students, [
    { header: 'name', key: 'name', width: 40 },
    { header: 'email', key: 'email', width: 32 },
    { header: 'note', key: 'note', width: 40 },
  ]);
  students.addRow({ name: 'MARIA DA SILVA SANTOS', email: 'maria.silva@exemplo.com', note: 'Monitora da disciplina' });
  students.addRow({ name: 'JOÃO PEDRO PEREIRA', email: 'joao.pereira@exemplo.com' });
  students.addRow({ name: 'ANA CLARA OLIVEIRA' });
  styleHeader(students);
  polishDataRows(students);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'alunos.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------
await generateEstrutura();
await generateAlunos();
console.log('Done.');
