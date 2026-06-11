import { useMemo, useState } from 'react'
import type { Category, Transaction } from '../types'
import { useStore } from '../store'
import { allCategories, categoryLabel, categoryMeta, isExcludedCategory } from '../lib/categories'
import {
  countsTowardTotals,
  isCountedExpense,
  isRealIncome,
  isRefund,
  monthKey,
  totalIncome,
  totalSpending,
} from '../lib/analysis'
import { displayDescription } from '../lib/merchant'
import { formatCurrency, formatDate, formatMonth } from '../lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { useRenameSimilar, EditableDescription } from './RenameDescription'
import { useRecurringSimilar } from './RecurringSimilar'
import { StarIcon, XIcon } from './icons'

/**
 * One Year Sheet cell: a category's actuals for one month, split by direction
 * the way the sheet splits them (income rows vs expense rows). The synthesized
 * 'refunds' row drills into refunds/cashback across all spending categories.
 */
export interface CellTarget {
  category: Category | 'refunds'
  month: string
  direction: 'in' | 'out'
}

/** What the modal drills into: one category, everything counted as income/spending, a whole month, or one Year Sheet cell. */
export type DetailTarget = Category | { flow: 'income' | 'spending' } | { month: string } | CellTarget

type SortKey = 'date' | 'category' | 'amount' | 'description'

interface Props {
  category: DetailTarget
  /** transactions already scoped to the dashboard's selected range (a month drill passes all of them) */
  transactions: Transaction[]
  scopeLabel: string
  onClose: () => void
}

export function CategoryDetailModal({ category, transactions, scopeLabel, onClose }: Props) {
  const { aliases } = useStore()
  const { change, node } = useApplyToSimilar()
  const { rename, node: renameNode } = useRenameSimilar()
  const { toggle: toggleRecurring, node: recurringNode } = useRecurringSimilar()
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortAsc, setSortAsc] = useState(false)

  const cell = typeof category === 'object' && 'category' in category ? category : null
  const flow = !cell && typeof category === 'object' && 'flow' in category ? category.flow : null
  const month =
    !cell && typeof category === 'object' && 'month' in category ? category.month : null
  // The income drill shows real income only; refunds/cashback appear in the
  // spending drill as credits, since they net against spending. A month drill
  // shows both sides of that month at once. A Year Sheet cell shows exactly
  // what the cell summed: that category's counted amounts in one direction for
  // one month (the refunds row sums refunds across all spending categories).
  const items = useMemo(
    () =>
      transactions.filter((t) =>
        cell
          ? monthKey(t.date) === cell.month &&
            countsTowardTotals(t) &&
            (cell.category === 'refunds'
              ? isRefund(t)
              : t.category === cell.category &&
                (cell.direction === 'in' ? t.amount > 0 : t.amount < 0))
          : month
            ? monthKey(t.date) === month &&
              (isRealIncome(t) || isCountedExpense(t) || isRefund(t))
            : flow
              ? flow === 'income'
                ? isRealIncome(t)
                : isCountedExpense(t) || isRefund(t)
              : t.category === category,
      ),
    [transactions, category, cell, flow, month],
  )

  // Category is only worth sorting by when the list actually mixes categories.
  const mixed = useMemo(() => new Set(items.map((t) => t.category)).size > 1, [items])

  const sorted = useMemo(() => {
    const arr = items.slice()
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
          cmp = categoryLabel(a.category).localeCompare(categoryLabel(b.category))
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [items, sortKey, sortAsc, aliases])

  // First click: date earliest→latest, text A→Z, amount biggest first.
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key !== 'amount')
    }
  }

  const sortButton = (key: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(key)}
      className="font-medium hover:text-slate-600 dark:hover:text-slate-300"
    >
      {label}
      {sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </button>
  )

  const total = items.reduce(
    (s, t) => s + (flow === 'spending' ? -t.amount : Math.abs(t.amount)),
    0,
  )
  const header = cell
    ? {
        emoji: cell.category === 'refunds' ? '↩️' : categoryMeta(cell.category).emoji,
        color: cell.category === 'refunds' ? '#10b981' : categoryMeta(cell.category).color,
        title: cell.category === 'refunds' ? 'Refunds & Cashback' : categoryLabel(cell.category),
        note: ` · ${formatCurrency(items.reduce((s, t) => s + Math.abs(t.amount), 0))} ${
          cell.direction === 'in' ? 'in' : 'out'
        }`,
      }
    : month
    ? {
        emoji: '📅',
        color: '#0ea5e9',
        title: formatMonth(month),
        note: ` · ${formatCurrency(totalIncome(items))} in · ${formatCurrency(
          totalSpending(items),
        )} out · transfers & Zelle not included`,
      }
    : flow
      ? {
          emoji: flow === 'income' ? '💰' : '🧾',
          color: flow === 'income' ? '#10b981' : '#f43f5e',
          title: flow === 'income' ? 'Income' : 'Spending',
          note: ` · ${formatCurrency(total)} ${flow === 'income' ? 'in' : 'out'} · ${
            flow === 'income' ? 'refunds & ' : 'refunds credited; '
          }transfers & Zelle not included`,
        }
      : {
          emoji: categoryMeta(category as Category).emoji,
          color: categoryMeta(category as Category).color,
          title: categoryLabel(category as Category),
          note:
            (total > 0 && items.some((t) => t.amount < 0)
              ? ` · ${formatCurrency(items.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0))} out`
              : '') + (isExcludedCategory(category as Category) ? ' · not counted as spending' : ''),
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
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ background: `${header.color}1a` }}
              aria-hidden
            >
              {header.emoji}
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{header.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items.length} transaction{items.length === 1 ? '' : 's'} {scopeLabel}
                {header.note}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-600"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">{sortButton('date', 'Date')}</th>
                <th className="px-3 py-2.5 font-medium">
                  {mixed ? sortButton('category', 'Category') : 'Category'}
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  {sortButton('amount', 'Amount')}
                </th>
                <th className="px-5 py-2.5 font-medium">
                  {sortButton('description', 'Description')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((t) => (
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
                        aria-pressed={!!t.recurring}
                        className={`shrink-0 rounded p-0.5 transition-colors ${
                          t.recurring
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
                        }`}
                      >
                        <StarIcon className="h-4 w-4" filled={!!t.recurring} />
                      </button>
                      <EditableDescription t={t} aliases={aliases} onRename={rename} />
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    Nothing left in this category — you moved it all somewhere else.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 p-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Tip: change a transaction&apos;s category above and it&apos;s remembered for future
          imports of the same merchant.
        </div>
      </div>
    </div>
    {node}
    {renameNode}
    {recurringNode}
    </>
  )
}
