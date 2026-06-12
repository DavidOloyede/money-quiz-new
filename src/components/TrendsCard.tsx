import { useMemo } from 'react'
import type { Transaction } from '../types'
import { spendingTrends } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatMonth, formatPercent } from '../lib/format'

interface Props {
  transactions: Transaction[]
}

export function TrendsCard({ transactions }: Props) {
  const trends = useMemo(() => spendingTrends(transactions), [transactions])
  if (trends.length === 0) return null
  const month = trends[0].monthKey

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Trends &amp; anomalies</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {formatMonth(month)} vs prior months
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {trends.slice(0, 5).map((t) => {
          const up = t.delta >= 0
          return (
            <li key={t.category} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  up
                    ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
                aria-hidden
              >
                {up ? '▲' : '▼'}
              </span>
              <span className="flex-1 text-slate-700 dark:text-slate-200">
                <span className="font-medium">
                  {categoryMeta(t.category).emoji} {categoryMeta(t.category).label}
                </span>{' '}
                {up ? 'up' : 'down'} {formatPercent(Math.abs(t.deltaPct))}
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {formatCurrency(t.current)}{' '}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  vs {formatCurrency(t.baseline)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
