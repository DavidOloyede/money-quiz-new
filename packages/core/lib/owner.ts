/**
 * Telling "money I moved to myself" apart from "money that changed hands".
 *
 * Peer-to-peer apps make both look identical: a Zelle to your own savings and
 * a Zelle to a contractor are the same kind of row. Most people's statements
 * are dominated by the first kind — on a real checking export, 177 of 254
 * Zelle rows were the account holder paying themselves — and until those are
 * out of the way the handful that need a decision are impossible to find.
 *
 * So the user tells us their own names and account nicknames once, and
 * anything transfer-shaped that mentions one is an internal transfer. What's
 * left is the review queue.
 */

/** Peer-to-peer and bank transfer services. */
const SERVICE_RE =
  /\b(zelle|venmo|cash ?app|paypal|apple cash|quickpay|square cash|wire transfer|online transfer|account transfer|bank xfer|xfer)\b/i

/**
 * A transfer between the user's own accounts, named as such by the bank —
 * internal by definition, with no owner phrase needed.
 */
const OWN_ACCOUNT_RE =
  /\b(transfer|xfer)\b[^a-z0-9]*(to|from)?[^a-z0-9]*\b(sav|savings|chk|checking|money market|mma|brokerage)\b/i

/** Lowercase, punctuation to spaces, whitespace collapsed, padded for boundaries. */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')} `
}

/** The comparable form of a phrase the user typed ("DAVID  OLOYEDE" → "david oloyede"). */
export function normalizeOwnerPhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

/**
 * Does this description name the account holder? Whole words only, so a
 * phrase like "Dave" can't swallow "Davenport Grill".
 */
export function matchesOwner(description: string, phrases: string[] = []): boolean {
  if (phrases.length === 0) return false
  const d = normalize(description)
  return phrases.some((p) => {
    const q = normalizeOwnerPhrase(p)
    return q.length > 0 && d.includes(` ${q} `)
  })
}

/** Is this row about money moving, rather than money being spent? */
export function isTransferDescription(description: string): boolean {
  return SERVICE_RE.test(description) || OWN_ACCOUNT_RE.test(description)
}

/**
 * Money that never really left the user: a transfer between their own
 * accounts, or a peer-to-peer payment naming one of their own phrases.
 */
export function isSelfTransfer(description: string, phrases: string[] = []): boolean {
  if (OWN_ACCOUNT_RE.test(description)) return true
  return SERVICE_RE.test(description) && matchesOwner(description, phrases)
}

export interface Counterparty {
  /** Normalized name, used as the grouping key. */
  key: string
  /** Title-cased name for display. */
  label: string
}

/**
 * Words that aren't part of who you paid: reference blobs banks tack on
 * ("WEB ID: 1234", "JPM99cwmvuv3" — caught by the digit filter below), and
 * corporate suffixes, so "Diamond Electric Services" and the same name with
 * "Inc" on the end don't become two separate people to review.
 */
const NOISE_WORDS = new Set([
  'web', 'id', 'ref', 'conf', 'confirmation', 'trn', 'ach', 'ppd', 'ccd',
  'inc', 'incorporated', 'llc', 'llp', 'ltd', 'corp', 'co', 'company',
  // Generic transfer wording. Without these, "PAYPAL TRANSFER PPD ID: …" and
  // "APPLE CASH SENT MONEY … CA" become counterparties called "Transfer" and
  // "Sent Mone Ca" — nobody, grouped under a name that means nothing.
  'transfer', 'xfer', 'payment', 'payments', 'pmt', 'pymt', 'sent', 'send',
  'received', 'receive', 'money', 'instant', 'deposit', 'withdrawal', 'direct',
  // Truncated forms, because banks cut descriptors mid-word: "APPLE CASH SENT
  // MONE …". merchant.ts carries 'servic' for the same reason.
  'mone', 'paymen', 'transfe',
])

function cleanName(raw: string): string {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/\d/.test(w) && !NOISE_WORDS.has(w))
    .slice(0, 4)
  // Drop a trailing two-letter state code ("… HOUSTON TX"), as merchant keys do.
  while (words.length > 0 && /^[a-z]{2}$/.test(words[words.length - 1])) words.pop()
  return words.join(' ').trim()
}

function titleCase(name: string): string {
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

/**
 * Who the other side of a transfer was. Handles both shapes banks use:
 * "Zelle payment to Priya Raman" and "CASH APP*PRIYA RAMAN".
 *
 * Grouping is by name alone, not name-plus-service, so one person who pays
 * you by Zelle one month and Cash App the next is one row in the queue.
 */
export function counterparty(description: string): Counterparty | null {
  if (!isTransferDescription(description)) return null
  const service = description.match(SERVICE_RE)

  // Prefer an explicit "to"/"from", which marks where the name starts.
  const directed = description.match(/\b(?:to|from)\b\s*(.+)$/i)
  const rest = directed
    ? directed[1]
    : service?.index !== undefined
      ? description.slice(service.index + service[0].length)
      : ''

  const name = cleanName(rest)
  if (name) return { key: name, label: titleCase(name) }

  // Some rows genuinely name nobody. Group them under the service itself, so
  // they can still be reviewed together instead of dropping out of sight.
  const fallback = service ? normalizeOwnerPhrase(service[0]) : ''
  return fallback ? { key: fallback, label: titleCase(fallback) } : null
}

/** The grouping key for a transfer's counterparty, or '' when there isn't one. */
export function counterpartyKey(description: string): string {
  return counterparty(description)?.key ?? ''
}

/** A display name for a transfer's counterparty. */
export function counterpartyLabel(description: string): string {
  return counterparty(description)?.label ?? 'Unknown'
}
