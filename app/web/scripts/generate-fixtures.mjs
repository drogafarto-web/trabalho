/**
 * Gera o pacote de fixtures pra smoke test com agente autônomo.
 *
 * Produz em `app/test-fixtures/`:
 *   planilhas/estrutura.xlsx        (populada)
 *   planilhas/alunos.xlsx           (populada)
 *   trabalhos/leishmaniose-grupo.pdf        (trabalho em grupo, 4pg, bem feito)
 *   trabalhos/leishmaniose-ruim.pdf         (versão ruim, 1pg, sem refs)
 *   trabalhos/aeco-caso-clinico.docx        (AECO, formato Word)
 *   trabalhos/aeco-caso-clinico.pdf         (mesma cópia em PDF)
 *
 * Rodar: npm run generate:fixtures
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(__dirname, '..', '..', 'test-fixtures');
const OUT_PLANILHAS = path.join(OUT_ROOT, 'planilhas');
const OUT_TRABALHOS = path.join(OUT_ROOT, 'trabalhos');

// -----------------------------------------------------------------------------
// Tokens visuais (coerente com o app)
// -----------------------------------------------------------------------------
const INK = 'FF0B0B0F';
const VIOLET = 'FF6366F1';
const WHITE = 'FFFFFFFF';
const SOFT = 'FFF4F4F5';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
const HEADER_FONT = { bold: true, color: { argb: WHITE }, size: 11, name: 'Calibri' };
const HEADER_ALIGN = { vertical: 'middle', horizontal: 'left', indent: 1 };
const HEADER_BORDER = { bottom: { style: 'medium', color: { argb: VIOLET } } };

function styleHeader(sheet, row = 1) {
  const h = sheet.getRow(row);
  h.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = HEADER_ALIGN;
    c.border = HEADER_BORDER;
  });
  h.height = 28;
  sheet.views = [{ state: 'frozen', ySplit: row }];
}

function polishRows(sheet, dateKeys = []) {
  const last = sheet.lastRow?.number ?? 1;
  for (let r = 2; r <= last; r++) {
    const row = sheet.getRow(r);
    const even = r % 2 === 0;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = { size: 11, name: 'Calibri', color: { argb: INK } };
      if (!even) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    });
    row.height = 22;
  }
  for (const key of dateKeys) {
    const col = sheet.getColumn(key);
    if (col) col.numFmt = 'dd/mm/yyyy';
  }
}

// -----------------------------------------------------------------------------
// 1. Planilha `estrutura.xlsx` populada
// -----------------------------------------------------------------------------
async function generateEstrutura() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Controle de Trabalhos — fixtures';

  // Aba Disciplinas
  const disc = wb.addWorksheet('Disciplinas');
  disc.columns = [
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
  ];
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
    c3d: 'Qualidade e atualidade das referências científicas',
    c3p: 3,
    q1: 'Qual a principal conclusão apresentada?',
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
    q1: 'Qual o mecanismo de ação do fármaco principal discutido?',
  });
  styleHeader(disc);
  polishRows(disc, ['deadline']);

  // Aba Etapas
  const terms = wb.addWorksheet('Etapas');
  terms.columns = [
    { header: 'discipline_code', key: 'dc', width: 16 },
    { header: 'year', key: 'year', width: 10 },
    { header: 'number', key: 'number', width: 10 },
    { header: 'label', key: 'label', width: 28 },
    { header: 'starts_at', key: 'starts_at', width: 14 },
    { header: 'ends_at', key: 'ends_at', width: 14 },
  ];
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
    label: '2ª etapa 2026',
    starts_at: new Date(2026, 4, 5),
    ends_at: new Date(2026, 6, 15),
  });
  terms.addRow({
    dc: 'FARM-2026.1',
    year: 2026,
    number: 1,
    label: '1ª etapa 2026',
    starts_at: new Date(2026, 1, 10),
    ends_at: new Date(2026, 5, 20),
  });
  styleHeader(terms);
  polishRows(terms, ['starts_at', 'ends_at']);

  // Aba Atividades
  const acts = wb.addWorksheet('Atividades');
  acts.columns = [
    { header: 'discipline_code', key: 'dc', width: 16 },
    { header: 'term_year', key: 'ty', width: 10 },
    { header: 'term_number', key: 'tn', width: 12 },
    { header: 'kind', key: 'kind', width: 11 },
    { header: 'title', key: 'title', width: 40 },
    { header: 'description', key: 'description', width: 40 },
    { header: 'max_score', key: 'max_score', width: 11 },
    { header: 'mode', key: 'mode', width: 12 },
    { header: 'max_group_size', key: 'mgs', width: 16 },
    { header: 'accepts_file', key: 'af', width: 13 },
    { header: 'accepts_url', key: 'au', width: 13 },
    { header: 'due_at', key: 'due_at', width: 14 },
    { header: 'status', key: 'status', width: 10 },
  ];
  // Trabalho em grupo aceita file + url (testa fluxo YouTube)
  acts.addRow({
    dc: 'PARA-2026.1',
    ty: 2026,
    tn: 1,
    kind: 'trabalho',
    title: 'Revisão narrativa sobre Leishmaniose visceral',
    description: 'Revisão de 4 a 6 páginas com mínimo 3 referências recentes. Aceita também vídeo no YouTube.',
    max_score: 8,
    mode: 'group',
    mgs: 4,
    af: true,
    au: true,
    due_at: new Date(2026, 3, 15),
    status: 'open',
  });
  // AECO individual, só file
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
  // Outra atividade aberta em etapa 2
  acts.addRow({
    dc: 'PARA-2026.1',
    ty: 2026,
    tn: 2,
    kind: 'trabalho',
    title: 'Seminário — Toxoplasmose congênita',
    description: 'Apresentação em grupo, 15 min, com bibliografia recente.',
    max_score: 10,
    mode: 'group',
    mgs: 5,
    af: true,
    au: true,
    due_at: new Date(2026, 6, 1),
    status: 'open',
  });
  // FARM
  acts.addRow({
    dc: 'FARM-2026.1',
    ty: 2026,
    tn: 1,
    kind: 'trabalho',
    title: 'Revisão — Anti-hipertensivos de primeira linha',
    description: 'Comparação de evidência entre classes (IECA, BRA, diuréticos).',
    max_score: 10,
    mode: 'group',
    mgs: 5,
    af: true,
    au: false,
    status: 'open',
  });
  styleHeader(acts);
  polishRows(acts, ['due_at']);

  await fsp.mkdir(OUT_PLANILHAS, { recursive: true });
  const out = path.join(OUT_PLANILHAS, 'estrutura.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`✓ ${path.relative(OUT_ROOT, out)}`);
}

// -----------------------------------------------------------------------------
// 2. Planilha `alunos.xlsx` populada
// -----------------------------------------------------------------------------
async function generateAlunos() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Controle de Trabalhos — fixtures';

  const students = wb.addWorksheet('Alunos');
  students.columns = [
    { header: 'name', key: 'name', width: 40 },
    { header: 'email', key: 'email', width: 32 },
    { header: 'note', key: 'note', width: 40 },
  ];
  const rows = [
    ['MARIA DA SILVA SANTOS',    'maria.silva@fictnicio.edu.br',    'Monitora — PARA'],
    ['JOÃO PEDRO PEREIRA',       'joao.pereira@fictnicio.edu.br',   ''],
    ['PEDRO HENRIQUE COSTA',     'pedro.costa@fictnicio.edu.br',    ''],
    ['ANA CLARA OLIVEIRA',       'ana.oliveira@fictnicio.edu.br',   ''],
    ['LUCAS MARTINS SOUZA',      'lucas.souza@fictnicio.edu.br',    ''],
    ['JULIA FERNANDES LIMA',     'julia.lima@fictnicio.edu.br',     ''],
    ['BRUNO CARVALHO ALVES',     'bruno.alves@fictnicio.edu.br',    ''],
    ['ISABELA RIBEIRO DUARTE',   'isabela.duarte@fictnicio.edu.br', ''],
  ];
  for (const [name, email, note] of rows) {
    students.addRow({ name, email, note });
  }
  styleHeader(students);
  polishRows(students);

  const out = path.join(OUT_PLANILHAS, 'alunos.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`✓ ${path.relative(OUT_ROOT, out)}`);
}

// -----------------------------------------------------------------------------
// Conteúdos acadêmicos fictícios (compartilhados entre PDF e DOCX)
// -----------------------------------------------------------------------------
const LEISHMANIOSE_BOM = {
  title: 'Leishmaniose visceral: epidemiologia, diagnóstico e tratamento',
  authors: 'Maria da Silva Santos · João Pedro Pereira · Pedro Henrique Costa',
  discipline: 'Parasitologia Clínica — 1ª etapa 2026',
  sections: [
    {
      heading: '1. Introdução',
      paragraphs: [
        'A leishmaniose visceral (LV), também conhecida como calazar, é uma zoonose de ampla distribuição geográfica causada por protozoários do gênero Leishmania, em especial pela espécie Leishmania infantum nas Américas (Rey, 2019). No Brasil, a doença figura entre as dez principais parasitoses de notificação obrigatória, com taxa de letalidade que supera 8% quando o diagnóstico é tardio (Ministério da Saúde, 2023).',
        'O presente trabalho revisa os principais aspectos da LV, com foco em epidemiologia, patogenia, métodos diagnósticos e esquemas terapêuticos atualmente disponíveis. A revisão se apoia em literatura publicada nos últimos cinco anos, incluindo diretrizes oficiais do SUS e revisões sistemáticas indexadas.',
      ],
    },
    {
      heading: '2. Epidemiologia',
      paragraphs: [
        'Estima-se que o Brasil concentre mais de 90% dos casos de LV reportados nas Américas, com transmissão urbana consolidada em capitais do Nordeste, Sudeste e Centro-Oeste (Oliveira et al., 2021). O vetor primário é o flebotomíneo Lutzomyia longipalpis, e o reservatório doméstico predominante é o cão (Canis familiaris), o que impõe ao Programa de Vigilância da LV uma abordagem integrada que combina controle vetorial, manejo do reservatório e atenção ao caso humano.',
        'A análise de séries temporais de 2010–2022 evidencia interiorização da doença em municípios de pequeno porte e incremento do número de óbitos em populações com comorbidades, especialmente coinfecção por HIV (Alves & Menezes, 2022).',
      ],
    },
    {
      heading: '3. Patogenia e apresentação clínica',
      paragraphs: [
        'Após a picada pelo vetor, formas promastigotas são fagocitadas por macrófagos do hospedeiro e transformam-se em amastigotas, que se multiplicam intracelularmente e desencadeiam resposta inflamatória crônica em órgãos ricos em células do sistema fagocítico mononuclear — baço, fígado, medula óssea e linfonodos.',
        'A tríade clássica compreende febre prolongada, hepatoesplenomegalia e pancitopenia. Em crianças e imunossuprimidos, a evolução para formas graves é frequente e exige atenção diagnóstica redobrada.',
      ],
    },
    {
      heading: '4. Métodos diagnósticos',
      paragraphs: [
        'O diagnóstico laboratorial articula métodos parasitológicos (aspirado de medula óssea, baço ou linfonodo), sorológicos (IFI, ELISA e o teste imunocromatográfico rK39) e moleculares (PCR convencional e qPCR). O rK39 apresenta sensibilidade superior a 90% em pacientes imunocompetentes, mas deve ser interpretado com cautela em coinfectados por HIV, nos quais a sorologia apresenta desempenho reduzido (Souza et al., 2020).',
        'A PCR em sangue periférico e aspirado medular tem ganhado espaço como ferramenta complementar, especialmente em centros de referência, pela capacidade de confirmar o diagnóstico mesmo em fases iniciais da infecção.',
      ],
    },
    {
      heading: '5. Tratamento',
      paragraphs: [
        'O antimonial pentavalente (antimoniato de meglumina) permanece como primeira linha no SUS, administrado por via parenteral por 20–30 dias. A anfotericina B lipossomal é indicada em pacientes com comorbidades, idosos, gestantes e crianças menores de 1 ano, apresentando perfil de segurança superior ao antimonial clássico (Ministério da Saúde, 2023).',
        'Falhas terapêuticas e recidivas, sobretudo em coinfectados por HIV, motivam discussões sobre regimes combinados e profilaxia secundária com anfotericina B lipossomal em doses mensais.',
      ],
    },
    {
      heading: '6. Conclusão',
      paragraphs: [
        'A leishmaniose visceral permanece como desafio de saúde pública no Brasil. Diagnóstico oportuno, articulado a tratamento adequado e ações de vigilância integrada, são determinantes para a redução da letalidade. Estudos adicionais sobre marcadores de resposta terapêutica e desenvolvimento de vacinas são linhas de investigação promissoras.',
      ],
    },
    {
      heading: 'Referências',
      paragraphs: [
        'ALVES, M.; MENEZES, R. Interiorização da leishmaniose visceral no Brasil: análise 2010–2022. Cadernos de Saúde Pública, v. 38, n. 4, 2022.',
        'MINISTÉRIO DA SAÚDE. Guia de vigilância em saúde: leishmaniose visceral. Brasília, 2023.',
        'OLIVEIRA, L. et al. Urban transmission dynamics of visceral leishmaniasis in Brazil. PLOS Neglected Tropical Diseases, v. 15, n. 3, e0009210, 2021.',
        'REY, L. Parasitologia: Parasitos e doenças parasitárias do homem. 5. ed. Rio de Janeiro: Guanabara Koogan, 2019.',
        'SOUZA, C. et al. Performance of rK39 rapid test in HIV co-infected patients. Tropical Medicine & International Health, v. 25, n. 8, 2020.',
      ],
    },
  ],
};

const LEISHMANIOSE_RUIM = {
  title: 'Leishmaniose',
  authors: 'Lucas Martins Souza',
  discipline: 'Parasitologia Clínica — 1ª etapa 2026',
  sections: [
    {
      heading: 'Sobre a doença',
      paragraphs: [
        'A leishmaniose é uma doença causada por parasitas. Ela afeta muitas pessoas e pode ser grave. Os sintomas incluem febre, perda de peso e outros problemas.',
        'O tratamento existe e é importante para o paciente se curar. O médico faz o diagnóstico e indica o remédio certo. Sem tratamento a doença pode matar.',
        'Em conclusão, a leishmaniose é séria e precisa de atenção das autoridades de saúde.',
      ],
    },
  ],
};

const AECO_CASO = {
  title: 'AECO — Caso clínico: suspeita de leishmaniose visceral',
  authors: 'Ana Clara Oliveira',
  discipline: 'Parasitologia Clínica — 1ª etapa 2026',
  sections: [
    {
      heading: 'Apresentação do caso',
      paragraphs: [
        'Paciente do sexo masculino, 7 anos, procedente de zona periurbana de Belo Horizonte/MG, encaminhado à UBS com história de febre intermitente há três semanas, palidez progressiva e aumento do volume abdominal.',
        'No exame físico: estado geral regular, hepatoesplenomegalia evidente (fígado a 4 cm do RCD, baço a 5 cm do RCE), mucosas hipocoradas +++/4+.',
        'Exames laboratoriais iniciais mostram anemia normocítica/normocrômica (Hb 7,8 g/dL), leucopenia (3.200/mm³) com linfocitose relativa, plaquetopenia (95.000/mm³) e elevação de transaminases.',
      ],
    },
    {
      heading: 'Hipóteses diagnósticas',
      paragraphs: [
        'O conjunto tríade febre prolongada + hepatoesplenomegalia + pancitopenia, somado à procedência de área endêmica, impõe como hipótese principal a leishmaniose visceral. Diagnósticos diferenciais incluem linfomas, infecções crônicas (tuberculose disseminada, endocardite bacteriana subaguda) e hemopatias.',
      ],
    },
    {
      heading: 'Conduta proposta',
      paragraphs: [
        'Solicitação de teste rápido rK39 (ELISA imunocromatográfico) e confirmação com parasitológico de medula óssea se houver disponibilidade. Em paralelo, iniciar estabilização hemodinâmica e avaliação nutricional.',
        'Confirmado o diagnóstico, priorizar anfotericina B lipossomal pela idade do paciente (menor de 18 anos, perfil de segurança superior). Acompanhamento ambulatorial após alta com controle hematológico seriado.',
      ],
    },
    {
      heading: 'Referência utilizada',
      paragraphs: [
        'MINISTÉRIO DA SAÚDE. Guia de vigilância em saúde: leishmaniose visceral. Brasília, 2023.',
      ],
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. PDFs via pdfkit
// -----------------------------------------------------------------------------
async function generatePdf(content, filename) {
  const out = path.join(OUT_TRABALHOS, filename);
  await fsp.mkdir(OUT_TRABALHOS, { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 64 });
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);

    // Título
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(content.title, { align: 'left' });

    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555')
      .text(content.authors);
    doc
      .fontSize(9)
      .text(content.discipline);

    doc.moveDown(1.2);
    doc.fillColor('#000');

    for (const section of content.sections) {
      doc.fontSize(13).font('Helvetica-Bold').text(section.heading);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      for (const p of section.paragraphs) {
        doc.text(p, {
          align: 'justify',
          lineGap: 2,
        });
        doc.moveDown(0.6);
      }
      doc.moveDown(0.4);
    }

    doc.end();
    stream.on('finish', () => {
      console.log(`✓ trabalhos/${filename}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

// -----------------------------------------------------------------------------
// 4. DOCX via docx lib
// -----------------------------------------------------------------------------
async function generateDocx(content, filename) {
  const out = path.join(OUT_TRABALHOS, filename);
  await fsp.mkdir(OUT_TRABALHOS, { recursive: true });

  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: content.title, bold: true, size: 36 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: content.authors, size: 22, color: '555555' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: content.discipline, size: 20, color: '777777', italics: true }),
      ],
    }),
    new Paragraph({ children: [new TextRun('')] }),
  ];

  for (const section of content.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.heading, bold: true, size: 26 })],
      }),
    );
    for (const p of section.paragraphs) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: p, size: 22 })],
        }),
      );
      children.push(new Paragraph({ children: [new TextRun('')] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  await fsp.writeFile(out, buffer);
  console.log(`✓ trabalhos/${filename}`);
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------
await fsp.mkdir(OUT_ROOT, { recursive: true });

await generateEstrutura();
await generateAlunos();
await generatePdf(LEISHMANIOSE_BOM, 'leishmaniose-grupo.pdf');
await generatePdf(LEISHMANIOSE_RUIM, 'leishmaniose-ruim.pdf');
await generatePdf(AECO_CASO, 'aeco-caso-clinico.pdf');
await generateDocx(AECO_CASO, 'aeco-caso-clinico.docx');

console.log('Done.');
