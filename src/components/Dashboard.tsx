import { useMemo, useState } from 'react'
import { useStore } from '../store'
import {
  excludedSummary,
  filterByRange,
  headlineStats,
  monthlyTrend,
  spendingByCategory,
  topExpenses,
  type TimeRange,
} from '../lib/analysis'
import type { Category } from '../types'
import { CATEGORY_META, categoryLabel } from '../types'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import { CategoryDonut } from './charts/CategoryDonut'
import { MonthlyTrend } from './charts/MonthlyTrend'
import { CategoryDetailModal } from './CategoryDetailModal'
import { StatCard } from './StatCard'
import { EmptyState } from './EmptyState'
import { ChartIcon } from './icons'
import type { View } from './Nav'

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' },
]

type SortKey = 'category' | 'total'

interface Props {
  onNavigate: (v: View) => void
}

export function Dashboard({ onNavigate }: Props) {
  const { transactions, hasData, loadSample } = useStore()
  const [range, setRange] = useState<TimeRange>('all')
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortAsc, setSortAsc] = useState(false)
  const [drill, setDrill] = useState<Category | null>(null)

  const filtered = useMemo(
    () => filterByRange(transactions, range),
    [transactions, range],
  )
  const stats = useMemo(() => headlineStats(filtered), [filtered])
  const cats = useMemo(() => spendingByCategory(filtered), [filtered])
  const top5 = useMemo(() => topExpenses(filtered, 5), [filtered])
  const excluded = useMemo(() => excludedSummary(filtered), [filtered])
  const trend = useMemo(() => monthlyTrend(transactions), [transactions])

  const sortedCats = useMemo(() => {
    const arr = cats.slice()
    arr.sort((a, b) => {
      const cmp =
        sortKey === 'total'
          ? a.total - b.total
          : categoryLabel(a.category).localeCompare(categoryLabel(b.category))
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [cats, sortKey, sortAsc])

  if (!hasData) {
    return (
      <ViewShell title="Dashboard">
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={<ChartIcon className="w-7 h-7" />}
            title="No data to analyze yet"
            message="Import a CSV of your transactions or load the sample dataset to see your spending broken down."
          >
            <button
              onClick={loadSample}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Load sample data
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Go to Import
            </button>
          </EmptyState>
        </div>
      </ViewShell>
    )
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key === 'category')
    }
  }

  const netAccent = stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
  const isRangeEmpty = filtered.length === 0

  return (
    <ViewShell
      title="Dashboard"
      action={
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {isRangeEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No transactions in this time range. Try a different range.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Income"
              value={formatCurrency(stats.totalIncome)}
              accent="text-emerald-600"
            />
            <StatCard
              label="Spending"
              value={formatCurrency(stats.totalSpending)}
              accent="text-rose-600"
            />
            <StatCard
              label="Net"
              value={formatCurrency(stats.net)}
              accent={netAccent}
              sub={stats.net >= 0 ? 'You came out ahead' : 'You spent more than you earned'}
            />
          </div>

          {/* Headline stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Biggest category"
              value={stats.biggestCategory ? categoryLabel(stats.biggestCategory.category) : '—'}
              sub={
                stats.biggestCategory
                  ? formatCurrency(stats.biggestCategory.total)
                  : undefined
              }
            />
            <StatCard
              label="Largest expense"
              value={stats.largestExpense ? formatCurrency(stats.largestExpense.amount) : '—'}
              sub={stats.largestExpense?.description}
            />
            <StatCard
              label="Avg / day"
              value={formatCurrency(stats.avgDailySpend)}
            />
            <StatCard label="Transactions" value={String(stats.count)} />
          </div>

          {/* Category breakdown + trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-800">Spending by category</h3>
              {cats.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No spending in this range.</p>
              ) : (
                <>
                  <CategoryDonut data={cats} total={stats.totalSpending} onSelect={setDrill} />
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-3 py-2">
                            <button
                              onClick={() => toggleSort('category')}
                              className="font-medium hover:text-slate-600"
                            >
                              Category{sortIndicator('category', sortKey, sortAsc)}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right">
                            <button
                              onClick={() => toggleSort('total')}
                              className="font-medium hover:text-slate-600"
                            >
                              Amount{sortIndicator('total', sortKey, sortAsc)}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedCats.map((c) => {
                          const pct =
                            stats.totalSpending > 0
                              ? (c.total / stats.totalSpending) * 100
                              : 0
                          return (
                            <tr
                              key={c.category}
                              onClick={() => setDrill(c.category)}
                              className="cursor-pointer hover:bg-slate-50"
                            >
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-sm"
                                    style={{ background: CATEGORY_META[c.category].color }}
                                  />
                                  <span className="font-medium text-slate-700 underline-offset-2 hover:underline">
                                    {categoryLabel(c.category)}
                                  </span>
                                  <span className="text-slate-400">· {c.count}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700">
                                {formatCurrency(c.total)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                                {formatPercent(pct)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Monthly trend</h3>
                  <span className="text-xs text-slate-400">All time</span>
                </div>
                <div className="mt-2">
                  <MonthlyTrend data={trend} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-800">Top 5 expenses</h3>
                <ul className="mt-3 divide-y divide-slate-100">
                  {top5.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        {i + 1}
                      </span>
                      <span aria-hidden>{CATEGORY_META[e.category].emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-700">
                          {e.description}
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(e.date)}</div>
                      </div>
                      <div className="tabular-nums text-sm font-semibold text-slate-800">
                        {formatCurrency(e.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {excluded.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-800">Transfers &amp; Zelle</h3>
                <span className="text-xs text-slate-400">Not counted as spending or income</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Money moved between your own accounts (or paying off a card) is tracked here so it
                doesn&apos;t distort your spending. Click one to review or recategorize.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {excluded.map((e) => (
                  <button
                    key={e.category}
                    onClick={() => setDrill(e.category)}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{ background: `${CATEGORY_META[e.category].color}1a` }}
                      aria-hidden
                    >
                      {CATEGORY_META[e.category].emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700">
                        {categoryLabel(e.category)}
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          · {e.count}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {formatCurrency(e.out)} out
                        {e.in > 0 && ` · ${formatCurrency(e.in)} in`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {drill && (
        <CategoryDetailModal category={drill} range={range} onClose={() => setDrill(null)} />
      )}
    </ViewShell>
  )
}

function sortIndicator(key: SortKey, active: SortKey, asc: boolean): string {
  if (key !== active) return ''
  return asc ? ' ↑' : ' ↓'
}

function ViewShell({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
