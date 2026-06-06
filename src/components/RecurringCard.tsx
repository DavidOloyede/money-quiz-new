import type { Transaction } from '../types'
import { recurringPayments } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency } from '../lib/format'

interface Props {
  transactions: Transaction[]
}

export function RecurringCard({ transactions }: Props) {
  const items = recurringPayments(transactions)
  if (items.length === 0) return null
  const monthlyTotal = items.reduce((s, r) => s + r.monthlyEstimate, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recurring payments</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ~{formatCurrency(monthlyTotal)}/mo · {items.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Charges that repeat across 3+ months — subscriptions, bills, regular stops.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.slice(0, 6).map((r) => (
          <li key={r.merchant} className="flex items-center gap-3 py-2">
            <span aria-hidden>{categoryMeta(r.category).emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {r.merchant}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {r.count}× over {r.months} months
              </div>
            </div>
            <div className="text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
              {formatCurrency(r.monthlyEstimate)}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
