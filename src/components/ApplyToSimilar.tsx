import { useState } from 'react'
import type { Category } from '../types'
import { useStore } from '../store'
import { merchantKey, groupLabel, sharesName } from '../lib/merchant'
import { categoryLabel } from '../lib/categories'
import { formatAbs } from '../lib/format'
import { CheckIcon, XIcon } from './icons'

interface Action {
  label: string
  apply: () => void
}
interface Pending {
  category: Category
  primary: Action
  secondary?: Action
}

/**
 * Smart bulk categorize. After a single category change we look for related
 * charges and offer to update them in one click:
 *  - primary: charges with the SAME amount that also share the merchant name
 *    (e.g. the $100 "Holiday Pines" dues, but not the $45 ones), and
 *  - secondary: every charge from that merchant regardless of amount (for
 *    variable bills like a power company you always want in one category).
 */
export function useApplyToSimilar() {
  const { transactions, setCategory, setCategoryBulk, setCategoryForMerchant, aliases } = useStore()
  const [pending, setPending] = useState<Pending | null>(null)

  const change = (id: string, category: Category) => {
    setCategory(id, category)
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    const key = merchantKey(t.description)
    const others = transactions.filter((x) => x.id !== id && x.category !== category)

    const sameAmount = others.filter(
      (x) => x.amount === t.amount && sharesName(x.description, t.description),
    )
    const sameMerchant = others.filter((x) => merchantKey(x.description) === key)
    const label = groupLabel(t.description, aliases)

    const merchantAction: Action = {
      label: `all ${sameMerchant.length} ${label} charge${sameMerchant.length === 1 ? '' : 's'}`,
      apply: () => setCategoryForMerchant(key, category),
    }

    if (sameAmount.length > 0) {
      setPending({
        category,
        primary: {
          label: `the ${sameAmount.length} ${formatAbs(t.amount)} charge${
            sameAmount.length === 1 ? '' : 's'
          }`,
          apply: () => setCategoryBulk(sameAmount.map((x) => x.id), category),
        },
        // Offer the broader merchant sweep only if it covers more than the amount match.
        secondary: sameMerchant.length > sameAmount.length ? merchantAction : undefined,
      })
    } else if (sameMerchant.length > 0) {
      setPending({ category, primary: merchantAction })
    }
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg">
        <div className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
          Also set <span className="font-semibold">{categoryLabel(pending.category)}</span> on{' '}
          {pending.primary.label}?
        </div>
        {pending.secondary && (
          <button
            onClick={() => {
              pending.secondary!.apply()
              setPending(null)
            }}
            className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {pending.secondary.label}
          </button>
        )}
        <button
          onClick={() => {
            pending.primary.apply()
            setPending(null)
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <CheckIcon className="h-4 w-4" /> Apply
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
