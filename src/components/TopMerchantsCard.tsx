import type { Transaction } from '../types'
import { topMerchants } from '../lib/analysis'
import { formatCurrency } from '../lib/format'
import { useStore } from '../store'

interface Props {
  transactions: Transaction[]
}

export function TopMerchantsCard({ transactions }: Props) {
  const { aliases } = useStore()
  const merchants = topMerchants(transactions, 6, aliases)
  if (merchants.length === 0) return null
  const max = merchants[0].total

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">Top merchants</h3>
      <ul className="mt-3 space-y-2.5">
        {merchants.map((m, i) => (
          <li key={m.merchant} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {m.merchant}
                </span>
                <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {formatCurrency(m.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${max > 0 ? (m.total / max) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{m.count}×</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
