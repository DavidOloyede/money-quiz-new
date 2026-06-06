import { useState } from 'react'
import type { Budgets, Category, Transaction } from '../types'
import { budgetStatus } from '../lib/analysis'
import { allCategories, categoryMeta } from '../lib/categories'
import { formatCurrency, formatMonth } from '../lib/format'

interface Props {
  transactions: Transaction[]
  monthKey: string
  budgets: Budgets
  onSetBudget: (category: Category, amount: number) => void
}

export function BudgetsCard({ transactions, monthKey, budgets, onSetBudget }: Props) {
  const status = budgetStatus(transactions, budgets, monthKey)
  const unbudgeted = allCategories().filter(
    (d) => d.kind === 'spending' && !(budgets[d.id] > 0),
  )
  const [addCat, setAddCat] = useState('')
  const [addAmt, setAddAmt] = useState('')

  const add = () => {
    const amt = parseFloat(addAmt)
    if (addCat && Number.isFinite(amt) && amt > 0) {
      onSetBudget(addCat, amt)
      setAddCat('')
      setAddAmt('')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Budgets</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{formatMonth(monthKey)}</span>
      </div>

      {status.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Set a monthly budget for a category to track it here.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {status.map((s) => {
            const pct = Math.min(100, s.pct)
            return (
              <li key={s.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <span aria-hidden>{categoryMeta(s.category).emoji}</span>
                    {categoryMeta(s.category).label}
                  </span>
                  <span className={`tabular-nums ${s.over ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {formatCurrency(s.spent)} / {formatCurrency(s.budget)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${s.over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {s.over && (
                  <div className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
                    {formatCurrency(s.spent - s.budget)} over budget
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Add a budget…</option>
            {unbudgeted.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={addAmt}
            onChange={(e) => setAddAmt(e.target.value)}
            placeholder="$ / month"
            className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          />
          <button
            onClick={add}
            disabled={!addCat || !(parseFloat(addAmt) > 0)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
