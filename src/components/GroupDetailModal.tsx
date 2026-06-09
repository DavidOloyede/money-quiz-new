import { useMemo, useState } from 'react'
import type { Category, SubscriptionCadence } from '../types'
import { useStore } from '../store'
import { allCategories, categoryMeta } from '../lib/categories'
import { merchantKey, groupLabel, displayDescription } from '../lib/merchant'
import { formatCurrency, formatDate } from '../lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { XIcon, StarIcon } from './icons'

interface Props {
  /** Member transaction ids of the group being inspected. */
  ids: string[]
  onClose: () => void
}

/**
 * Drill-in for a recurring payment / subscription / transfer group: lists the
 * underlying transactions, lets you rename the whole group (alias), edit
 * categories inline, and — for subscriptions — record cadence, billing day,
 * renewal, and ended dates.
 */
export function GroupDetailModal({ ids, onClose }: Props) {
  const { transactions, aliases, subscriptionMeta, setAlias, setGroupSubscription, setSubscriptionMeta } =
    useStore()
  const { change, node } = useApplyToSimilar()

  const idset = useMemo(() => new Set(ids), [ids])
  const items = useMemo(
    () => transactions.filter((t) => idset.has(t.id)).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, idset],
  )
  const keys = useMemo(() => [...new Set(items.map((t) => merchantKey(t.description)))], [items])
  const first = items[0]
  const defaultName = first ? groupLabel(first.description, aliases) : ''
  const [name, setName] = useState(defaultName)

  if (!first) return null

  const isSub = items.some((t) => t.subscription)
  const meta = keys.map((k) => subscriptionMeta[k]).find(Boolean) ?? {}
  const out = items.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0)
  const inn = items.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0)

  const saveName = () => {
    if (name.trim() !== defaultName) setAlias(ids, name)
  }
  const patchMeta = (patch: Partial<typeof meta>) => setSubscriptionMeta(keys, patch)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: rename + summary */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-5">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Name
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Merchant name"
                  aria-label="Group name"
                />
                <button
                  onClick={saveName}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Rename
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {items.length} transaction{items.length === 1 ? '' : 's'}
                {out > 0 && ` · ${formatCurrency(out)} out`}
                {inn > 0 && ` · ${formatCurrency(inn)} in`}
                {' '}· renaming applies to all of these and future imports
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-600"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Subscription settings */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setGroupSubscription(ids, !isSub)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isSub
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <StarIcon className="h-4 w-4" filled={isSub} />
                {isSub ? 'Subscription' : 'Mark as subscription'}
              </button>

              {isSub && (
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                  {(['monthly', 'annual'] as SubscriptionCadence[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => patchMeta({ cadence: c })}
                      className={`rounded-md px-2.5 py-1 text-sm capitalize transition-colors ${
                        meta.cadence === c
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isSub && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {meta.cadence === 'annual' ? (
                  <Field label="Next renewal">
                    <input
                      type="date"
                      value={meta.renewalDate ?? ''}
                      onChange={(e) => patchMeta({ renewalDate: e.target.value || undefined })}
                      className={inputCls}
                    />
                  </Field>
                ) : (
                  <Field label="Charged on day">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={meta.billingDay ?? ''}
                      onChange={(e) =>
                        patchMeta({
                          billingDay: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 6"
                      className={inputCls}
                    />
                  </Field>
                )}
                <Field label="Ended (if cancelled)">
                  <input
                    type="date"
                    value={meta.endedDate ?? ''}
                    onChange={(e) => patchMeta({ endedDate: e.target.value || undefined })}
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-500 dark:text-slate-400">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden>{categoryMeta(t.category).emoji}</span>
                        {displayDescription(t.description, aliases)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={t.category}
                        onChange={(e) => change(t.id, e.target.value as Category)}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-sm text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        aria-label={`Category for ${t.description}`}
                      >
                        {allCategories().map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-2.5 text-right font-medium tabular-nums ${
                        t.amount < 0 ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {node}
    </>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
