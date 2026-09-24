import { useMemo, useState } from 'react'
import type { Transaction } from '@moneyquiz/core/types'
import { expenseGroups, type RecurringPayment } from '@moneyquiz/core/lib/analysis'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import { useStore } from '@moneyquiz/core/store'
import { SearchIcon, XIcon } from './icons'
import { MerchantLogo } from './MerchantLogo'

type Tab = 'merchants' | 'habits'
type Sort = 'spent' | 'visits'

interface Props {
  /** The Dashboard's date-filtered rows; the merchant list follows its range. */
  transactions: Transaction[]
  /** Repeat-habit groups (from the Dashboard's shared recurringPayments pass). */
  habits: RecurringPayment[]
  /** "This year", "Last month"… so the header says what range it covers. */
  scopeLabel: string
  onOpenGroup: (ids: string[]) => void
  onClose: () => void
}

/**
 * "View all" behind the Top merchants card: every merchant in the range,
 * with logos, searchable and sortable by spend or visits, plus a second tab
 * for spending habits (repeat merchants that aren't bills). Any row opens
 * its charges in the group view, which stacks on top of this one.
 */
export function AllMerchantsModal({
  transactions,
  habits,
  scopeLabel,
  onOpenGroup,
  onClose,
}: Props) {
  const { aliases } = useStore()
  const [tab, setTab] = useState<Tab>('merchants')
  const [sort, setSort] = useState<Sort>('spent')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => expenseGroups(transactions, aliases), [transactions, aliases])
  const total = groups.reduce((s, g) => s + g.total, 0)
  const max = groups[0]?.total ?? 0
  // Rank by the chosen order first, then filter, so a search keeps each
  // merchant's real place in the list.
  const ranked = useMemo(() => {
    const list =
      sort === 'spent' ? groups : [...groups].sort((a, b) => b.count - a.count || b.total - a.total)
    return list.map((g, i) => ({ ...g, rank: i + 1 }))
  }, [groups, sort])
  const q = query.trim().toLowerCase()
  const shown = q ? ranked.filter((g) => g.label.toLowerCase().includes(q)) : ranked

  const habitTotal = habits.reduce((s, r) => s + r.monthlyEstimate, 0)
  const scope = scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-linen-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-cream dark:bg-linen-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="All merchants"
      >
        <div className="border-b border-linen-100 dark:border-linen-800 p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-linen-800 dark:text-linen-100">
                {tab === 'merchants' ? 'All merchants' : 'Spending habits'}
              </h2>
              <p className="mt-0.5 text-xs text-linen-500 dark:text-linen-400">
                {tab === 'merchants'
                  ? `${scope} · ${groups.length} merchant${groups.length === 1 ? '' : 's'} · ${formatCurrency(total)}`
                  : `All your history · ~${formatCurrency(habitTotal)}/mo across ${habits.length}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-linen-100 dark:hover:bg-linen-700/60 hover:text-linen-600"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 inline-flex rounded-lg border border-linen-200 dark:border-linen-700 p-0.5">
            {(
              [
                ['merchants', `Merchants · ${groups.length}`],
                ['habits', `Spending habits · ${habits.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  tab === id
                    ? 'bg-forest-600 text-white'
                    : 'text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'merchants' && groups.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-linen-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a merchant"
                  aria-label="Find a merchant"
                  className="w-full rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 py-1.5 pl-8 pr-3 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                />
              </label>
              <div className="inline-flex rounded-lg border border-linen-200 dark:border-linen-700 p-0.5">
                {(
                  [
                    ['spent', 'Most spent'],
                    ['visits', 'Most visits'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSort(id)}
                    aria-pressed={sort === id}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      sort === id
                        ? 'bg-linen-100 text-linen-800 dark:bg-linen-700 dark:text-linen-100'
                        : 'text-linen-500 dark:text-linen-400 hover:bg-linen-50 dark:hover:bg-linen-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          {tab === 'merchants' ? (
            <ul>
              {shown.map((m) => (
                <li key={m.groupKey}>
                  <button
                    onClick={() => onOpenGroup(m.ids)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-linen-50 dark:hover:bg-linen-800/60"
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-linen-400 dark:text-linen-500">
                      {m.rank}
                    </span>
                    <MerchantLogo
                      brand={m.brand}
                      logoUrl={m.logoUrl}
                      fallback={categoryMeta(m.category).emoji}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-linen-700 dark:text-linen-200">
                          {m.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-linen-700 dark:text-linen-200">
                          {formatCurrency(m.total)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-linen-100 dark:bg-linen-800">
                          <div
                            className="h-full rounded-full bg-forest-500"
                            style={{ width: `${max > 0 ? (m.total / max) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-linen-400 dark:text-linen-500">
                          {m.count === 1 ? 'one charge' : `${m.count} charges`} · {categoryLabel(m.category)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="py-10 text-center text-sm text-linen-400 dark:text-linen-500">
                  {q ? `No merchants match “${query.trim()}”.` : 'No spending in this range yet.'}
                </li>
              )}
            </ul>
          ) : (
            <>
              <p className="px-2 pt-1 pb-2 text-sm text-linen-500 dark:text-linen-400">
                Places you keep going back to: not bills, just patterns. The amounts vary, but the
                habit repeats. Tap one to see its charges or re-file it as an expected bill.
              </p>
              <ul>
                {habits.map((r) => (
                  <li key={r.groupKey}>
                    <button
                      onClick={() => onOpenGroup(r.ids)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-linen-50 dark:hover:bg-linen-800/60"
                    >
                      <MerchantLogo
                        brand={r.brand}
                        logoUrl={r.logoUrl}
                        fallback={categoryMeta(r.category).emoji}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-linen-700 dark:text-linen-200">
                          {r.merchant}
                        </div>
                        <div className="text-xs text-linen-400 dark:text-linen-500">
                          {r.count} charges over {r.months} mo · ~{formatCurrency(r.avgAmount)} each
                        </div>
                      </div>
                      <div className="shrink-0 text-right tabular-nums text-sm font-semibold text-linen-700 dark:text-linen-200">
                        {formatCurrency(r.monthlyEstimate)}
                        <span className="text-xs font-normal text-linen-400 dark:text-linen-500">/mo</span>
                      </div>
                    </button>
                  </li>
                ))}
                {habits.length === 0 && (
                  <li className="py-10 text-center text-sm text-linen-400 dark:text-linen-500">
                    No habits yet. When a place shows up month after month, it'll appear here.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
