import { useState } from 'react'
import type { Category } from '../types'
import { useStore } from '../store'
import { merchantKey, merchantLabel } from '../lib/merchant'
import { categoryLabel } from '../lib/categories'
import { CheckIcon, XIcon } from './icons'

interface Pending {
  key: string
  label: string
  category: Category
  count: number
}

/**
 * Smart bulk categorize: after a single category change, if other transactions
 * share the same merchant we offer to update them all in one click. Returns a
 * `change` handler to use in place of setCategory, plus a toast node to render.
 */
export function useApplyToSimilar() {
  const { transactions, setCategory, setCategoryForMerchant } = useStore()
  const [pending, setPending] = useState<Pending | null>(null)

  const change = (id: string, category: Category) => {
    setCategory(id, category)
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    const key = merchantKey(t.description)
    const others = transactions.filter(
      (x) => x.id !== id && merchantKey(x.description) === key && x.category !== category,
    )
    if (others.length > 0) {
      setPending({ key, label: merchantLabel(t.description), category, count: others.length })
    }
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg">
        <div className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
          Also set the other <span className="font-semibold">{pending.count}</span>{' '}
          <span className="font-semibold">“{pending.label}”</span> transaction
          {pending.count === 1 ? '' : 's'} to{' '}
          <span className="font-semibold">{categoryLabel(pending.category)}</span>?
        </div>
        <button
          onClick={() => {
            setCategoryForMerchant(pending.key, pending.category)
            setPending(null)
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <CheckIcon className="h-4 w-4" /> Apply to all
        </button>
        <button
          onClick={() => setPending(null)}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null

  return { change, node }
}
