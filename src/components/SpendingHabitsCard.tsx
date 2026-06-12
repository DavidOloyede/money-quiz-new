import type { RecurringPayment } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency } from '../lib/format'

interface Props {
  /** Repeat-habit groups, precomputed by Dashboard's shared recurringPayments pass. */
  items: RecurringPayment[]
  onOpenGroup: (ids: string[]) => void
}

/**
 * Repeat merchants that aren't bills — Amazon, the pharmacy, a burger spot —
 * places you go back to month after month with varying amounts. They're
 * patterns worth knowing, not obligations, so they live here instead of the
 * Recurring & subscriptions card. A group can be re-filed as a bill (or a bill
 * as a habit) from its detail view.
 */
export function SpendingHabitsCard({ items, onOpenGroup }: Props) {
  if (items.length === 0) return null
  const total = items.reduce((s, r) => s + r.monthlyEstimate, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Spending habits</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ~{formatCurrency(total)}/mo · {items.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Merchants you keep going back to — not bills, just patterns. The amounts vary, but the
        habit repeats. Tap a row to see the charges or re-file one as an expected bill.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.slice(0, 8).map((r) => (
          <li key={r.groupKey}>
            <button
              onClick={() => onOpenGroup(r.ids)}
              className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span aria-hidden>{categoryMeta(r.category).emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {r.merchant}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {r.count} charges over {r.months} mo · ~{formatCurrency(r.avgAmount)} each
                </div>
              </div>
              <div className="text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatCurrency(r.monthlyEstimate)}
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
