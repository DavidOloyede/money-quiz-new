import { useMemo, useState } from 'react'
import type { Category, Transaction } from '../types'
import { useStore } from '../store'
import { allCategories, categoryMeta } from '../lib/categories'
import { displayDescription } from '../lib/merchant'
import { formatCurrency, formatDate } from '../lib/format'
import { useApplyToSimilar } from './ApplyToSimilar'
import { useRecurringSimilar } from './RecurringSimilar'
import { SortHeader } from './SortHeader'
import { StarIcon } from './icons'

interface Props {
  transactions: Transaction[]
}

type SortKey = 'date' | 'amount'

export function TransactionTable({ transactions }: Props) {
  const { setCategoryBulk, aliases } = useStore()
  const { change, node } = useApplyToSimilar()
  const { toggle: toggleRecurring, node: recurringNode } = useRecurringSimilar()
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [minAmount, setMinAmount] = useState('')
  const [recurringOnly, setRecurringOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCat, setBulkCat] = useState<Category | ''>('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const min = parseFloat(minAmount)
    const rows = transactions.filter((t) => {
      if (recurringOnly && !t.recurring) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (q && !t.description.toLowerCase().includes(q)) return false
      if (Number.isFinite(min) && Math.abs(t.amount) < min) return false
      return true
    })
    rows.sort((a, b) => {
      const cmp = sortKey === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount
      return sortAsc ? cmp : -cmp
    })
    return rows
  }, [transactions, query, catFilter, minAmount, recurringOnly, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id))
  const toggleAll = () => {
    setSelected((prev) => {
      if (filtered.every((t) => prev.has(t.id))) {
        const next = new Set(prev)
        filtered.forEach((t) => next.delete(t.id))
        return next
      }
      return new Set([...prev, ...filtered.map((t) => t.id)])
    })
  }
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const applyBulk = (category: Category) => {
    setCategoryBulk([...selected], category)
    setSelected(new Set())
    setBulkCat('')
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Your transactions</h3>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {filtered.length} of {transactions.length}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description…"
            className="w-40 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min $"
            className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as Category | 'all')}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All categories</option>
            {allCategories().map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setRecurringOnly((v) => !v)}
            aria-pressed={recurringOnly}
            title="Show only recurring payments"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
              recurringOnly
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <StarIcon className="h-4 w-4" filled={recurringOnly} /> Recurring
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 text-sm">
          <span className="font-medium text-emerald-800 dark:text-emerald-300">
            {selected.size} selected
          </span>
          <select
            value={bulkCat}
            onChange={(e) => {
              const v = e.target.value as Category
              if (v) applyBulk(v)
            }}
            className="rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Set category to…</option>
            {allCategories().map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSelected(new Set())}
            className="text-emerald-700 dark:text-emerald-300 underline-offset-2 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <tr>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-2.5">
                <SortHeader sortKey="date" label="Date" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
              </th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 text-right">
                <SortHeader sortKey="amount" label="Amount" align="right" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleOne(t.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    aria-label={`Select ${t.description}`}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRecurring(t.id)}
                      title={t.recurring ? 'Unflag recurring' : 'Flag as recurring'}
                      aria-pressed={!!t.recurring}
                      className={`shrink-0 rounded p-0.5 transition-colors ${
                        t.recurring
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
                      }`}
                    >
                      <StarIcon className="h-4 w-4" filled={!!t.recurring} />
                    </button>
                    {displayDescription(t.description, aliases)}
                    {t.recurring && (
                      <span className="rounded bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        recurring
                      </span>
                    )}
                    {t.overridden && (
                      <span className="rounded bg-slate-100 dark:bg-slate-700/40 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-300">
                        edited
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{categoryMeta(t.category).emoji}</span>
                    <select
                      value={t.category}
                      onChange={(e) => change(t.id, e.target.value as Category)}
                      className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium ${
                    t.amount < 0 ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {node}
      {recurringNode}
    </div>
  )
}
