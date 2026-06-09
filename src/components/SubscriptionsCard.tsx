import type { Transaction } from '../types'
import { subscriptions } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatDate } from '../lib/format'
import { useStore } from '../store'
import { StarIcon } from './icons'

interface Props {
  transactions: Transaction[]
}

/**
 * Every merchant the user flagged as a subscription, gathered in one place with
 * its recurring amount and a combined monthly total. Unlike the Recurring card
 * (which auto-detects anything that repeats), this list is purely the user's
 * own subscription flags.
 */
export function SubscriptionsCard({ transactions }: Props) {
  const { setMerchantSubscription } = useStore()
  const items = subscriptions(transactions)
  const monthlyTotal = items.reduce((s, r) => s + r.monthlyEstimate, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Subscriptions</h3>
        {items.length > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ~{formatCurrency(monthlyTotal)}/mo · {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
          Nothing flagged yet. Tap the <StarIcon className="inline h-4 w-4 align-text-bottom" /> on any
          charge — in <span className="font-medium">Your transactions</span> or the Recurring payments
          list — to track all your subscriptions here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.slice(0, 8).map((r) => (
            <li key={r.merchantKey} className="flex items-center gap-3 py-2">
              <button
                onClick={() => setMerchantSubscription(r.merchantKey, false)}
                title="Remove from subscriptions"
                className="shrink-0 rounded-md p-1 text-amber-500 transition-colors hover:text-amber-600"
              >
                <StarIcon className="h-4 w-4" filled />
              </button>
              <span aria-hidden>{categoryMeta(r.category).emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {r.merchant}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {r.fixed ? formatCurrency(r.recurringAmount) : `~${formatCurrency(r.avgAmount)}`} each ·
                  last {formatDate(r.lastDate)}
                </div>
              </div>
              <div className="text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatCurrency(r.monthlyEstimate)}
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
