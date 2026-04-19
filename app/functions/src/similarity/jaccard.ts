/**
 * Detecção de similaridade entre trabalhos via Jaccard sobre shingles.
 *
 * Shingles: sequências contíguas de N tokens (default 5).
 * Jaccard: |A ∩ B| / |A ∪ B| — vai de 0.0 (disjunto) a 1.0 (idêntico).
 *
 * Stopwords do português removidas para reduzir ruído. Normaliza
 * acentos e minúsculas.
 *
 * Ver docs/07_examples.md §PAT-12.
 */

const STOPWORDS_PT = new Set([
  'a', 'o', 'as', 'os', 'e', 'é', 'ou', 'mas', 'que', 'de', 'da', 'do',
  'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'para', 'pra', 'por', 'com', 'sem', 'se', 'seu', 'sua', 'seus', 'suas',
  'me', 'te', 'lhe', 'nos', 'lhes', 'eu', 'tu', 'ele', 'ela', 'eles', 'elas',
  'nós', 'vós', 'vocês', 'este', 'esta', 'isto', 'esse', 'essa', 'isso',
  'aquele', 'aquela', 'aquilo', 'ser', 'ter', 'estar', 'haver', 'foi',
  'era', 'são', 'está', 'tem', 'tinha', 'houve', 'ao', 'à', 'aos', 'às',
  'pelo', 'pela', 'pelos', 'pelas', 'sobre', 'até', 'entre', 'como', 'porque',
]);

/**
 * Normaliza texto: lowercase, sem acentos, sem pontuação.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokeniza e remove stopwords.
 */
export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter((t) => t.length >= 2 && !STOPWORDS_PT.has(t));
}

/**
 * Gera shingles (n-gramas) de tamanho fixo.
 */
export function shingles(text: string, size = 5): Set<string> {
  const tokens = tokenize(text);
  const out = new Set<string>();
  if (tokens.length < size) {
    // Texto curto — usa o próprio texto como "shingle único" (força comparação ingênua)
    if (tokens.length > 0) out.add(tokens.join(' '));
    return out;
  }
  for (let i = 0; i <= tokens.length - size; i++) {
    out.add(tokens.slice(i, i + size).join(' '));
  }
  return out;
}

/**
 * Coeficiente de Jaccard entre dois conjuntos de shingles.
 * Retorna 0 se ambos vazios.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Compara um texto contra muitos outros, retorna matches acima do threshold.
 * Ordenado por score desc. Computação é O(n·m) — ok para até ~500 submissões
 * por disciplina. Acima disso: MinHash + LSH.
 */
export interface SimilarityMatch {
  otherId: string;
  jaccard: number;
}

export function findSimilarMatches(params: {
  targetText: string;
  candidates: Array<{ id: string; text: string }>;
  threshold?: number;
  shingleSize?: number;
}): SimilarityMatch[] {
  const threshold = params.threshold ?? 0.6;
  const size = params.shingleSize ?? 5;

  const targetShingles = shingles(params.targetText, size);
  if (targetShingles.size === 0) return [];

  const matches: SimilarityMatch[] = [];
  for (const c of params.candidates) {
    const otherShingles = shingles(c.text, size);
    if (otherShingles.size === 0) continue;

    const score = jaccard(targetShingles, otherShingles);
    if (score >= threshold) {
      matches.push({ otherId: c.id, jaccard: score });
    }
  }

  matches.sort((a, b) => b.jaccard - a.jaccard);
  return matches;
}
