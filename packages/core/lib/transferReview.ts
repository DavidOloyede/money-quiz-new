/**
 * The review queue: the transfers that still need a human decision, once the
 * ones the user obviously made to themselves are out of the way.
 *
 * It reads ALREADY-RESOLVED rows — the store has stamped owner-name matches
 * and saved per-counterparty rules onto them as treatments by the time this
 * runs — so "still needs deciding" is simply "transfer-shaped, and nobody has
 * said anything about it yet".
 */
import type { Category, Transaction, TxTreatment } from '../types'
import { counterparty, isTransferDescription } from './owner'

/**
 * What the user decided about one counterparty, applied to their future
 * transfers as well as the ones on screen. A bare `reviewed` means "leave
 * these alone, just stop asking me".
 */
export interface TransferRule {
  /** Re-file this counterparty's transfers under a category. */
  category?: Category
  /** Or change how they count. */
  treatment?: Exclude<TxTreatment, 'normal'>
  reviewed: true
  /** ISO timestamp, so the Settings list can show when it was decided. */
  decidedAt: string
}

export type TransferRules = Record<string, TransferRule>

export interface ReviewGroup {
  key: string
  label: string
  count: number
  /** Total money in from this counterparty, as a positive number. */
  moneyIn: number
  /** Total money out to them, as a positive number. */
  moneyOut: number
  ids: string[]
  lastDate: string
}

/**
 * True when a row is a transfer nobody has ruled on: not already treated
 * (by an owner-name match, a saved rule, or a direct choice) and not
 * re-filed by hand.
 */
export function needsReview(t: Transaction, rules: TransferRules = {}): boolean {
  if (!isTransferDescription(t.description)) return false
  if (t.treatment) return false
  if (t.overridden) return false
  const key = counterparty(t.description)?.key
  return !!key && !rules[key]
}

/** The queue, grouped by who the money went to or came from, busiest first. */
export function transferReviewGroups(
  transactions: Transaction[],
  rules: TransferRules = {},
): ReviewGroup[] {
  const map = new Map<string, ReviewGroup>()
  for (const t of transactions) {
    if (!needsReview(t, rules)) continue
    const who = counterparty(t.description)
    if (!who) continue
    const g =
      map.get(who.key) ??
      { key: who.key, label: who.label, count: 0, moneyIn: 0, moneyOut: 0, ids: [], lastDate: '' }
    g.count += 1
    if (t.amount > 0) g.moneyIn += t.amount
    else g.moneyOut += -t.amount
    g.ids.push(t.id)
    if (t.date > g.lastDate) g.lastDate = t.date
    map.set(who.key, g)
  }
  return [...map.values()].sort(
    (a, b) => b.moneyIn + b.moneyOut - (a.moneyIn + a.moneyOut) || b.count - a.count,
  )
}

/** How many transfers are still waiting on a decision. */
export function unreviewedTransferCount(
  transactions: Transaction[],
  rules: TransferRules = {},
): number {
  let n = 0
  for (const t of transactions) if (needsReview(t, rules)) n++
  return n
}
