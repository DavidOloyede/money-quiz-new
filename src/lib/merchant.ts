/**
 * Collapse a noisy bank descriptor into a stable "merchant identity" used for
 * grouping — apply-to-similar, recurring detection, and top-merchants. It does
 * NOT change what's displayed; it only powers matching. The goal is to fold
 * variants like "STARBUCKS 13390" / "STARBUCKS STORE 13390" or
 * "AMAZON MKTPL*BJ1KR9CN1" together while keeping distinct merchants apart.
 */

const NOISE = new Set([
  'the', 'inc', 'llc', 'co', 'corp', 'store', 'pos', 'debit', 'credit', 'card',
  'online', 'com', 'www', 'net', 'purchase', 'payment', 'ach', 'pmt', 'intl', 'usa',
  'web', 'id', 'svc', 'service', 'services', 'servic', 'dept', 'mktpl', 'mktplace',
  'bill', 'recurring', 'null', 'funding', 'ppd', 'ccd', 'conf',
])

const PREFIX = /^(sq|tst|py|dd|pp|paypal|ppd|ach|pos|web|checkcard|chkcard|visa|mc|debit|credit)\b[\s*#:.-]*/i

/** A stable, lowercase merchant key for grouping similar transactions. */
export function merchantKey(description: string): string {
  const lower = description.toLowerCase()

  // Zelle/Venmo: the merchant is really the counterparty, not "zelle payment".
  const peer = lower.match(/(zelle|venmo|cash app|quickpay).*?\b(to|from)\b\s+(.+)/)
  if (peer) {
    const who = peer[3]
      .split(/\s+/)
      .filter((w) => w.length > 1 && !/\d/.test(w))
      .slice(0, 3)
      .join(' ')
    return `${peer[1]} ${peer[2]} ${who}`.trim()
  }

  const words = lower
    .replace(PREFIX, '')
    .replace(/[^a-z0-9&\s]/g, ' ')
    .split(/\s+/)
    // Drop blanks, single characters, pure-number/id tokens, and noise words.
    .filter((w) => w.length > 1 && !/\d/.test(w) && !NOISE.has(w))

  // Drop a trailing 2-letter state code (… HOUSTON TX).
  while (words.length > 1 && /^[a-z]{2}$/.test(words[words.length - 1])) words.pop()

  return words.slice(0, 4).join(' ') || lower.trim()
}

/** A friendly, title-cased label for a merchant key (for prompts and lists). */
export function merchantLabel(description: string): string {
  const key = merchantKey(description)
  return key
    .split(' ')
    .map((w) => (w === 'to' || w === 'from' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/**
 * The identity used to *group* transactions in analyses (recurring, merchants,
 * subscriptions). When the user has renamed a merchant, every variant that maps
 * to that merchant key collapses under the alias — so fragmented bank
 * descriptors ("REDEFINEDTV.NET PURCHASE…" vs "…REDEFINEDT…") become one group.
 */
export function groupKey(description: string, aliases: Record<string, string> = {}): string {
  const mk = merchantKey(description)
  const alias = aliases[mk]
  return alias ? `alias:${alias.toLowerCase().trim()}` : mk
}

/** Display name for a transaction's group: the user's alias if set, else the cleaned label. */
export function groupLabel(description: string, aliases: Record<string, string> = {}): string {
  return aliases[merchantKey(description)] ?? merchantLabel(description)
}

/** What to show for a single transaction's description: the user's alias if set, else the raw text. */
export function displayDescription(description: string, aliases: Record<string, string> = {}): string {
  return aliases[merchantKey(description)] ?? description
}

/** The set of significant words in a merchant key, for "shares a name" comparisons. */
export function nameTokens(description: string): Set<string> {
  return new Set(merchantKey(description).split(' ').filter(Boolean))
}

/** True when two descriptions share at least one significant merchant word. */
export function sharesName(a: string, b: string): boolean {
  const ta = nameTokens(a)
  for (const w of nameTokens(b)) if (ta.has(w)) return true
  return false
}
