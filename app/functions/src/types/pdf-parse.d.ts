/**
 * Shim de tipos para a rota interna de pdf-parse.
 *
 * Importamos via `pdf-parse/lib/pdf-parse.js` para contornar bug conhecido
 * no index.js do pacote (tenta ler um PDF de teste do disco em tempo de
 * require). Os @types/pdf-parse oficiais não declaram essa sub-rota.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: { max?: number; version?: string },
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
