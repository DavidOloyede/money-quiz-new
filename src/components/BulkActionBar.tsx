import { useState } from 'react'
import type { Category } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { allCategories } from '@moneyquiz/core/lib/categories'

interface Props {
  ids: string[]
  onDone: () => void
}

/**
 * What you can do to a set of selected rows, wherever they were selected.
 *
 * The same strip appears in the transaction table, both drill-in modals and
 * the review queue — filtering to a set of rows is only useful if you can then
 * act on them, and until now only the table could.
 */
export function BulkActionBar({ ids, onDone }: Props) {
  const { setCategoryBulk, setDescriptionBulk, setTreatment } = useStore()
  const [label, setLabel] = useState('')
  if (ids.length === 0) return null

  const act = (fn: () => void) => {
    fn()
    onDone()
  }

  const rename = () => {
    const clean = label.trim()
    if (!clean) return
    act(() => setDescriptionBulk(ids, clean))
    setLabel('')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-linen-100 dark:border-linen-800 bg-forest-50 dark:bg-forest-500/10 px-4 py-2.5 text-sm">
      <span className="font-medium text-forest-800 dark:text-forest-300">
        {ids.length} selected
      </span>
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value as Category
          if (v) act(() => setCategoryBulk(ids, v))
        }}
        aria-label="Set category for selected transactions"
        className="rounded-lg border border-forest-300 dark:border-forest-500/40 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
      >
        <option value="">Set category to…</option>
        {allCategories().map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          rename()
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rename to…"
          aria-label="Rename selected transactions"
          className="w-32 rounded-lg border border-forest-300 dark:border-forest-500/40 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!label.trim()}
          className="rounded-lg border border-forest-300 dark:border-forest-500/40 px-2.5 py-1.5 text-xs font-medium text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-500/20 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Rename
        </button>
      </form>
      <button
        onClick={() => act(() => setTreatment(ids, 'reimbursement'))}
        title="Money paid back to you — reduces spending instead of counting as income"
        className="rounded-lg border border-forest-300 dark:border-forest-500/40 px-2.5 py-1.5 text-xs font-medium text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-500/20"
      >
        Reimbursement
      </button>
      <button
        onClick={() => act(() => setTreatment(ids, 'internal'))}
        title="Money between your own accounts — kept out of every total"
        className="rounded-lg border border-forest-300 dark:border-forest-500/40 px-2.5 py-1.5 text-xs font-medium text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-500/20"
      >
        Internal
      </button>
      <button
        onClick={() => act(() => setTreatment(ids, 'normal'))}
        title="Undo a reimbursement or internal mark"
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-forest-700/80 dark:text-forest-300/80 underline-offset-2 hover:underline"
      >
        Normal
      </button>
      <button
        onClick={onDone}
        className="ml-auto text-forest-700 dark:text-forest-300 underline-offset-2 hover:underline"
      >
        Clear selection
      </button>
    </div>
  )
}
