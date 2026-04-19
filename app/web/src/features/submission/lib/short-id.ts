/**
 * Gerador de protocolo curto para submissões.
 * Formato: TRAB-XXXX (4 chars alfanuméricos).
 * Evita caracteres ambíguos: 0, O, 1, I, L.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateShortId(): string {
  let code = '';
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `TRAB-${code}`;
}
