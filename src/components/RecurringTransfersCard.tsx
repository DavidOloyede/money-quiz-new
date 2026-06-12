import { useMemo } from 'react'
import type { Transaction } from '../types'
import { recurringTransfers } from '../lib/analysis'
import { formatCurrency } from '../lib/format'
import { useStore } from '../store'

interface Props {
  transactions: Transaction[]
  onOpenGroup: (ids: string[]) => void
}

/**
 * Transfers / Zelle that recur at the same amount on the same day each month —
 * real bills hiding among internal transfers (e.g. a monthly phone Zelle).
 * These count toward spending/income by default; untick "Counts" for genuine
 * account-to-account moves (like a 401k sweep) you don't want in your totals.
 */
export function RecurringTransfersCard({ transactions, onOpenGroup }: Props) {
  const { aliases, ignoredTransfers, setTransferCounted } = useStore()
  const items = useMemo(() => recurringTransfers(transactions, aliases), [transactions, aliases])
  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recurring transfers</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{items.length}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Same-amount Zelle/transfers that repeat monthly. Counted as real spending/income by default —
        untick any that are just money between your own accounts. Tap a row to confirm or recategorize.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.slice(0, 7).map((rt) => {
          const counted = !ignoredTransfers[rt.key]
          return (
            <li key={rt.key} className="flex items-center gap-3 py-2">
              <button
                onClick={() => onOpenGroup(rt.ids)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    rt.direction === 'out'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  }`}
                >
                  {rt.direction}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {rt.label}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {formatCurrency(rt.amount)} · {rt.count}× over {rt.months} mo · ~day {rt.day}
                  </div>
                </div>
              </button>
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                title="Count this transfer toward spending/income"
              >
                <input
                  type="checkbox"
                  checked={counted}
                  onChange={(e) => setTransferCounted(rt.key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Counts
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
