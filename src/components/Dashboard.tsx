import { useMemo, useState } from 'react'
import { useStore } from '../store'
import {
  currentMonthKey,
  excludedSummary,
  filterByDateRange,
  filterByRange,
  headlineStats,
  monthlyTrend,
  prevMonthKey,
  rangeLabel,
  recurringPayments,
  spendingByCategory,
  topExpenses,
  type TimeRange,
} from '../lib/analysis'
import { categoryLabel, categoryMeta } from '../lib/categories'
import { formatCurrency, formatDate, formatMonth, formatPercent } from '../lib/format'
import { CategoryDonut } from './charts/CategoryDonut'
import { MonthlyTrend } from './charts/MonthlyTrend'
import { CategoryDetailModal, type DetailTarget } from './CategoryDetailModal'
import { BudgetsCard } from './BudgetsCard'
import { GivingCard } from './GivingCard'
import { DebtCard } from './DebtCard'
import { VerseOfDay } from './VerseOfDay'
import { RecurringCard } from './RecurringCard'
import { SpendingHabitsCard } from './SpendingHabitsCard'
import { RecurringTransfersCard } from './RecurringTransfersCard'
import { GroupDetailModal } from './GroupDetailModal'
import { TrendsCard } from './TrendsCard'
import { TopMerchantsCard } from './TopMerchantsCard'
import { SortHeader } from './SortHeader'
import { StatCard } from './StatCard'
import { EmptyState } from './EmptyState'
import { ChartIcon } from './icons'
import type { View } from './Nav'

type RangeId = TimeRange | 'custom'

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear', label: 'This year' },
  { id: 'custom', label: 'Custom' },
]

type SortKey = 'category' | 'total'

interface Props {
  onNavigate: (v: View) => void
}

export function Dashboard({ onNavigate }: Props) {
  const {
    transactions,
    hasData,
    loadSample,
    budgets,
    setBudget,
    givingGoal,
    setGivingGoal,
    aliases,
    dismissedRecurring,
    recurringKinds,
    paidOffDebts,
    setDebtPaidOff,
  } = useStore()
  const [range, setRange] = useState<RangeId>('thisYear')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortAsc, setSortAsc] = useState(false)
  const [drill, setDrill] = useState<DetailTarget | null>(null)
  const [groupIds, setGroupIds] = useState<string[] | null>(null)

  const filtered = useMemo(
    () =>
      range === 'custom'
        ? filterByDateRange(transactions, customFrom || undefined, customTo || undefined)
        : filterByRange(transactions, range),
    [transactions, range, customFrom, customTo],
  )
  const budgetMonth =
    range === 'lastMonth' ? prevMonthKey() : currentMonthKey()
  const scopeLabel =
    range === 'custom'
      ? customFrom && customTo
        ? `${formatDate(customFrom)} – ${formatDate(customTo)}`
        : 'custom range'
      : rangeLabel(range)
  const stats = useMemo(() => headlineStats(filtered), [filtered])
  const cats = useMemo(() => spendingByCategory(filtered), [filtered])
  const top5 = useMemo(() => topExpenses(filtered, 5), [filtered])
  const excluded = useMemo(() => excludedSummary(filtered), [filtered])
  // One grouping pass shared by the Recurring & subscriptions and Spending
  // habits cards (each takes its kind from the same result).
  const recurring = useMemo(
    () => recurringPayments(transactions, aliases, dismissedRecurring, recurringKinds),
    [transactions, aliases, dismissedRecurring, recurringKinds],
  )
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
        <div className="mb-4">
          <VerseOfDay />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  range === r.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                aria-label="From date"
              />
              <span>–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                aria-label="To date"
              />
            </div>
          )}
        </div>
      }
    >
      {isRangeEmpty ? (
        <div className="space-y-4">
          <VerseOfDay />
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No transactions in this time range. Try a different range.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <VerseOfDay />

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Income"
              value={formatCurrency(stats.totalIncome)}
              accent="text-emerald-600"
              sub={
                stats.totalRefunds > 0
                  ? `+ ${formatCurrency(stats.totalRefunds)} refunds, counted against spending`
                  : undefined
              }
              onClick={() => setDrill({ flow: 'income' })}
            />
            <StatCard
              label="Spending"
              value={formatCurrency(stats.totalSpending)}
              accent="text-rose-600"
              sub={`${formatCurrency(stats.avgDailySpend)} / day average`}
              onClick={() => setDrill({ flow: 'spending' })}
            />
            <StatCard
              label="Net"
              value={formatCurrency(stats.net)}
              accent={netAccent}
              sub={stats.net >= 0 ? 'You came out ahead' : 'You spent more than you earned'}
            />
          </div>

          {/* Headline stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <StatCard label="Transactions" value={String(stats.count)} />
          </div>

          {/* Category breakdown + trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Spending by category</h3>
              {cats.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No spending in this range.</p>
              ) : (
                <>
                  <CategoryDonut data={cats} total={stats.totalSpending} onSelect={setDrill} />
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          <th className="px-3 py-2">
                            <SortHeader sortKey="category" label="Category" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                          </th>
                          <th className="px-3 py-2 text-right">
                            <SortHeader sortKey="total" label="Amount" align="right" current={sortKey} asc={sortAsc} onToggle={toggleSort} />
                          </th>
                          <th className="px-3 py-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedCats.map((c) => {
                          const pct =
                            stats.totalSpending > 0
                              ? (c.total / stats.totalSpending) * 100
                              : 0
                          return (
                            <tr
                              key={c.category}
                              onClick={() => setDrill(c.category)}
                              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-sm"
                                    style={{ background: categoryMeta(c.category).color }}
                                  />
                                  <span className="font-medium text-slate-700 dark:text-slate-200 underline-offset-2 hover:underline">
                                    {categoryLabel(c.category)}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500">· {c.count}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                                {formatCurrency(c.total)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
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
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Monthly trend</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    All time · click a month for its transactions
                  </span>
                </div>
                <div className="mt-2">
                  <MonthlyTrend data={trend} onSelectMonth={(m) => setDrill({ month: m })} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Top 5 expenses</h3>
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {top5.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <span aria-hidden>{categoryMeta(e.category).emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {e.description}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{formatDate(e.date)}</div>
                      </div>
                      <div className="tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(e.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Giving, budgets, recurring, debt, trends, top merchants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GivingCard
              filtered={filtered}
              scopeLabel={scopeLabel}
              transactions={transactions}
              monthKey={budgetMonth}
              givingGoal={givingGoal}
              onSetGoal={setGivingGoal}
            />
            <BudgetsCard
              transactions={transactions}
              monthKey={budgetMonth}
              budgets={budgets}
              onSetBudget={setBudget}
            />
            <TopMerchantsCard transactions={filtered} />
            <RecurringCard items={recurring.filter((r) => r.kind === 'bill')} onOpenGroup={setGroupIds} />
            <SpendingHabitsCard items={recurring.filter((r) => r.kind === 'habit')} onOpenGroup={setGroupIds} />
            <DebtCard
              transactions={transactions}
              aliases={aliases}
              dismissedRecurring={dismissedRecurring}
              paidOffDebts={paidOffDebts}
              onSetPaidOff={setDebtPaidOff}
              onOpenGroup={setGroupIds}
            />
            <RecurringTransfersCard transactions={transactions} onOpenGroup={setGroupIds} />
            <TrendsCard transactions={transactions} />
          </div>

          {excluded.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Transfers &amp; Zelle</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">Not counted as spending or income</span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Money moved between your own accounts (or paying off a card) is tracked here so it
                doesn&apos;t distort your spending. Click one to review or recategorize.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {excluded.map((e) => (
                  <button
                    key={e.category}
                    onClick={() => setDrill(e.category)}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{ background: `${categoryMeta(e.category).color}1a` }}
                      aria-hidden
                    >
                      {categoryMeta(e.category).emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {categoryLabel(e.category)}
                        <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                          · {e.count}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
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
        <CategoryDetailModal
          category={drill}
          // A month drill comes from the all-time trend chart, so it isn't
          // limited to the dashboard's selected range.
          transactions={typeof drill === 'object' && 'month' in drill ? transactions : filtered}
          scopeLabel={
            typeof drill === 'object' && 'month' in drill
              ? `in ${formatMonth(drill.month)}`
              : scopeLabel
          }
          onClose={() => setDrill(null)}
        />
      )}

      {groupIds && <GroupDetailModal ids={groupIds} onClose={() => setGroupIds(null)} />}
    </ViewShell>
  )
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
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
