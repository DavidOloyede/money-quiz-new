import { useMemo } from 'react'
import type { Category, Transaction } from '../types'
import { useStore } from '../store'
import { allCategories, categoryLabel, categoryMeta, isExcludedCategory } from '../lib/categories'
import { formatCurrency, formatDate } from '../lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { useRenameSimilar, EditableDescription } from './RenameDescription'
import { StarIcon, XIcon } from './icons'

interface Props {
  category: Category
  /** transactions already scoped to the dashboard's selected range */
  transactions: Transaction[]
  scopeLabel: string
  onClose: () => void
}

export function CategoryDetailModal({ category, transactions, scopeLabel, onClose }: Props) {
  const { aliases, toggleRecurring } = useStore()
  const { change, node } = useApplyToSimilar()
  const { rename, node: renameNode } = useRenameSimilar()

  const items = useMemo(
    () =>
      transactions
        .filter((t) => t.category === category)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [transactions, category],
  )

  const meta = categoryMeta(category)
  const out = items.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0)

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
              style={{ background: `${meta.color}1a` }}
              aria-hidden
            >
              {meta.emoji}
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{categoryLabel(category)}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items.length} transaction{items.length === 1 ? '' : 's'} {scopeLabel}
                {out > 0 && ` · ${formatCurrency(out)} out`}
                {isExcludedCategory(category) && ' · not counted as spending'}
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
    </>
  )
}
