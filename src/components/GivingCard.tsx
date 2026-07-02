import { useMemo, useState } from 'react'
import type { Transaction } from '../types'
import {
  givingGoalStatus,
  givingStats,
  monthlyGiving,
  TITHE_BENCHMARK_PCT,
} from '../lib/giving'
import { formatCurrency, formatMonth, formatPercent } from '../lib/format'

interface Props {
  /** Transactions in the Dashboard's selected range (drives the stats). */
  filtered: Transaction[]
  scopeLabel: string
  /** Full history (drives the monthly trend and the goal month). */
  transactions: Transaction[]
  /** "YYYY-MM" the goal progress is measured against. */
  monthKey: string
  /** Giving goal as % of income; 0 = not set. */
  givingGoal: number
  onSetGoal: (pct: number) => void
}

/**
 * Giving & Generosity — tithes + charity for the selected range, measured
 * against income and the traditional 10% tithe benchmark, with an optional
 * %-of-income giving goal tracked month by month.
 */
export function GivingCard({
  filtered,
  scopeLabel,
  transactions,
  monthKey,
  givingGoal,
  onSetGoal,
}: Props) {
  const stats = useMemo(() => givingStats(filtered), [filtered])
  const months = useMemo(() => monthlyGiving(transactions).slice(-6), [transactions])
  const goal = useMemo(
    () => givingGoalStatus(transactions, givingGoal, monthKey),
    [transactions, givingGoal, monthKey],
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const saveGoal = () => {
    const pct = parseFloat(draft)
    onSetGoal(Number.isFinite(pct) && pct > 0 ? pct : 0)
    setEditing(false)
    setDraft('')
  }

  // Where the 10%-of-income benchmark sits on the giving bar. The bar's full
  // width represents the larger of (given, benchmark) so both always fit.
  const pct = stats.pctOfIncome
  const barMax = Math.max(pct ?? 0, TITHE_BENCHMARK_PCT) * 1.15
  const fillPct = pct !== null ? (pct / barMax) * 100 : 0
  const tickPct = (TITHE_BENCHMARK_PCT / barMax) * 100
  const maxMonth = Math.max(1, ...months.map((m) => m.total))

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Giving &amp; Generosity</h3>
        <span className="text-xs text-linen-400 dark:text-linen-500">{scopeLabel}</span>
      </div>

      {stats.total === 0 ? (
        <p className="mt-2 text-sm text-linen-500 dark:text-linen-400">
          No giving recorded in this range yet. Tithes and charity show up here once a gift is
          categorized as 🙏 Tithes &amp; Offerings or 🎁 Charity &amp; Gifts.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[26px] font-semibold text-forest-700 dark:text-forest-400">
              {formatCurrency(stats.total)}
            </span>
            <span className="text-xs text-linen-500 dark:text-linen-400 tabular-nums">
              🙏 {formatCurrency(stats.tithes)} tithes
              {stats.charity > 0 && <> · 🎁 {formatCurrency(stats.charity)} charity</>}
            </span>
          </div>

          {pct !== null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-linen-500 dark:text-linen-400">
                <span>
                  <span className="font-semibold text-linen-700 dark:text-linen-200">
                    {formatPercent(pct, 1)}
                  </span>{' '}
                  of income
                </span>
                <span>tithe benchmark {TITHE_BENCHMARK_PCT}%</span>
              </div>
              <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-linen-100 dark:bg-linen-800">
                <div
                  className={`h-full rounded-full ${
                    pct >= TITHE_BENCHMARK_PCT ? 'bg-forest-500' : 'bg-forest-300 dark:bg-forest-700'
                  }`}
                  style={{ width: `${Math.min(100, fillPct)}%` }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-honey-500"
                  style={{ left: `${tickPct}%` }}
                  title={`${TITHE_BENCHMARK_PCT}% of income`}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly giving goal */}
      <div className="mt-4 border-t border-linen-100 dark:border-linen-800 pt-3">
        {givingGoal > 0 && !editing ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-linen-700 dark:text-linen-200">
                Goal: give {formatPercent(givingGoal, givingGoal % 1 ? 1 : 0)} of income
                <span className="ml-1 text-xs text-linen-400 dark:text-linen-500">
                  · {formatMonth(monthKey)}
                </span>
              </span>
              <button
                onClick={() => {
                  setDraft(String(givingGoal))
                  setEditing(true)
                }}
                className="text-xs font-medium text-forest-600 hover:text-forest-700 dark:text-forest-400"
              >
                Edit
              </button>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-linen-100 dark:bg-linen-800">
              <div
                className={`h-full rounded-full ${goal.met ? 'bg-forest-500' : 'bg-honey-400'}`}
                style={{ width: `${Math.min(100, goal.pct)}%` }}
              />
            </div>
            <div className="mt-0.5 text-xs tabular-nums text-linen-500 dark:text-linen-400">
              {formatCurrency(goal.given)} of {formatCurrency(goal.target)}
              {goal.met && <span className="ml-1 text-forest-600 dark:text-forest-400">— goal met 🎉</span>}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-linen-500 dark:text-linen-400">
              {editing ? 'Giving goal:' : 'Set a monthly giving goal:'}
            </span>
            {editing || givingGoal === 0 ? (
              <>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  placeholder={String(TITHE_BENCHMARK_PCT)}
                  className="w-20 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                />
                <span className="text-sm text-linen-500 dark:text-linen-400">% of income</span>
                <button
                  onClick={saveGoal}
                  className="rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
                >
                  Save
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Monthly trend */}
      {months.length > 1 && (
        <div className="mt-4 border-t border-linen-100 dark:border-linen-800 pt-3">
          <div className="flex items-end gap-2">
            {months.map((m) => (
              <div key={m.monthKey} className="flex-1 text-center">
                <div className="flex h-16 items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t bg-forest-400 dark:bg-forest-600"
                    style={{ height: `${Math.max(m.total > 0 ? 6 : 0, (m.total / maxMonth) * 100)}%` }}
                    title={`${formatCurrency(m.total)}${m.pct !== null ? ` · ${formatPercent(m.pct, 1)} of income` : ''}`}
                  />
                </div>
                <div className="mt-1 text-[10px] text-linen-400 dark:text-linen-500">
                  {formatMonth(m.monthKey).split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 font-display text-[13px] italic text-linen-400 dark:text-linen-500">
        “God loves a cheerful giver.” — 2 Corinthians 9:7
      </p>
    </div>
  )
}
