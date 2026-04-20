/**
 * Parser genérico de XLSX → workbook normalizado.
 *
 * Bundle strategy: `xlsx` é pesado (~700KB). Usamos dynamic import pra
 * code-split — só carrega quando o professor entra em /importar e sobe
 * um arquivo.
 */

export type Cell = string | number | boolean | Date | null;
export type RawRow = Record<string, Cell>;
export type WorkbookData = Record<string, RawRow[]>;

/**
 * Lê um File XLSX e retorna { sheetName: row[] } com headers como chaves.
 * Células vazias → null. Datas preservadas como Date.
 */
export async function parseXlsxFile(file: File): Promise<WorkbookData> {
  // Dynamic import pra code-split
  const XLSX = await import('xlsx');

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const out: WorkbookData = {};
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      raw: true,
      defval: null,
    });
    out[sheetName] = rows.map(normalizeRow);
  }
  return out;
}

/**
 * Normaliza chaves: trim + lower-snake ("criterio_1_nome" fica igual,
 * "Criterio 1 Nome" vira "criterio_1_nome"). Torna o parser tolerante
 * a pequenas variações de header.
 */
function normalizeRow(row: RawRow): RawRow {
  const out: RawRow = {};
  for (const [key, value] of Object.entries(row)) {
    const normKey = key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[áàâã]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íì]/g, 'i')
      .replace(/[óòôõ]/g, 'o')
      .replace(/[úù]/g, 'u')
      .replace(/[ç]/g, 'c');
    out[normKey] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Coerções — XLSX tipa coisas de um jeito, Zod espera outro
// ---------------------------------------------------------------------------

export function asString(v: Cell | undefined): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

export function asNumber(v: Cell | undefined): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').trim());
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function asBool(v: Cell | undefined): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 'verdadeiro', 'sim', 's', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', 'falso', 'nao', 'não', 'n', '0', 'no'].includes(s)) return false;
  }
  if (typeof v === 'number') return v !== 0;
  return null;
}

export function asDate(v: Cell | undefined): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string') {
    // Aceita dd/mm/yyyy ou yyyy-mm-dd
    const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
    if (brMatch) {
      const [, d, m, y] = brMatch;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
