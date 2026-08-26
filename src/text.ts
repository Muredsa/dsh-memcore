/** Conservative token estimate used only to honor a retrieval budget. */
export function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4))
}

/** Stable, locale-independent normalization used for lexical matching. */
export function normalizeText(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}_./-]+/gu, ' ').trim()
}

/** Extract search terms that can safely be passed to an FTS MATCH expression. */
export function lexicalTerms(value: string): string[] {
  return [...new Set(normalizeText(value).split(/\s+/).filter(term => term.length >= 2))].slice(0, 12)
}

/** Deterministic, non-cryptographic key for anonymous auto-capture deduplication. */
export function stableKey(value: string): string {
  let hash = 2_166_136_261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return `auto-${(hash >>> 0).toString(36)}`
}
