import type { Transaction } from '@moneyquiz/core/types'
import { expenseGroups } from '@moneyquiz/core/lib/analysis'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import { useStore } from '@moneyquiz/core/store'
import { ChevronRightIcon } from './icons'
import { MerchantLogo } from './MerchantLogo'

interface Props {
  transactions: Transaction[]
  /** Open the charges behind a merchant. */
  onOpenGroup?: (ids: string[]) => void
  /** Open the full merchant list (which also holds the spending habits). */
  onViewAll?: () => void
  /** How many spending habits the full list holds, so the link can say so. */
  habitCount?: number
}

/**
 * Where the money went, by merchant: the top few with their logos, a bar for
 * scale and how many charges each took. Totals are net of refunds, and a row
 * opens its charges. "View all" leads to every merchant plus the spending
 * habits, which used to be two more cards on the Dashboard.
 */
export function TopMerchantsCard({ transactions, onOpenGroup, onViewAll, habitCount = 0 }: Props) {
  const { aliases } = useStore()
  const all = expenseGroups(transactions, aliases)
  const top = all.slice(0, 6)
  const max = top[0]?.total ?? 0

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Top merchants</h3>
        {onViewAll && all.length > 0 && (
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-0.5 rounded text-xs font-medium text-forest-700 hover:underline underline-offset-2 dark:text-forest-300"
          >
            View all
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ul className="mt-2">
        {top.map((m, i) => (
          <li key={m.groupKey}>
            <button
              onClick={() => onOpenGroup?.(m.ids)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-linen-50 dark:hover:bg-linen-800/60"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linen-100 dark:bg-linen-800 text-xs font-semibold text-linen-500 dark:text-linen-400">
                {i + 1}
              </span>
              <MerchantLogo brand={m.brand} logoUrl={m.logoUrl} fallback={categoryMeta(m.category).emoji} />
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
                  <span className="w-8 text-right text-xs tabular-nums text-linen-400 dark:text-linen-500">
                    {m.count}×
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
        {top.length === 0 && (
          <li className="py-6 text-center text-sm text-linen-400 dark:text-linen-500">
            No spending in this range yet.
          </li>
        )}
      </ul>
      {onViewAll && all.length > 0 && (
        <button
          onClick={onViewAll}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-linen-200 dark:border-linen-700 px-3 py-2.5 text-sm font-medium text-linen-600 hover:bg-linen-50 dark:text-linen-300 dark:hover:bg-linen-800"
        >
          See all {all.length} merchant{all.length === 1 ? '' : 's'}
          {habitCount > 0 && (
            <>
              {' '}&amp; your {habitCount} spending habit{habitCount === 1 ? '' : 's'}
            </>
          )}
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
