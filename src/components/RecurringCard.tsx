import type { Transaction } from '../types'
import { recurringPayments } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency } from '../lib/format'
import { useStore } from '../store'
import { StarIcon } from './icons'

interface Props {
  transactions: Transaction[]
}

export function RecurringCard({ transactions }: Props) {
  const { setMerchantSubscription } = useStore()
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
        Monthly bills and repeating charges — fixed payments and subscriptions, plus variable bills
        (power, water) averaged per month. Tap the ★ to mark one a subscription.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.slice(0, 7).map((r) => (
          <li key={r.merchantKey} className="flex items-center gap-3 py-2">
            <button
              onClick={() => setMerchantSubscription(r.merchantKey, !r.isSubscription)}
              title={r.isSubscription ? 'Unflag subscription' : 'Flag as subscription'}
              aria-pressed={r.isSubscription}
              className={`shrink-0 rounded-md p-1 transition-colors ${
                r.isSubscription
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
              }`}
            >
              <StarIcon className="h-4 w-4" filled={r.isSubscription} />
            </button>
            <span aria-hidden>{categoryMeta(r.category).emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {r.merchant}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {r.fixed ? (
                  <>Same charge · {formatCurrency(r.recurringAmount)} each</>
                ) : (
                  <>Varies · avg of {r.count} over {r.months} mo</>
                )}
                {r.isSubscription && (
                  <span className="ml-1 text-amber-500 dark:text-amber-400">· subscription</span>
                )}
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
