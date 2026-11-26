import { useState } from 'react'
import type { Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { displayDescription, groupLabel, renameOffers } from '@moneyquiz/core/lib/merchant'
import { formatAbs } from '@moneyquiz/core/lib/format'
import { OfferBar, SimilarRowsList } from './ApplyToSimilar'
import { PencilIcon } from './icons'

interface Option {
  /** The fragment that completes "Also rename … to “iCloud”?" */
  label: string
  rows: Transaction[]
}

interface Pending {
  name: string
  primary: Option
  secondary?: Option
}

/**
 * Renaming a transaction works like changing its category: only the row you
 * edited changes, then we offer the related charges — the same-amount ones
 * first (the other $9.99 Apple charges), with every charge sharing the
 * merchant name (the $6.48 ones too) as the wider option — and the offer
 * expands to a ticked list so any that don't belong can be unticked first.
 *
 * Each rename is pinned per exact row, never as a merchant-wide alias: one
 * "Apple" descriptor often covers several different subscriptions, and an
 * alias silently renamed all of them at once.
 */
export function useRenameSimilar() {
  const { transactions, aliases, setDescriptionBulk } = useStore()
  const [pending, setPending] = useState<Pending | null>(null)
  const [expanded, setExpanded] = useState<Option | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const dismiss = () => {
    setPending(null)
    setExpanded(null)
    setExcluded(new Set())
  }

  const rename = (id: string, name: string) => {
    const clean = name.trim()
    if (!clean) return
    setDescriptionBulk([id], clean)
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    const label = groupLabel(t.description, aliases)
    const [primary, secondary] = renameOffers(t, transactions, clean, aliases).map(
      ({ rows, wholeMerchant }): Option => ({
        label: wholeMerchant
          ? `all ${rows.length} ${label} charge${rows.length === 1 ? '' : 's'}`
          : `the ${rows.length} ${formatAbs(t.amount)} charge${rows.length === 1 ? '' : 's'}`,
        rows,
      }),
    )
    setExpanded(null)
    setExcluded(new Set())
    setPending(primary ? { name: clean, primary, secondary } : null)
  }

  const apply = (option: Option) => {
    const ids = option.rows.filter((r) => !excluded.has(r.id)).map((r) => r.id)
    if (ids.length > 0 && pending) setDescriptionBulk(ids, pending.name)
    dismiss()
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
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
              Also rename{' '}
              <button
                onClick={() => {
                  setExpanded(expanded ? null : pending.primary)
                  setExcluded(new Set())
                }}
                className="underline decoration-dotted underline-offset-2 hover:text-linen-800 dark:hover:text-linen-100"
              >
                {pending.primary.label}
              </button>{' '}
              to <span className="font-semibold">“{pending.name}”</span>?
            </>
          }
          secondary={
            pending.secondary && {
              label: expanded === pending.secondary ? 'Rename these' : pending.secondary.label,
              onClick: () => {
                if (expanded === pending.secondary) apply(pending.secondary)
                else {
                  setExpanded(pending.secondary!)
                  setExcluded(new Set())
                }
              },
            }
          }
          primaryLabel="Rename"
          onPrimary={() => apply(expanded ?? pending.primary)}
          onDismiss={dismiss}
        />
      </div>
    </div>
  ) : null

  return { rename, node }
}

/** Inline-editable transaction description: shows the name with a pencil; click to rename. */
export function EditableDescription({
  t,
  aliases,
  onRename,
}: {
  t: Transaction
  aliases: Record<string, string>
  onRename: (id: string, name: string) => void
}) {
  const shown = displayDescription(t.description, aliases)
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(shown)

  if (!editing) {
    return (
      <span className="group flex items-center gap-1.5">
        <span className="truncate">{shown}</span>
        <button
          onClick={() => {
            setVal(shown)
            setEditing(true)
          }}
          title="Rename"
          className="shrink-0 text-linen-300 opacity-0 transition-opacity hover:text-linen-500 group-hover:opacity-100 dark:text-linen-600"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  const save = () => {
    setEditing(false)
    if (val.trim() && val.trim() !== shown) onRename(t.id, val)
  }
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save()
        else if (e.key === 'Escape') setEditing(false)
      }}
      className="w-full rounded-md border border-forest-400 bg-cream dark:bg-linen-800 px-1.5 py-0.5 text-sm text-linen-700 dark:text-linen-200 focus:outline-none focus:ring-1 focus:ring-forest-500"
      aria-label="Rename description"
    />
  )
}
