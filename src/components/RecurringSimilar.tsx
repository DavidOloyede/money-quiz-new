import { useState } from 'react'
import { useStore } from '../store'
import { groupKey, groupLabel } from '../lib/merchant'
import { CheckIcon, XIcon } from './icons'

/**
 * Starring works like changing a category or renaming: ★ one charge as
 * recurring and we offer to flag the merchant's other charges in one click.
 * Accepting flags the whole merchant, so future imports come in starred too.
 */
export function useRecurringSimilar() {
  const { transactions, aliases, toggleRecurring, setGroupRecurring } = useStore()
  const [pending, setPending] = useState<{ label: string; ids: string[]; count: number } | null>(
    null,
  )

  const toggle = (id: string) => {
    const t = transactions.find((x) => x.id === id)
    toggleRecurring(id)
    if (!t || t.recurring) return // un-starring: nothing to offer
    const key = groupKey(t.description, aliases)
    const group = transactions.filter((x) => groupKey(x.description, aliases) === key)
    const others = group.filter((x) => x.id !== id && !x.recurring)
    if (others.length > 0) {
      setPending({
        label: groupLabel(t.description, aliases),
        ids: group.map((x) => x.id),
        count: others.length,
      })
    }
  }

  const node = pending ? (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-3 shadow-lg">
        <div className="min-w-0 flex-1 text-sm text-linen-600 dark:text-linen-300">
          Also mark the other {pending.count}{' '}
          <span className="font-semibold">{pending.label}</span> charge
          {pending.count === 1 ? '' : 's'} as recurring (and future ones)?
        </div>
        <button
          onClick={() => {
            setGroupRecurring(pending.ids, true)
            setPending(null)
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
        >
          <CheckIcon className="h-4 w-4" /> Mark all
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

  return { toggle, node }
}
