import { useState } from 'react'
import type { Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { merchantKey, displayDescription, sharesName } from '@moneyquiz/core/lib/merchant'
import { CheckIcon, PencilIcon, XIcon } from './icons'

/**
 * Renaming a transaction works like changing its category: rename one, and we
 * offer to apply the same clean name to the other *similarly named* charges
 * (different bank descriptors that are really the same merchant). The rename is
 * stored as a merchant alias, so it sticks for future imports and merges the
 * group in the recurring/subscription lists.
 */
export function useRenameSimilar() {
  const { transactions, aliases, setAlias } = useStore()
  const [pending, setPending] = useState<{ name: string; ids: string[]; count: number } | null>(null)

  const rename = (id: string, name: string) => {
    const clean = name.trim()
    if (!clean) return
    setAlias([id], clean)
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    const key = merchantKey(t.description)
    // One representative id per *other* merchant key that shares a name word and
    // isn't already showing this name.
    const seen = new Set<string>()
    const others: string[] = []
    for (const x of transactions) {
      const k = merchantKey(x.description)
      if (k === key || seen.has(k)) continue
      if (!sharesName(x.description, t.description)) continue
      if (displayDescription(x.description, aliases) === clean) continue
      seen.add(k)
      others.push(x.id)
    }
    if (others.length) setPending({ name: clean, ids: others, count: others.length })
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-3 shadow-lg">
        <div className="min-w-0 flex-1 text-sm text-linen-600 dark:text-linen-300">
          Also rename <span className="font-semibold">{pending.count}</span> similarly-named charge
          {pending.count === 1 ? '' : 's'} to <span className="font-semibold">“{pending.name}”</span>?
        </div>
        <button
          onClick={() => {
            setAlias(pending.ids, pending.name)
            setPending(null)
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
        >
          <CheckIcon className="h-4 w-4" /> Rename all
        </button>
        <button
          onClick={() => setPending(null)}
          className="shrink-0 rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-linen-100 dark:hover:bg-linen-800"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
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
