/**
 * Debt-freedom tracking — the Loans & Debt category watched over time, with a
 * "looks paid off" detector for recurring loan payments that stop appearing.
 * "The borrower is servant to the lender" (Proverbs 22:7, WEB); every payment
 * retired buys back freedom.
 */
import type { Category, PaidOffDebts, Transaction } from '../types'
import {
  countsTowardTotals,
  monthKey,
  recurringPayments,
  type Aliases,
  type RecurringPayment,
} from './analysis'

export const DEBT_CATEGORY: Category = 'loans'

/** Days without a charge before a recurring loan looks paid off. */
export const PAID_OFF_AFTER_DAYS = 45

/** Recurring payments narrowed to the Loans & Debt category. */
export function debtRecurring(
  transactions: Transaction[],
  aliases: Aliases = {},
  dismissed: Record<string, true> = {},
): RecurringPayment[] {
  return recurringPayments(transactions, aliases, dismissed).filter(
    (r) => r.category === DEBT_CATEGORY,
  )
}

export interface DebtMonth {
  monthKey: string
  total: number
}

/** Per-month loan/debt payments, oldest month first. */
export function monthlyDebtTrend(transactions: Transaction[]): DebtMonth[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.amount >= 0 || t.category !== DEBT_CATEGORY || !countsTowardTotals(t)) continue
    const k = monthKey(t.date)
    map.set(k, (map.get(k) ?? 0) + -t.amount)
  }
  return [...map.entries()]
    .map(([k, total]) => ({ monthKey: k, total }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

function utcTime(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

export interface PaidOffCandidate {
  payment: RecurringPayment
  /** Days between this loan's last charge and the newest data in the app. */
  daysSince: number
}

/**
 * Recurring loan groups that have gone quiet — no charge for more than
 * PAID_OFF_AFTER_DAYS before the *newest transaction in the data* (not the
 * wall clock, so a stale import doesn't flag every loan at once). Confirmed
 * payoffs are excluded; the user confirms candidates by hand.
 */
export function paidOffCandidates(
  transactions: Transaction[],
  aliases: Aliases = {},
  dismissed: Record<string, true> = {},
  confirmed: PaidOffDebts = {},
): PaidOffCandidate[] {
  if (transactions.length === 0) return []
  let newest = ''
  for (const t of transactions) if (t.date > newest) newest = t.date
  const newestMs = utcTime(newest)
  const out: PaidOffCandidate[] = []
  for (const r of debtRecurring(transactions, aliases, dismissed)) {
    if (confirmed[r.groupKey]) continue
    const daysSince = Math.round((newestMs - utcTime(r.lastDate)) / 86_400_000)
    if (daysSince > PAID_OFF_AFTER_DAYS) out.push({ payment: r, daysSince })
  }
  return out.sort((a, b) => b.payment.monthlyEstimate - a.payment.monthlyEstimate)
}
