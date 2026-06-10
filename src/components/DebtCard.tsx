import { useMemo } from 'react'
import type { PaidOffDebts, Transaction } from '../types'
import type { Aliases } from '../lib/analysis'
import { debtRecurring, monthlyDebtTrend, paidOffCandidates } from '../lib/debt'
import { formatCurrency, formatDate, formatMonth } from '../lib/format'

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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Debt freedom</h3>
        {monthlyTotal > 0 && (
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
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
                  className="w-full max-w-8 rounded-t bg-amber-400 dark:bg-amber-600"
                  style={{ height: `${Math.max(m.total > 0 ? 6 : 0, (m.total / maxMonth) * 100)}%` }}
                  title={`${formatMonth(m.monthKey)}: ${formatCurrency(m.total)}`}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                {formatMonth(m.monthKey).split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {active.map((d) => (
            <li key={d.groupKey}>
              <button
                onClick={() => onOpenGroup(d.ids)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    🏦 {d.merchant}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    last payment {formatDate(d.lastDate)}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatCurrency(d.monthlyEstimate)}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500"> /mo</span>
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-amber-800 dark:text-amber-300">
                  {d.merchant} — possibly paid off?
                </div>
                <div className="text-xs text-amber-700/80 dark:text-amber-400/80">
                  No payment in {daysSince} days (was {formatCurrency(d.monthlyEstimate)}/mo)
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onSetPaidOff(d.groupKey, true)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Confirm paid off
                </button>
                <button
                  onClick={() => onOpenGroup(d.ids)}
                  className="rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    🎉 {d.merchant} — paid off {confirmedAt ? formatDate(confirmedAt.slice(0, 10)) : ''}
                  </div>
                  <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    {resumed
                      ? '⚠️ New payments appeared after this was confirmed.'
                      : `${formatCurrency(d.monthlyEstimate)}/mo freed for saving and giving`}
                  </div>
                </div>
                <button
                  onClick={() => onSetPaidOff(d.groupKey, false)}
                  className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 underline-offset-2 hover:underline"
                >
                  Undo
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-4 text-xs italic text-slate-400 dark:text-slate-500">
        “Owe no one anything, except to love one another.” — Romans 13:8
      </p>
    </div>
  )
}
