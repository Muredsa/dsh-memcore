/** Patterns that should not silently become memory or model context. */
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|secret)\s*[:=]\s*\S+/i,
  /\bsk-[a-z0-9_-]{16,}\b/i,
  /\bgh[pousr]_[a-z0-9]{20,}\b/i,
  /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/i,
]

/** Whether a candidate contains a likely credential or private key. */
export function containsSensitiveValue(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value))
}

/** Remove control characters and bound a prompt-facing text fragment. */
export function cleanText(value: string, maxLength = 8_000): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, maxLength)
}
