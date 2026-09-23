import type { Category, ImportSource } from '@moneyquiz/core/types'
import type { TransactionCriteria } from '@moneyquiz/core/lib/filter'
import { allCategories } from '@moneyquiz/core/lib/categories'
import { StarIcon } from './icons'

const INPUT =
  'rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-3 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none'

interface Props {
  value: TransactionCriteria
  onChange: (next: TransactionCriteria) => void
  /** Offer a source filter (and the chips to go with it). */
  sources?: ImportSource[]
  /** Offer the ★-only toggle. Off in the drill-ins, where it adds little. */
  showRecurring?: boolean
  /** Amount mode: a single exact box, or a min/max pair. */
  amountMode?: 'exact' | 'range' | 'both'
}

/**
 * The filter bar shared by the transaction table and the drill-in modals.
 *
 * Amount is offered as BOTH an exact box and a range, because the two answer
 * different questions: "show me the $118 ones" (which bill is this?) and
 * "show me everything over $500" (where did the money go?). Exact wins when
 * both are filled, which is what someone typing an exact figure means.
 */
export function TransactionFilters({
  value,
  onChange,
  sources,
  showRecurring = false,
  amountMode = 'both',
}: Props) {
  const set = (patch: Partial<TransactionCriteria>) => onChange({ ...value, ...patch })
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  const selectedSources = value.sources ?? []

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={value.query ?? ''}
        onChange={(e) => set({ query: e.target.value })}
        placeholder="Search description…"
        className={`w-40 ${INPUT}`}
      />

      {(amountMode === 'exact' || amountMode === 'both') && (
        <input
          type="number"
          step="0.01"
          value={value.amount ?? ''}
          onChange={(e) => set({ amount: num(e.target.value) })}
          placeholder="Exact $"
          title="Show only charges of exactly this amount, in or out"
          className={`w-24 ${INPUT}`}
        />
      )}
      {(amountMode === 'range' || amountMode === 'both') && (
        <>
          <input
            type="number"
            step="0.01"
            value={value.min ?? ''}
            onChange={(e) => set({ min: num(e.target.value) })}
            placeholder="Min $"
            className={`w-20 ${INPUT}`}
          />
          <input
            type="number"
            step="0.01"
            value={value.max ?? ''}
            onChange={(e) => set({ max: num(e.target.value) })}
            placeholder="Max $"
            className={`w-20 ${INPUT}`}
          />
        </>
      )}

      <select
        value={value.category ?? 'all'}
        onChange={(e) => set({ category: e.target.value as Category | 'all' })}
        className={INPUT}
      >
        <option value="all">All categories</option>
        {allCategories().map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>

      {showRecurring && (
        <button
          onClick={() => set({ recurringOnly: !value.recurringOnly })}
          aria-pressed={!!value.recurringOnly}
          title="Show only recurring payments"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
            value.recurringOnly
              ? 'border-honey-300 bg-honey-50 text-honey-700 dark:border-honey-500/40 dark:bg-honey-500/10 dark:text-honey-300'
              : 'border-linen-300 text-linen-600 hover:bg-linen-50 dark:border-linen-600 dark:text-linen-300 dark:hover:bg-linen-800'
          }`}
        >
          <StarIcon className="h-4 w-4" filled={!!value.recurringOnly} /> Recurring
        </button>
      )}

      {sources && sources.length > 1 && (
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="text-xs text-linen-400 dark:text-linen-500">Source:</span>
          {sources.map((s) => {
            const on = selectedSources.includes(s.id)
            return (
              <button
                key={s.id}
                onClick={() =>
                  set({
                    sources: on
                      ? selectedSources.filter((x) => x !== s.id)
                      : [...selectedSources, s.id],
                  })
                }
                aria-pressed={on}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  on
                    ? 'border-forest-400 bg-forest-50 text-forest-700 dark:border-forest-500/50 dark:bg-forest-500/10 dark:text-forest-300'
                    : 'border-linen-300 text-linen-600 hover:bg-linen-50 dark:border-linen-600 dark:text-linen-300 dark:hover:bg-linen-800'
                }`}
              >
                {s.fileName}
              </button>
            )
          })}
          {selectedSources.length > 0 && (
            <button
              onClick={() => set({ sources: [] })}
              className="text-xs text-linen-500 underline-offset-2 hover:underline dark:text-linen-400"
            >
              all sources
            </button>
          )}
        </div>
      )}
    </div>
  )
}
