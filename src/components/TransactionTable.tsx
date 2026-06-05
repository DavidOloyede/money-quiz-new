import { useMemo, useState } from 'react'
import type { Category, Transaction } from '../types'
import { CATEGORIES, CATEGORY_META, categoryLabel } from '../types'
import { formatCurrency, formatDate } from '../lib/format'

interface Props {
  transactions: Transaction[]
  onSetCategory: (id: string, category: Category) => void
}

type SortKey = 'date' | 'amount'

export function TransactionTable({ transactions, onSetCategory }: Props) {
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = transactions.filter((t) => {
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (q && !t.description.toLowerCase().includes(q)) return false
      return true
    })
    rows.sort((a, b) => {
      const cmp =
        sortKey === 'date'
          ? a.date.localeCompare(b.date)
          : a.amount - b.amount
      return sortAsc ? cmp : -cmp
    })
    return rows
  }, [transactions, query, catFilter, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <h3 className="font-semibold text-slate-800">Your transactions</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {filtered.length} of {transactions.length}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description…"
            className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as Category | 'all')}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5">
                <button onClick={() => toggleSort('date')} className="font-medium hover:text-slate-600">
                  Date{sortKey === 'date' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 text-right">
                <button onClick={() => toggleSort('amount')} className="font-medium hover:text-slate-600">
                  Amount{sortKey === 'amount' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  <span className="flex items-center gap-2">
                    {t.description}
                    {t.overridden && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        edited
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{CATEGORY_META[t.category].emoji}</span>
                    <select
                      value={t.category}
                      onChange={(e) => onSetCategory(t.id, e.target.value as Category)}
                      className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      aria-label={`Category for ${t.description}`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {categoryLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium ${
                    t.amount < 0 ? 'text-slate-700' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
