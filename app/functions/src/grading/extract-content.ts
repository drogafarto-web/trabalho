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

export type ExtractedContent = ExtractedText | ExtractedBinary;

const MAX_TEXT_CHARS = 50_000;
const MIN_TEXT_THRESHOLD = 100; // se menos que isso, é provável PDF escaneado

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
// Extrai conteúdo do arquivo armazenado em Storage
// ---------------------------------------------------------------------------
export async function extractContent(params: {
  storagePath: string;
  mimeType: string;
}): Promise<ExtractedContent> {
  const { storagePath, mimeType } = params;

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
  // Caso 2: PDF → tenta extrair texto
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
