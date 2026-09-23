import { useState } from 'react'
import type { Budgets, Category, Transaction } from '@moneyquiz/core/types'
import { budgetStatus } from '@moneyquiz/core/lib/analysis'
import { allCategories, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatMonth } from '@moneyquiz/core/lib/format'
import { CheckIcon, PencilIcon, TrashIcon, XIcon } from './icons'

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
  // Which budget is being edited, and the draft amount for it.
  const [editing, setEditing] = useState<Category | null>(null)
  const [editAmt, setEditAmt] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<Category | null>(null)

  const startEdit = (category: Category, current: number) => {
    setConfirmRemove(null)
    setEditing(category)
    setEditAmt(String(current))
  }

  const commitEdit = () => {
    const amt = parseFloat(editAmt)
    // A budget of zero isn't a budget — setBudget treats it as "remove", which
    // is what someone clearing the box means.
    if (editing && Number.isFinite(amt) && amt >= 0) onSetBudget(editing, amt)
    setEditing(null)
  }

  const add = () => {
    const amt = parseFloat(addAmt)
    if (addCat && Number.isFinite(amt) && amt > 0) {
      onSetBudget(addCat, amt)
      setAddCat('')
      setAddAmt('')
    }
  }

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Budgets</h3>
        <span className="text-xs text-linen-400 dark:text-linen-500">{formatMonth(monthKey)}</span>
      </div>

      {status.length === 0 ? (
        <p className="mt-2 text-sm text-linen-500 dark:text-linen-400">
          Set a monthly budget for a category to track it here.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {status.map((s) => {
            const pct = Math.min(100, s.pct)
            return (
              <li key={s.category}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-linen-700 dark:text-linen-200">
                    <span aria-hidden>{categoryMeta(s.category).emoji}</span>
                    <span className="truncate">{categoryMeta(s.category).label}</span>
                  </span>

                  {editing === s.category ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <input
                        type="number"
                        autoFocus
                        value={editAmt}
                        onChange={(e) => setEditAmt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-24 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                        aria-label={`Monthly budget for ${categoryMeta(s.category).label}`}
                      />
                      <button
                        onClick={commitEdit}
                        aria-label="Save budget"
                        className="rounded p-1 text-forest-600 hover:bg-forest-50 dark:hover:bg-forest-500/10"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        aria-label="Cancel"
                        className="rounded p-1 text-linen-400 hover:bg-linen-100 dark:text-linen-500 dark:hover:bg-linen-800"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ) : confirmRemove === s.category ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs">
                      <span className="text-linen-500 dark:text-linen-400">Remove budget?</span>
                      <button
                        onClick={() => {
                          onSetBudget(s.category, 0)
                          setConfirmRemove(null)
                        }}
                        className="rounded-lg bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-700"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="rounded-lg px-1.5 py-1 text-linen-500 underline-offset-2 hover:underline dark:text-linen-400"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1">
                      <span className={`tabular-nums ${s.over ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-linen-500 dark:text-linen-400'}`}>
                        {formatCurrency(s.spent)} / {formatCurrency(s.budget)}
                      </span>
                      <button
                        onClick={() => startEdit(s.category, s.budget)}
                        aria-label={`Edit ${categoryMeta(s.category).label} budget`}
                        className="rounded p-1 text-linen-300 hover:bg-linen-100 hover:text-linen-600 dark:text-linen-600 dark:hover:bg-linen-800 dark:hover:text-linen-300"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(null)
                          setConfirmRemove(s.category)
                        }}
                        aria-label={`Remove ${categoryMeta(s.category).label} budget`}
                        className="rounded p-1 text-linen-300 hover:bg-linen-100 hover:text-rose-600 dark:text-linen-600 dark:hover:bg-linen-800"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-linen-100 dark:bg-linen-800">
                  <div
                    className={`h-full rounded-full ${s.over ? 'bg-rose-500' : 'bg-forest-500'}`}
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
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linen-100 dark:border-linen-800 pt-3">
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value)}
            className="rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
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
            className="w-28 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
          />
          <button
            onClick={add}
            disabled={!addCat || !(parseFloat(addAmt) > 0)}
            className="rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
