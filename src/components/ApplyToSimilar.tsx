import { useState } from 'react'
import type { Category, Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { merchantKey, groupLabel, sharesName, displayDescription } from '@moneyquiz/core/lib/merchant'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatAbs, formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { CheckIcon, XIcon } from './icons'

interface Option {
  /** The sentence fragment that completes "Also set Dining on …?" */
  label: string
  rows: Transaction[]
}

interface Pending {
  category: Category
  primary: Option
  secondary?: Option
}

/**
 * Smart bulk categorize. After a single category change we look for related
 * charges and offer to update them:
 *  - primary: charges with the SAME amount that also share the merchant name
 *    (e.g. the $118 "Willow Bend" dues, but not the $342.50 ones), and
 *  - secondary: every charge from that merchant regardless of amount (for
 *    variable bills like a power company you always want in one category).
 *
 * The offer can be expanded to show exactly which rows it covers, all ticked,
 * so any that don't belong can be unticked before applying. It used to apply
 * blind — "the 5 $100.00 charges" with no way to see what those were — which
 * is a bad deal when one descriptor covers two different bills.
 */
export function useApplyToSimilar() {
  const { transactions, setCategory, setCategoryBulk, setCategoryForMerchant, aliases } = useStore()
  const [pending, setPending] = useState<Pending | null>(null)
  const [expanded, setExpanded] = useState<Option | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const dismiss = () => {
    setPending(null)
    setExpanded(null)
    setExcluded(new Set())
  }

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

    const merchantOption: Option = {
      label: `all ${sameMerchant.length} ${label} charge${sameMerchant.length === 1 ? '' : 's'}`,
      rows: sameMerchant,
    }

    setExpanded(null)
    setExcluded(new Set())
    if (sameAmount.length > 0) {
      setPending({
        category,
        primary: {
          label: `the ${sameAmount.length} ${formatAbs(t.amount)} charge${
            sameAmount.length === 1 ? '' : 's'
          }`,
          rows: sameAmount,
        },
        // Offer the broader merchant sweep only if it covers more than the amount match.
        secondary: sameMerchant.length > sameAmount.length ? merchantOption : undefined,
      })
    } else if (sameMerchant.length > 0) {
      setPending({ category, primary: merchantOption })
    }
  }

  /**
   * Apply an option to the rows still ticked. A whole-merchant sweep with
   * nothing unticked is remembered per merchant, so future imports follow it;
   * once rows are unticked it's a one-off edit on exactly those, since the
   * user just said the merchant rule isn't what they meant.
   */
  const apply = (option: Option) => {
    const rows = option.rows.filter((r) => !excluded.has(r.id))
    if (rows.length === 0) return dismiss()
    const isWholeMerchant =
      option === pending?.secondary || (option === pending?.primary && !pending.secondary)
    const wholeMerchantIntact = isWholeMerchant && rows.length === option.rows.length
    if (wholeMerchantIntact) {
      setCategoryForMerchant(merchantKey(rows[0].description), pending.category)
    } else {
      setCategoryBulk(rows.map((r) => r.id), pending!.category)
    }
    dismiss()
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 shadow-lg">
        {expanded && (
          <div className="border-b border-linen-100 dark:border-linen-800">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
                {expanded.rows.length - excluded.size} of {expanded.rows.length} selected
              </span>
              <button
                onClick={() => setExpanded(null)}
                className="text-xs text-linen-500 underline-offset-2 hover:underline dark:text-linen-400"
              >
                Hide
              </button>
            </div>
            <ul className="max-h-56 overflow-auto px-1.5 pb-2">
              {expanded.rows.map((r) => (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-linen-50 dark:hover:bg-linen-800">
                    <input
                      type="checkbox"
                      checked={!excluded.has(r.id)}
                      onChange={() =>
                        setExcluded((prev) => {
                          const next = new Set(prev)
                          if (next.has(r.id)) next.delete(r.id)
                          else next.add(r.id)
                          return next
                        })
                      }
                      className="h-4 w-4 shrink-0 rounded border-linen-300 text-forest-600 focus:ring-forest-500"
                    />
                    <span className="w-16 shrink-0 text-[11px] text-linen-400 dark:text-linen-500 tabular-nums">
                      {formatDate(r.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-linen-700 dark:text-linen-200">
                      {displayDescription(r.description, aliases)}
                    </span>
                    <span
                      className="shrink-0 text-[11px] text-linen-400 dark:text-linen-500"
                      title={categoryLabel(r.category)}
                      aria-hidden
                    >
                      {categoryMeta(r.category).emoji}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-linen-600 dark:text-linen-300 tabular-nums">
                      {formatCurrency(r.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1 text-sm text-linen-600 dark:text-linen-300">
            Also set <span className="font-semibold">{categoryLabel(pending.category)}</span> on{' '}
            <button
              onClick={() => setExpanded(expanded ? null : pending.primary)}
              className="underline decoration-dotted underline-offset-2 hover:text-linen-800 dark:hover:text-linen-100"
            >
              {pending.primary.label}
            </button>
            ?
          </div>
          {pending.secondary && (
            <button
              onClick={() => {
                if (expanded === pending.secondary) apply(pending.secondary)
                else {
                  setExpanded(pending.secondary!)
                  setExcluded(new Set())
                }
              }}
              className="shrink-0 rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800"
            >
              {expanded === pending.secondary ? 'Apply to these' : pending.secondary.label}
            </button>
          )}
          <button
            onClick={() => apply(expanded ?? pending.primary)}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
          >
            <CheckIcon className="h-4 w-4" /> Apply
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-linen-100 dark:hover:bg-linen-800"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { change, node }
}
