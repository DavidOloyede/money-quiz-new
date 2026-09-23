/**
 * One filter predicate, shared by every list of transactions in the app.
 *
 * The transaction table, both drill-in modals and the apply-to-similar preview
 * all need the same combination — text, amount, category, source — and they
 * used to each grow their own half of it. Keeping it here means "Willow Bend
 * at exactly $118" narrows the same way wherever you happen to be standing.
 *
 * Amounts are matched on magnitude, so you can look for a $118 charge without
 * first remembering whether it was money in or money out.
 */
import type { Category, Transaction } from '../types'

export interface TransactionCriteria {
  /** Substring of the description, case-insensitive. */
  query?: string
  /** A single category id, or 'all'. */
  category?: Category | 'all'
  /** Import source ids to include; empty or absent means all of them. */
  sources?: string[]
  /** Exact magnitude, e.g. 118 finds both -118 and +118. Beats min/max. */
  amount?: number | null
  /** Magnitude range. */
  min?: number | null
  max?: number | null
  /** Only rows carrying the ★ recurring flag. */
  recurringOnly?: boolean
}

/** True when nothing is being narrowed, so callers can skip the work. */
export function isEmptyCriteria(c: TransactionCriteria): boolean {
  return (
    !c.query?.trim() &&
    (!c.category || c.category === 'all') &&
    !c.sources?.length &&
    c.amount == null &&
    c.min == null &&
    c.max == null &&
    !c.recurringOnly
  )
}

/** Cents, so 118.10 vs 118.1 can't miss each other through float noise. */
function cents(n: number): number {
  return Math.round(Math.abs(n) * 100)
}

export function matchesCriteria(t: Transaction, c: TransactionCriteria): boolean {
  if (c.recurringOnly && !t.recurring) return false
  if (c.category && c.category !== 'all' && t.category !== c.category) return false
  if (c.sources?.length && !c.sources.includes(t.sourceId ?? '')) return false

  const q = c.query?.trim().toLowerCase()
  if (q && !t.description.toLowerCase().includes(q)) return false

  const magnitude = cents(t.amount)
  if (c.amount != null) {
    if (magnitude !== cents(c.amount)) return false
  } else {
    if (c.min != null && magnitude < cents(c.min)) return false
    if (c.max != null && magnitude > cents(c.max)) return false
  }
  return true
}

export function filterTransactions(
  transactions: Transaction[],
  criteria: TransactionCriteria,
): Transaction[] {
  if (isEmptyCriteria(criteria)) return transactions
  return transactions.filter((t) => matchesCriteria(t, criteria))
}
