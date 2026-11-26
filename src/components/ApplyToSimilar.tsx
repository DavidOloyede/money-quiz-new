import { useState, type ReactNode } from 'react'
import type { Category, Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { categoryOffers, merchantKey, groupLabel, displayDescription } from '@moneyquiz/core/lib/merchant'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatAbs, formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { CheckIcon, XIcon } from './icons'

interface Option {
  /** The sentence fragment that completes "Also set Dining on …?" */
  label: string
  rows: Transaction[]
  /** The whole-merchant tier, the only one that may become a merchant rule. */
  wholeMerchant: boolean
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
    const label = groupLabel(t.description, aliases)
    const [primary, secondary] = categoryOffers(t, transactions, category).map(
      ({ rows, wholeMerchant }): Option => ({
        label: wholeMerchant
          ? `all ${rows.length} ${label} charge${rows.length === 1 ? '' : 's'}`
          : `the ${rows.length} ${formatAbs(t.amount)} charge${rows.length === 1 ? '' : 's'}`,
        rows,
        wholeMerchant,
      }),
    )
    setExpanded(null)
    setExcluded(new Set())
    setPending(primary ? { category, primary, secondary } : null)
  }

  /**
   * Apply an option to the rows still ticked. A whole-merchant sweep with
   * nothing unticked is remembered per merchant, so future imports follow it;
   * once rows are unticked it's a one-off edit on exactly those, since the
   * user just said the merchant rule isn't what they meant. A same-amount
   * offer is always a one-off edit, even when it's the only offer.
   */
  const apply = (option: Option) => {
    if (!pending) return
    const rows = option.rows.filter((r) => !excluded.has(r.id))
    if (rows.length === 0) return dismiss()
    if (option.wholeMerchant && rows.length === option.rows.length) {
      setCategoryForMerchant(merchantKey(rows[0].description), pending.category)
    } else {
      setCategoryBulk(rows.map((r) => r.id), pending.category)
    }
    dismiss()
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="modal-panel w-full max-w-md card shadow-lg">
        {expanded && (
          <SimilarRowsList
            rows={expanded.rows}
            excluded={excluded}
            setExcluded={setExcluded}
            aliases={aliases}
            onHide={() => setExpanded(null)}
          />
        )}

        <OfferBar
          question={
            <>
              Also set <span className="font-semibold">{categoryLabel(pending.category)}</span> on{' '}
              <button
                onClick={() => setExpanded(expanded ? null : pending.primary)}
                className="underline decoration-dotted underline-offset-2 hover:text-linen-800 dark:hover:text-linen-100"
              >
                {pending.primary.label}
              </button>
              ?
            </>
          }
          secondary={
            pending.secondary && {
              label: expanded === pending.secondary ? 'Apply to these' : pending.secondary.label,
              onClick: () => {
                if (expanded === pending.secondary) apply(pending.secondary)
                else {
                  setExpanded(pending.secondary!)
                  setExcluded(new Set())
                }
              },
            }
          }
          primaryLabel="Apply"
          onPrimary={() => apply(expanded ?? pending.primary)}
          onDismiss={dismiss}
        />
      </div>
    </div>
  ) : null

  return { change, node }
}

/**
 * The question-and-buttons row shared by both bulk prompts (category and
 * rename). The question and the buttons wrap onto separate lines when they
 * don't fit side by side, and a long wider-option label ("all 15 Willow Bend
 * Owners Association charges") wraps inside its own button, so the question
 * keeps a readable width instead of being squeezed into a sliver.
 */
export function OfferBar({
  question,
  secondary,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  question: ReactNode
  secondary?: { label: string; onClick: () => void }
  primaryLabel: string
  onPrimary: () => void
  onDismiss: () => void
}) {
  return (
    <div className="flex items-start gap-2 p-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <div className="min-w-0 flex-[1_1_12rem] text-sm text-linen-600 dark:text-linen-300">{question}</div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {secondary && (
            <button onClick={secondary.onClick} className="btn-secondary min-w-0 px-2.5 py-1.5 text-xs">
              {secondary.label}
            </button>
          )}
          <button
            onClick={onPrimary}
            className="btn-primary flex shrink-0 items-center gap-1 px-3 py-1.5 text-sm"
          >
            <CheckIcon className="h-4 w-4" /> {primaryLabel}
          </button>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-linen-100 dark:hover:bg-linen-800"
        aria-label="Dismiss"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * The expandable "which rows exactly?" list behind both bulk prompts (category
 * and rename): every row ticked, untick any that don't belong before applying.
 */
export function SimilarRowsList({
  rows,
  excluded,
  setExcluded,
  aliases,
  onHide,
}: {
  rows: Transaction[]
  excluded: Set<string>
  setExcluded: (update: (prev: Set<string>) => Set<string>) => void
  aliases: Record<string, string>
  onHide: () => void
}) {
  return (
    <div className="border-b border-linen-100 dark:border-linen-800">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
          {rows.length - excluded.size} of {rows.length} selected
        </span>
        <button
          onClick={onHide}
          className="text-xs text-linen-500 underline-offset-2 hover:underline dark:text-linen-400"
        >
          Hide
        </button>
      </div>
      <ul className="max-h-56 overflow-auto px-1.5 pb-2">
        {rows.map((r) => (
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
  )
}
