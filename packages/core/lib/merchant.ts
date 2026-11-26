/**
 * Collapse a noisy bank descriptor into a stable "merchant identity" used for
 * grouping — apply-to-similar, recurring detection, and top-merchants. It does
 * NOT change what's displayed; it only powers matching. The goal is to fold
 * variants like "STARBUCKS 13390" / "STARBUCKS STORE 13390" or
 * "AMAZON MKTPL*BJ1KR9CN1" together while keeping distinct merchants apart.
 */

import type { Transaction } from '../types'

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
 * subscriptions). Grouping is by the **display name** (alias if set, else the
 * cleaned label), so renaming a merchant to match another — even one that
 * already shows that clean label — reliably merges them into one group.
 */
export function groupKey(description: string, aliases: Record<string, string> = {}): string {
  return groupLabel(description, aliases).toLowerCase().replace(/\s+/g, ' ').trim()
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

/**
 * A stable signature for a single transaction (date + normalized description +
 * amount), used to remember per-transaction flags (e.g. "this one Amazon charge
 * is my Prime subscription") so they survive a re-import.
 */
export function txSignature(date: string, description: string, amount: number): string {
  return `${date}|${description.toLowerCase().replace(/\s+/g, ' ').trim()}|${amount}`
}

/** True when two descriptions share at least one significant merchant word. */
export function sharesName(a: string, b: string): boolean {
  const ta = nameTokens(a)
  for (const w of nameTokens(b)) if (ta.has(w)) return true
  return false
}

/**
 * The charges worth offering alongside a single-row rename, before anything
 * else changes. Two tiers, like the category prompt: the ones at the SAME
 * amount (the other $9.99 Apple charges — very likely the same thing) and
 * every charge sharing the merchant name at any amount (the $6.48 ones too),
 * which the user reviews and unticks. Rows already showing `name` are left
 * out, since there's nothing to change on them.
 */
export function renameCandidates(
  target: Transaction,
  transactions: Transaction[],
  name: string,
  aliases: Record<string, string> = {},
): { sameAmount: Transaction[]; all: Transaction[] } {
  const all = transactions.filter(
    (x) =>
      x.id !== target.id &&
      sharesName(x.description, target.description) &&
      displayDescription(x.description, aliases) !== name,
  )
  return { sameAmount: all.filter((x) => x.amount === target.amount), all }
}

/**
 * The charges worth offering after a single category change, in the same two
 * tiers: the SAME amount at a merchant sharing the name (the other $118
 * Willow Bend dues, not the $342.50 ones), and every charge from that exact
 * merchant at any amount (for a power bill you always want in one place).
 * Rows already in `category` are left out, since there's nothing to change.
 */
export function categoryCandidates(
  target: Transaction,
  transactions: Transaction[],
  category: string,
): { sameAmount: Transaction[]; sameMerchant: Transaction[] } {
  const key = merchantKey(target.description)
  const others = transactions.filter((x) => x.id !== target.id && x.category !== category)
  return {
    sameAmount: others.filter(
      (x) => x.amount === target.amount && sharesName(x.description, target.description),
    ),
    sameMerchant: others.filter((x) => merchantKey(x.description) === key),
  }
}

/**
 * One offer in an apply-to-similar prompt: the rows it covers, and whether it
 * is the whole-merchant tier. Only a whole-merchant category offer may become
 * a remembered merchant rule (see merchantSweep); a same-amount offer is
 * always a one-off edit on exactly its rows, because "the 3 $342.50 charges"
 * is all the user agreed to, and one descriptor often covers two bills.
 */
export interface SimilarOffer {
  rows: Transaction[]
  wholeMerchant: boolean
}

/**
 * Turn the two candidate tiers into the offers to show, most specific first.
 * The wider tier is offered only when it reaches a row the same-amount one
 * doesn't, compared by row rather than by count: the two lists match on
 * different rules (a shared word vs. the exact merchant), so two lists of the
 * same length can still hold different charges.
 */
function similarOffers(sameAmount: Transaction[], whole: Transaction[]): SimilarOffer[] {
  const offers: SimilarOffer[] = []
  if (sameAmount.length > 0) offers.push({ rows: sameAmount, wholeMerchant: false })
  const inAmount = new Set(sameAmount.map((t) => t.id))
  if (whole.some((t) => !inAmount.has(t.id))) offers.push({ rows: whole, wholeMerchant: true })
  return offers
}

/** The offers after a single category change (see categoryCandidates). */
export function categoryOffers(
  target: Transaction,
  transactions: Transaction[],
  category: string,
): SimilarOffer[] {
  const { sameAmount, sameMerchant } = categoryCandidates(target, transactions, category)
  return similarOffers(sameAmount, sameMerchant)
}

/** The offers after a single-row rename (see renameCandidates). */
export function renameOffers(
  target: Transaction,
  transactions: Transaction[],
  name: string,
  aliases: Record<string, string> = {},
): SimilarOffer[] {
  const { sameAmount, all } = renameCandidates(target, transactions, name, aliases)
  return similarOffers(sameAmount, all)
}

/**
 * What a whole-merchant category sweep does to the rows as the user sees them
 * (renames applied). Rows showing the bank's own text get the merchant rule:
 * their stored category changes, any per-row pin is cleared so it can't
 * outrank the sweep, and the rule is remembered for future imports. A renamed
 * row is matched on the name the user gave it, which the bank's text and
 * future imports never carry, so a merchant rule can't reach it: it is pinned
 * per row instead. Matching renamed rows by their bank text instead would
 * sweep up charges the user split off on purpose (the $342.50 insurance
 * renamed away from the HOA dues on the same descriptor), and clearing their
 * pins would undo edits the sweep was meant to extend.
 */
export function merchantSweep(
  rows: Transaction[],
  key: string,
): { refile: string[]; unpin: string[]; pin: string[]; remember: boolean } {
  const matched = rows.filter((t) => merchantKey(t.description) === key)
  const plain = matched.filter((t) => !t.renamed)
  const renamed = matched.filter((t) => t.renamed)
  const keys = (list: Transaction[]) => list.flatMap((t) => (t.key ? [t.key] : []))
  return {
    refile: plain.map((t) => t.id),
    unpin: keys(plain),
    pin: keys(renamed),
    // A key nothing matches (yet) still came from bank text, so remember it;
    // one that only renamed rows match came from a user's label.
    remember: plain.length > 0 || renamed.length === 0,
  }
}
