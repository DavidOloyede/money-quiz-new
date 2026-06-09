import type { Transaction, SubscriptionMeta } from '../types'
import { subscriptions, type RecurringPayment } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatDate } from '../lib/format'
import { useStore } from '../store'
import { StarIcon } from './icons'

interface Props {
  transactions: Transaction[]
  onOpenGroup: (ids: string[]) => void
}

/** A short "when does it bill / has it ended" line from the subscription's details. */
function cadenceLine(r: RecurringPayment, meta: SubscriptionMeta | undefined): string {
  const each = r.fixed ? formatCurrency(r.recurringAmount) : `~${formatCurrency(r.avgAmount)}`
  if (meta?.endedDate) return `Ended ${formatDate(meta.endedDate)} · was ${each}`
  if (meta?.cadence === 'annual') {
    return meta.renewalDate ? `Annual · renews ${formatDate(meta.renewalDate)}` : `Annual · ${each}`
  }
  if (meta?.cadence === 'monthly' && meta.billingDay) return `Monthly · charged ~day ${meta.billingDay}`
  return `${each} each · last ${formatDate(r.lastDate)}`
}

/**
 * Every merchant the user flagged as a subscription, with its recurring amount,
 * billing cadence, and a combined monthly total. Click a row to set cadence /
 * renewal / ended dates or see the charges.
 */
export function SubscriptionsCard({ transactions, onOpenGroup }: Props) {
  const { aliases, subscriptionMeta, setGroupSubscription } = useStore()
  const items = subscriptions(transactions, aliases)
  // Monthly total ignores subscriptions marked as ended.
  const active = items.filter((r) => !r.keys.some((k) => subscriptionMeta[k]?.endedDate))
  const monthlyTotal = active.reduce((s, r) => s + r.monthlyEstimate, 0)

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
          list — to track subscriptions here, including yearly ones.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.slice(0, 8).map((r) => {
            const meta = r.keys.map((k) => subscriptionMeta[k]).find(Boolean)
            const ended = !!meta?.endedDate
            return (
              <li key={r.groupKey}>
                <button
                  onClick={() => onOpenGroup(r.ids)}
                  className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setGroupSubscription(r.ids, false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        setGroupSubscription(r.ids, false)
                      }
                    }}
                    title="Remove from subscriptions"
                    className="shrink-0 rounded-md p-1 text-amber-500 transition-colors hover:text-amber-600"
                  >
                    <StarIcon className="h-4 w-4" filled />
                  </span>
                  <span aria-hidden>{categoryMeta(r.category).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-medium ${
                        ended
                          ? 'text-slate-400 line-through dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {r.merchant}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{cadenceLine(r, meta)}</div>
                  </div>
                  <div className="text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(r.monthlyEstimate)}
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
