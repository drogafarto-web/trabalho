import { getStorage } from 'firebase-admin/storage';
import { logger } from '../lib/logger.js';

/**
 * Extração de conteúdo do arquivo do aluno para alimentar o Gemini.
 *
 * Estratégia em cascata:
 *   1. PDF com texto selecionável → extrai texto via pdf-parse (barato/rápido)
 *   2. PDF escaneado OU imagem → envia bytes como inlineData pro Gemini
 *      (Gemini 3.x tem vision nativa + suporte a PDF, sem precisar rasterizar)
 *
 * O caller decide entre "text" e "inlineData" pelo tipo retornado.
 */

export interface ExtractedText {
  kind: 'text';
  text: string;
  pageCount: number;
  truncated: boolean;
}

export interface ExtractedBinary {
  kind: 'binary';
  base64: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Entrega por URL — hoje só YouTube. Providers decidem como interpretar:
 * Gemini usa `fileData.fileUri` (suporte nativo a vídeo); Anthropic/Qwen
 * rejeitam com erro amigável.
 */
export interface ExtractedUrl {
  kind: 'url';
  url: string;
  urlKind: 'youtube';
}

export type ExtractedContent = ExtractedText | ExtractedBinary | ExtractedUrl;

const MAX_TEXT_CHARS = 50_000;
const MIN_TEXT_THRESHOLD = 100; // se menos que isso, é provável PDF escaneado

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_DOC = 'application/msword';

// ---------------------------------------------------------------------------
// Baixa arquivo do Storage
// ---------------------------------------------------------------------------
async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`Storage file not found: ${storagePath}`);
  }

  const [buffer] = await file.download();
  return buffer;
}

// ---------------------------------------------------------------------------
// Extrai texto de PDF usando pdf-parse.
// Usa import dinâmico da sub-rota para contornar bug conhecido do pacote
// (o index.js tenta ler um PDF de teste do disco).
// ---------------------------------------------------------------------------
async function extractPdfText(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const result = (await pdfParse(buffer)) as { text: string; numpages: number };
  return {
    text: result.text ?? '',
    pageCount: result.numpages ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Extrai texto de .docx via mammoth (pure JS, sem Word/LibreOffice).
// .doc (formato antigo binário) NÃO é suportado — mammoth só lê openxml.
// ---------------------------------------------------------------------------
async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? '';
}

// ---------------------------------------------------------------------------
// Extração unificada — arquivo do Storage OU URL submetida
// ---------------------------------------------------------------------------
export type ExtractSource =
  | { kind: 'file'; storagePath: string; mimeType: string }
  | { kind: 'url'; url: string; urlKind: 'youtube' };

export async function extractContent(source: ExtractSource): Promise<ExtractedContent> {
  if (source.kind === 'url') {
    logger.info({ url: source.url, urlKind: source.urlKind }, '[extract] url recebida');
    return { kind: 'url', url: source.url, urlKind: source.urlKind };
  }

  const { storagePath, mimeType } = source;
  logger.info({ storagePath, mimeType }, '[extract] iniciando download');
  const buffer = await downloadFromStorage(storagePath);

  // -----------------------------------------------------------------------
  // Caso 1: Imagem → manda direto como inlineData (Gemini vision)
  // -----------------------------------------------------------------------
  if (mimeType.startsWith('image/')) {
    return {
      kind: 'binary',
      base64: buffer.toString('base64'),
      mimeType,
      sizeBytes: buffer.byteLength,
    };
  }

  // -----------------------------------------------------------------------
  // Caso 2: DOCX → mammoth extrai texto puro. Se falhar, vai pra binary
  // (Gemini costuma não processar docx — mas evita crash).
  // -----------------------------------------------------------------------
  if (mimeType === MIME_DOCX) {
    try {
      const text = (await extractDocxText(buffer)).trim();
      if (text.length >= MIN_TEXT_THRESHOLD) {
        const truncated = text.length > MAX_TEXT_CHARS;
        logger.info(
          { storagePath, charCount: text.length },
          '[extract] docx text extraído',
        );
        return {
          kind: 'text',
          text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
          pageCount: 0, // docx não reporta páginas sem renderizar
          truncated,
        };
      }
      logger.warn(
        { storagePath, charCount: text.length },
        '[extract] docx com pouco texto, fallback binary',
      );
    } catch (err) {
      logger.warn({ err, storagePath }, '[extract] falha em mammoth, fallback binary');
    }

    return {
      kind: 'binary',
      base64: buffer.toString('base64'),
      mimeType,
      sizeBytes: buffer.byteLength,
    };
  }

  // -----------------------------------------------------------------------
  // Caso 2b: .doc antigo — mammoth não lê. Loga e rejeita com mime claro.
  // O form deveria ter barrado antes; chegar aqui é defensivo.
  // -----------------------------------------------------------------------
  if (mimeType === MIME_DOC) {
    logger.warn(
      { storagePath },
      '[extract] .doc legado não é suportado (use .docx)',
    );
    throw new Error(
      'Formato .doc (Word 97-2003) não suportado. Peça ao aluno para salvar como .docx ou PDF.',
    );
  }

  // -----------------------------------------------------------------------
  // Caso 3: PDF → tenta extrair texto
  // -----------------------------------------------------------------------
  if (mimeType === 'application/pdf') {
    try {
      const { text, pageCount } = await extractPdfText(buffer);
      const cleanText = text.trim();
      const charCount = cleanText.replace(/\s/g, '').length;

      logger.info(
        { storagePath, pageCount, charCount },
        '[extract] pdf parse result',
      );

      // Texto suficiente → retorna como TEXT
      if (charCount >= MIN_TEXT_THRESHOLD) {
        const truncated = cleanText.length > MAX_TEXT_CHARS;
        return {
          kind: 'text',
          text: truncated ? cleanText.slice(0, MAX_TEXT_CHARS) : cleanText,
          pageCount,
          truncated,
        };
      }

      // Texto insuficiente → provável escaneado
      logger.warn(
        { storagePath, charCount },
        '[extract] pdf escaneado detectado, enviando como binary',
      );
    } catch (err) {
      logger.warn({ err, storagePath }, '[extract] falha em pdf-parse, fallback binary');
    }

    // Fallback: envia PDF como binary pro Gemini (vision/OCR nativo)
    return {
      kind: 'binary',
      base64: buffer.toString('base64'),
      mimeType,
      sizeBytes: buffer.byteLength,
    };
  }

  // -----------------------------------------------------------------------
  // Tipo não esperado — tenta como binary mesmo (Gemini pode aceitar)
  // -----------------------------------------------------------------------
  logger.warn({ mimeType }, '[extract] mime inesperado, tentando como binary');
  return {
    kind: 'binary',
    base64: buffer.toString('base64'),
    mimeType,
    sizeBytes: buffer.byteLength,
  };
}
