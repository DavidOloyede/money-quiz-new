import type { Transaction } from '@moneyquiz/core/types'
import { topMerchants } from '@moneyquiz/core/lib/analysis'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import { useStore } from '@moneyquiz/core/store'

interface Props {
  transactions: Transaction[]
}

export function TopMerchantsCard({ transactions }: Props) {
  const { aliases } = useStore()
  const merchants = topMerchants(transactions, 6, aliases)
  if (merchants.length === 0) return null
  const max = merchants[0].total

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Top merchants</h3>
      <ul className="mt-3 space-y-2.5">
        {merchants.map((m, i) => (
          <li key={m.merchant} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linen-100 dark:bg-linen-800 text-xs font-semibold text-linen-500 dark:text-linen-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-linen-700 dark:text-linen-200">
                  {m.merchant}
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
                <span className="text-xs text-linen-400 dark:text-linen-500">{m.count}×</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
