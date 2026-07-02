import { useMemo } from 'react'
import type { PaidOffDebts, Transaction } from '@moneyquiz/core/types'
import type { Aliases } from '@moneyquiz/core/lib/analysis'
import { debtRecurring, monthlyDebtTrend, paidOffCandidates } from '@moneyquiz/core/lib/debt'
import { formatCurrency, formatDate, formatMonth } from '@moneyquiz/core/lib/format'

interface Props {
  transactions: Transaction[]
  aliases: Aliases
  dismissedRecurring: Record<string, true>
  paidOffDebts: PaidOffDebts
  onSetPaidOff: (groupKey: string, paidOff: boolean) => void
  onOpenGroup: (ids: string[]) => void
}

/**
 * Debt freedom — recurring loan payments tracked month by month, with quiet
 * loans surfaced as "possibly paid off" for the user to confirm and celebrate.
 * "The borrower is servant to the lender" (Proverbs 22:7); every payoff is
 * freedom bought back.
 */
export function DebtCard({
  transactions,
  aliases,
  dismissedRecurring,
  paidOffDebts,
  onSetPaidOff,
  onOpenGroup,
}: Props) {
  const debts = useMemo(
    () => debtRecurring(transactions, aliases, dismissedRecurring),
    [transactions, aliases, dismissedRecurring],
  )
  const trend = useMemo(() => monthlyDebtTrend(transactions).slice(-12), [transactions])
  const candidates = useMemo(
    () => paidOffCandidates(transactions, aliases, dismissedRecurring, paidOffDebts),
    [transactions, aliases, dismissedRecurring, paidOffDebts],
  )
  const candidateKeys = new Set(candidates.map((c) => c.payment.groupKey))
  const active = debts.filter((d) => !candidateKeys.has(d.groupKey) && !paidOffDebts[d.groupKey])
  const confirmed = debts.filter((d) => paidOffDebts[d.groupKey])
  const monthlyTotal = active.reduce((a, d) => a + d.monthlyEstimate, 0)
  const maxMonth = Math.max(1, ...trend.map((m) => m.total))

  // Debt-free users shouldn't see an empty card (the badge still shows on Quiz).
  if (debts.length === 0 && trend.length === 0 && confirmed.length === 0) return null

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Debt freedom</h3>
        {monthlyTotal > 0 && (
          <span className="text-xs tabular-nums text-linen-400 dark:text-linen-500">
            ~{formatCurrency(monthlyTotal)} / month
          </span>
        )}
      </div>

      {trend.length > 1 && (
        <div className="mt-3 flex items-end gap-1.5">
          {trend.map((m) => (
            <div key={m.monthKey} className="flex-1 text-center">
              <div className="flex h-14 items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t bg-honey-400 dark:bg-honey-600"
                  style={{ height: `${Math.max(m.total > 0 ? 6 : 0, (m.total / maxMonth) * 100)}%` }}
                  title={`${formatMonth(m.monthKey)}: ${formatCurrency(m.total)}`}
                />
              </div>
              <div className="mt-1 text-[10px] text-linen-400 dark:text-linen-500">
                {formatMonth(m.monthKey).split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <ul className="mt-3 divide-y divide-linen-100 dark:divide-linen-800">
          {active.map((d) => (
            <li key={d.groupKey}>
              <button
                onClick={() => onOpenGroup(d.ids)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-linen-50 dark:hover:bg-linen-800/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-linen-700 dark:text-linen-200">
                    🏦 {d.merchant}
                  </div>
                  <div className="text-xs text-linen-400 dark:text-linen-500">
                    last payment {formatDate(d.lastDate)}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-linen-800 dark:text-linen-100">
                  {formatCurrency(d.monthlyEstimate)}
                  <span className="text-xs font-normal text-linen-400 dark:text-linen-500"> /mo</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 && (
        <div className="mt-3 space-y-2">
          {candidates.map(({ payment: d, daysSince }) => (
            <div
              key={d.groupKey}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-honey-50 dark:bg-honey-500/10 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-honey-800 dark:text-honey-300">
                  {d.merchant} — possibly paid off?
                </div>
                <div className="text-xs text-honey-700/80 dark:text-honey-400/80">
                  No payment in {daysSince} days (was {formatCurrency(d.monthlyEstimate)}/mo)
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onSetPaidOff(d.groupKey, true)}
                  className="rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-700"
                >
                  Confirm paid off
                </button>
                <button
                  onClick={() => onOpenGroup(d.ids)}
                  className="rounded-lg border border-honey-300 dark:border-honey-700 px-3 py-1.5 text-xs font-medium text-honey-800 dark:text-honey-300 hover:bg-honey-100 dark:hover:bg-honey-500/20"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmed.length > 0 && (
        <ul className="mt-3 space-y-2">
          {confirmed.map((d) => {
            const confirmedAt = paidOffDebts[d.groupKey]
            // New charges after the confirmation mean it wasn't done after all.
            const resumed = confirmedAt && d.lastDate > confirmedAt.slice(0, 10)
            return (
              <li
                key={d.groupKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-forest-50 dark:bg-forest-500/10 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-forest-800 dark:text-forest-300">
                    🎉 {d.merchant} — paid off {confirmedAt ? formatDate(confirmedAt.slice(0, 10)) : ''}
                  </div>
                  <div className="text-xs text-forest-700/80 dark:text-forest-400/80">
                    {resumed
                      ? '⚠️ New payments appeared after this was confirmed.'
                      : `${formatCurrency(d.monthlyEstimate)}/mo freed for saving and giving`}
                  </div>
                </div>
                <button
                  onClick={() => onSetPaidOff(d.groupKey, false)}
                  className="shrink-0 text-xs font-medium text-forest-700 hover:text-forest-800 dark:text-forest-400 underline-offset-2 hover:underline"
                >
                  Undo
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-4 text-xs italic text-linen-400 dark:text-linen-500">
        “Owe no one anything, except to love one another.” — Romans 13:8
      </p>
    </div>
  )
}
