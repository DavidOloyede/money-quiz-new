import { useState } from 'react'
import type { SubscriptionMeta, Transaction } from '../types'
import { recurringPayments, type RecurringPayment } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatDate } from '../lib/format'
import { useStore } from '../store'
import { StarIcon } from './icons'

interface Props {
  transactions: Transaction[]
  onOpenGroup: (ids: string[]) => void
}

type View = 'all' | 'subs'

/** A short "when does it bill / has it ended" line for a subscription. */
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
 * One card for everything that repeats: subscriptions (the Subscriptions
 * category, shown with a badge + billing cadence) and other recurring payments —
 * fixed bills and averaged variable ones. The ★ flags a row as recurring; a
 * Show: All | Subscriptions toggle narrows to the subscription subset.
 */
export function RecurringCard({ transactions, onOpenGroup }: Props) {
  const { aliases, subscriptionMeta, dismissedRecurring, setGroupRecurring } = useStore()
  const [view, setView] = useState<View>('all')

  const items = recurringPayments(transactions, aliases, dismissedRecurring)
  if (items.length === 0) return null
  const subs = items.filter((r) => r.isSubscription)
  const shown = view === 'subs' ? subs : items

  // Monthly totals — the subscriptions subtotal leaves out ended ones.
  const allTotal = items.reduce((s, r) => s + r.monthlyEstimate, 0)
  const subsTotal = subs
    .filter((r) => !r.keys.some((k) => subscriptionMeta[k]?.endedDate))
    .reduce((s, r) => s + r.monthlyEstimate, 0)
  const total = view === 'subs' ? subsTotal : allTotal

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recurring &amp; subscriptions</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ~{formatCurrency(total)}/mo · {shown.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Everything that repeats — bills, subscriptions, and variable charges (power, water) averaged.
        Tap a row to see the charges, rename, or set billing details; tap ★ to flag one as recurring.
      </p>

      {subs.length > 0 && (
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
          {(['all', 'subs'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                view === v
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {v === 'all' ? 'All' : 'Subscriptions'}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
          No subscriptions yet. Set a charge&apos;s category to{' '}
          <span className="font-medium">Subscriptions</span> to track it here, with its cadence and
          charge date.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {shown.slice(0, 8).map((r) => {
            const meta = r.keys.map((k) => subscriptionMeta[k]).find(Boolean)
            const day = r.keys.map((k) => subscriptionMeta[k]?.billingDay).find(Boolean)
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
                      setGroupRecurring(r.ids, !r.isRecurringFlagged)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        setGroupRecurring(r.ids, !r.isRecurringFlagged)
                      }
                    }}
                    title={r.isRecurringFlagged ? 'Unflag recurring' : 'Flag as recurring'}
                    className={`shrink-0 rounded-md p-1 transition-colors ${
                      r.isRecurringFlagged
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
                    }`}
                  >
                    <StarIcon className="h-4 w-4" filled={r.isRecurringFlagged} />
                  </span>
                  <span aria-hidden>{categoryMeta(r.category).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`truncate text-sm font-medium ${
                          ended
                            ? 'text-slate-400 line-through dark:text-slate-500'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {r.merchant}
                      </span>
                      {r.isSubscription && (
                        <span className="shrink-0 rounded bg-violet-100 dark:bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                          sub
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {r.isSubscription ? (
                        cadenceLine(r, meta)
                      ) : (
                        <>
                          {r.fixed ? (
                            <>Same charge · {formatCurrency(r.recurringAmount)} each</>
                          ) : (
                            <>
                              Varies · avg of {r.count} over {r.months} mo
                            </>
                          )}
                          {day ? <span> · ~day {day}</span> : null}
                        </>
                      )}
                    </div>
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
