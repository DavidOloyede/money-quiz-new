import { useMemo, useState } from 'react'
import type { Category, SubscriptionCadence, SubscriptionMeta } from '../types'
import { recurringPayments, type RecurringKind } from '../lib/analysis'
import { useStore } from '../store'
import {
  allCategories,
  categoryMeta,
  isSubscriptionCategory,
  SUBSCRIPTIONS_CATEGORY,
} from '../lib/categories'
import { merchantKey, groupKey, groupLabel, displayDescription } from '../lib/merchant'
import { formatCurrency, formatDate } from '../lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { useRenameSimilar, EditableDescription } from './RenameDescription'
import { useRecurringSimilar } from './RecurringSimilar'
import { SortHeader } from './SortHeader'
import { XIcon, StarIcon } from './icons'

interface Props {
  /** Member transaction ids of the group being inspected. */
  ids: string[]
  onClose: () => void
}

/** Staged edits, committed together on Save. */
interface Draft {
  name: string
  cadence?: SubscriptionCadence
  billingDay?: number
  renewalDate?: string
  endedDate?: string
}

type SortKey = 'date' | 'category' | 'amount' | 'description'

/**
 * Drill-in for a recurring payment / subscription / transfer group: lists the
 * underlying transactions, lets you rename the whole group (alias), edit
 * categories inline, ★-flag it as recurring, and — for subscriptions — record
 * cadence, billing day, renewal, and ended dates. Name, cadence, and charge date
 * are staged and applied together with the Save button.
 */
export function GroupDetailModal({ ids, onClose }: Props) {
  const {
    transactions,
    aliases,
    subscriptionMeta,
    dismissedRecurring,
    recurringKinds,
    setAlias,
    setGroupRecurring,
    setSubscriptionMeta,
    setRecurringDismissed,
    setRecurringKind,
    setCategoryForMerchant,
  } = useStore()
  const { change, node } = useApplyToSimilar()
  const { rename, node: renameNode } = useRenameSimilar()
  const { toggle: toggleRecurring, node: recurringNode } = useRecurringSimilar()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const idset = useMemo(() => new Set(ids), [ids])
  const items = useMemo(() => {
    const arr = transactions.filter((t) => idset.has(t.id))
    arr.sort((a, b) => {
      let cmp: number
      switch (sortKey) {
        case 'date':
          cmp = a.date.localeCompare(b.date)
          break
        case 'amount':
          cmp = Math.abs(a.amount) - Math.abs(b.amount)
          break
        case 'description':
          cmp = displayDescription(a.description, aliases).localeCompare(
            displayDescription(b.description, aliases),
          )
          break
        case 'category':
          cmp = categoryMeta(a.category).label.localeCompare(categoryMeta(b.category).label)
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [transactions, idset, sortKey, sortAsc, aliases])
  // Category only sorts when the group actually mixes categories.
  const mixedCategories = useMemo(
    () => new Set(items.map((t) => t.category)).size > 1,
    [items],
  )

  // First click: date latest→earliest, text A→Z, amount biggest first.
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key === 'description' || key === 'category')
    }
  }

  const keys = useMemo(() => [...new Set(items.map((t) => merchantKey(t.description)))], [items])
  const first = items[0]
  const defaultName = first ? groupLabel(first.description, aliases) : ''
  const meta = useMemo<SubscriptionMeta>(
    () => keys.map((k) => subscriptionMeta[k]).find(Boolean) ?? {},
    [keys, subscriptionMeta],
  )
  const [draft, setDraft] = useState<Draft>(() => ({
    name: defaultName,
    cadence: meta.cadence,
    billingDay: meta.billingDay,
    renewalDate: meta.renewalDate,
    endedDate: meta.endedDate,
  }))

  // Whether this group qualifies as recurring, and its bill/habit filing
  // (heuristic or user override) — drives the "Treat as" control below.
  const recurringGroup = useMemo(() => {
    if (!first) return undefined
    const k = groupKey(first.description, aliases)
    return recurringPayments(transactions, aliases, {}, recurringKinds).find(
      (r) => r.groupKey === k,
    )
  }, [transactions, aliases, recurringKinds, first])

  if (!first) return null

  const gKey = groupKey(first.description, aliases)
  const isRecurringFlagged = items.some((t) => t.recurring)
  const isSubscription = items.some((t) => isSubscriptionCategory(t.category))
  const inRecurring = !dismissedRecurring[gKey]
  const out = items.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0)
  const inn = items.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0)

  const norm = (v?: string | number) => (v === '' || v === undefined ? undefined : v)
  const clean = draft.name.trim()
  const nameDirty = clean !== '' && clean !== defaultName
  const metaDirty =
    norm(draft.cadence) !== norm(meta.cadence) ||
    norm(draft.billingDay) !== norm(meta.billingDay) ||
    norm(draft.renewalDate) !== norm(meta.renewalDate) ||
    norm(draft.endedDate) !== norm(meta.endedDate)
  const dirty = nameDirty || metaDirty

  const save = () => {
    if (nameDirty) setAlias(ids, clean)
    if (metaDirty) {
      setSubscriptionMeta(keys, {
        cadence: draft.cadence,
        billingDay: draft.billingDay,
        renewalDate: draft.renewalDate,
        endedDate: draft.endedDate,
      })
    }
    onClose()
  }

  const makeSubscription = () => {
    for (const k of keys) setCategoryForMerchant(k, SUBSCRIPTIONS_CATEGORY)
  }

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
              <div className="mt-1">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Merchant name"
                  aria-label="Group name"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {items.length} transaction{items.length === 1 ? '' : 's'}
                {out > 0 && ` · ${formatCurrency(out)} out`}
                {inn > 0 && ` · ${formatCurrency(inn)} in`}
                {' '}· name, cadence &amp; charge date apply on Save (to all of these and future imports)
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

          {/* Group settings */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setGroupRecurring(ids, !isRecurringFlagged)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isRecurringFlagged
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <StarIcon className="h-4 w-4" filled={isRecurringFlagged} />
                {isRecurringFlagged ? 'Recurring' : 'Mark as recurring'}
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={inRecurring}
                  onChange={(e) => setRecurringDismissed(gKey, !e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Show in recurring payments
              </label>

              {recurringGroup && (
                <div className="inline-flex items-center gap-1.5">
                  <span
                    className="text-sm text-slate-600 dark:text-slate-300"
                    title="Bills are expected payments (rent, power); habits are repeat merchants whose amounts vary (Amazon, pharmacy runs)"
                  >
                    Treat as
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                    {(['bill', 'habit'] as RecurringKind[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setRecurringKind(gKey, k)}
                        aria-pressed={recurringGroup.kind === k}
                        className={`rounded-md px-2.5 py-1 text-sm capitalize transition-colors ${
                          recurringGroup.kind === k
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {k === 'bill' ? 'Expected bill' : 'Habit'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSubscription ? (
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                  {(['monthly', 'annual'] as SubscriptionCadence[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft((d) => ({ ...d, cadence: c }))}
                      className={`rounded-md px-2.5 py-1 text-sm capitalize transition-colors ${
                        draft.cadence === c
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={makeSubscription}
                  title="Move this group into the Subscriptions category"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
                >
                  <span aria-hidden>💳</span> Make subscription
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Charge date applies to any recurring payment, not just subscriptions. */}
              {draft.cadence === 'annual' ? (
                <Field label="Next renewal">
                  <input
                    type="date"
                    value={draft.renewalDate ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, renewalDate: e.target.value || undefined }))
                    }
                    className={inputCls}
                  />
                </Field>
              ) : (
                <Field label="Charged on day">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={draft.billingDay ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        billingDay: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 6"
                    className={inputCls}
                  />
                </Field>
              )}
              {isSubscription && (
                <Field label="Ended (if cancelled)">
                  <input
                    type="date"
                    value={draft.endedDate ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, endedDate: e.target.value || undefined }))
                    }
                    className={inputCls}
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">
                    <SortHeader sortKey="date" label="Date" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <SortHeader sortKey="category" label="Category" sortable={mixedCategories} current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortHeader sortKey="amount" label="Amount" align="right" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <SortHeader sortKey="description" label="Description" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-500 dark:text-slate-400">
                      {formatDate(t.date)}
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
                      className={`whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums ${
                        t.amount < 0 ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleRecurring(t.id)}
                          title={t.recurring ? 'Unflag recurring' : 'Mark as recurring'}
                          className={`shrink-0 rounded p-0.5 transition-colors ${
                            t.recurring
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
                          }`}
                        >
                          <StarIcon className="h-4 w-4" filled={!!t.recurring} />
                        </button>
                        <span aria-hidden>{categoryMeta(t.category).emoji}</span>
                        <EditableDescription t={t} aliases={aliases} onRename={rename} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save / cancel */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 p-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!dirty}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
      {node}
      {renameNode}
      {recurringNode}
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
