import { useEffect, useMemo, useRef, useState } from 'react'
import type { Category, ImportSource, Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { filterTransactions, type TransactionCriteria } from '@moneyquiz/core/lib/filter'
import { allCategories, categoryMeta } from '@moneyquiz/core/lib/categories'
import { displayDescription } from '@moneyquiz/core/lib/merchant'
import { brandSlugForAny } from '@moneyquiz/core/lib/merchantLogos'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { useRecurringSimilar } from './RecurringSimilar'
import { SortHeader } from './SortHeader'
import { StarIcon, LinkIcon } from './icons'
import { MerchantLogo } from './MerchantLogo'
import { TransactionMarks, useTransactionActions } from './TransactionActions'
import { useWheelPan } from '../hooks/useWheelPan'
import { useSelection } from '../hooks/useSelection'
import { TransactionFilters } from './TransactionFilters'
import { BulkActionBar } from './BulkActionBar'

interface Props {
  transactions: Transaction[]
  /** Import sources, so rows can be filtered and labelled by where they came from. */
  sources?: ImportSource[]
  /** Pre-select a source (set when someone clicks one in the Imported sources list). */
  focusSourceId?: string | null
}

type SortKey = 'date' | 'amount'

export function TransactionTable({ transactions, sources = [], focusSourceId }: Props) {
  const { aliases } = useStore()
  const { change, node } = useApplyToSimilar()
  const { toggle: toggleRecurring, node: recurringNode } = useRecurringSimilar()
  const { open: openActions, node: actionsNode } = useTransactionActions()
  const [criteria, setCriteria] = useState<TransactionCriteria>({})
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  useWheelPan(scrollRef)

  // Clicking a source in the Imported sources list scrolls here and narrows to it.
  useEffect(() => {
    if (focusSourceId) {
      setCriteria((c) => ({ ...c, sources: [focusSourceId] }))
      scrollRef.current?.closest('[data-transaction-table]')?.scrollIntoView({ block: 'start' })
    }
  }, [focusSourceId])

  const filtered = useMemo(() => {
    const rows = filterTransactions(transactions, criteria).slice()
    rows.sort((a, b) => {
      const cmp = sortKey === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount
      return sortAsc ? cmp : -cmp
    })
    return rows
  }, [transactions, criteria, sortKey, sortAsc])

  const visibleIds = useMemo(() => filtered.map((t) => t.id), [filtered])
  const selection = useSelection(visibleIds)
  const sourceName = (id?: string) => sources.find((s) => s.id === id)?.fileName ?? ''

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  return (
    <div
      data-transaction-table
      className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-linen-100 dark:border-linen-800 p-4">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Your transactions</h3>
        <span className="rounded-full bg-linen-100 dark:bg-linen-800 px-2 py-0.5 text-xs font-medium text-linen-500 dark:text-linen-400">
          {filtered.length} of {transactions.length}
        </span>
        <div className="ml-auto">
          <TransactionFilters
            value={criteria}
            onChange={setCriteria}
            sources={sources}
            showRecurring
          />
        </div>
      </div>

      <BulkActionBar ids={selection.ids} onDone={selection.clear} />

      <div ref={scrollRef} className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-linen-50 dark:bg-linen-800/50 text-left text-xs uppercase tracking-wide text-linen-400 dark:text-linen-500">
            <tr>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selection.allVisibleSelected}
                  onChange={selection.toggleAllVisible}
                  className="h-4 w-4 rounded border-linen-300 text-forest-600 focus:ring-forest-500"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-2.5">
                <SortHeader sortKey="date" label="Date" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
              </th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              {sources.length > 1 && <th className="px-4 py-2.5 font-medium">Source</th>}
              <th className="px-4 py-2.5 text-right">
                <SortHeader sortKey="amount" label="Amount" align="right" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
              </th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-100 dark:divide-linen-800">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-linen-50/60 dark:hover:bg-linen-800/40">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selection.has(t.id)}
                    onChange={() => selection.toggleOne(t.id)}
                    className="h-4 w-4 rounded border-linen-300 text-forest-600 focus:ring-forest-500"
                    aria-label={`Select ${t.description}`}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-linen-500 dark:text-linen-400">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-2.5 text-linen-700 dark:text-linen-200">
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRecurring(t.id)}
                      title={t.recurring ? 'Unflag recurring' : 'Flag as recurring'}
                      aria-pressed={!!t.recurring}
                      className={`shrink-0 rounded p-0.5 transition-colors ${
                        t.recurring
                          ? 'text-honey-500 hover:text-honey-600'
                          : 'text-linen-300 hover:text-honey-400 dark:text-linen-600'
                      }`}
                    >
                      <StarIcon className="h-4 w-4" filled={!!t.recurring} />
                    </button>
                    <MerchantLogo
                      brand={brandSlugForAny(displayDescription(t.description, aliases), t.description)}
                      logoUrl={t.logoUrl}
                      size="sm"
                      keepSpace
                    />
                    {displayDescription(t.description, aliases)}
                    {t.recurring && (
                      <span className="rounded bg-honey-100 dark:bg-honey-500/20 px-1.5 py-0.5 text-[10px] font-medium text-honey-700 dark:text-honey-300">
                        recurring
                      </span>
                    )}
                    {t.overridden && (
                      <span className="rounded bg-linen-100 dark:bg-linen-700/40 px-1.5 py-0.5 text-[10px] font-medium text-linen-500 dark:text-linen-300">
                        edited
                      </span>
                    )}
                    {t.renamed && (
                      <span className="rounded bg-linen-100 dark:bg-linen-700/40 px-1.5 py-0.5 text-[10px] font-medium text-linen-500 dark:text-linen-300">
                        renamed
                      </span>
                    )}
                    <TransactionMarks t={t} />
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{categoryMeta(t.category).emoji}</span>
                    <select
                      value={t.category}
                      onChange={(e) => change(t.id, e.target.value as Category)}
                      className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm text-linen-700 dark:text-linen-200 hover:border-linen-300 dark:hover:border-linen-600 focus:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none focus:ring-1 focus:ring-forest-500"
                      aria-label={`Category for ${t.description}`}
                    >
                      {allCategories().map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                {sources.length > 1 && (
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="rounded-full bg-linen-100 dark:bg-linen-800 px-2 py-0.5 text-[11px] font-medium text-linen-500 dark:text-linen-400">
                      {sourceName(t.sourceId)}
                    </span>
                  </td>
                )}
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium ${
                    t.amount < 0 ? 'text-linen-700 dark:text-linen-200' : 'text-forest-600'
                  }`}
                >
                  {formatCurrency(t.amount)}
                </td>
                <td className="px-2 py-2.5">
                  <button
                    onClick={() => openActions(t.id)}
                    title="How this counts, and what it offsets"
                    aria-label={`Actions for ${t.description}`}
                    className="rounded p-1 text-linen-300 hover:bg-linen-100 hover:text-linen-600 dark:text-linen-600 dark:hover:bg-linen-800 dark:hover:text-linen-300"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={sources.length > 1 ? 7 : 6} className="px-4 py-10 text-center text-sm text-linen-400 dark:text-linen-500">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {node}
      {recurringNode}
      {actionsNode}
    </div>
  )
}
