/**
 * Categorization debug panel (admin only). Pulls the caller's stored raw Plaid
 * transactions (GET /api/plaid/raw — no Plaid call) and shows each one's raw
 * fields beside what our code labeled it: it runs the REAL mapPlaidTransactions
 * + override lookup + analysis predicates, so the table always mirrors the live
 * code path. Use it to spot mislabels after a sync and judge whether the
 * categorization is smart rather than hand-keyed.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, Transaction } from '../types'
import { plaidApi, type RawPlaidItem, type PlaidTxn } from '../lib/plaid'
import { mapPlaidTransactions } from '../lib/plaidMap'
import { overrideKey } from '../lib/categorize'
import { categoryMeta } from '../lib/categories'
import { countsTowardTotals, isRealIncome, isRefund } from '../lib/analysis'
import { useStore } from '../store'

const cardCls =
  'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5'

/** One transaction with both sides resolved through the real code path. */
interface Row {
  item: RawPlaidItem
  raw: PlaidTxn
  mapped: Transaction // category = final (override applied), amount = signed
  autoCategory: Category // what mapPlaidTransactions produced before overrides
  overridden: boolean
  suspect: boolean
  suspectWhy: string
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{children}</span>
  )
}

export function PlaidDebugTab() {
  const { overrides } = useStore()
  const [items, setItems] = useState<RawPlaidItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await plaidApi.raw()
      setItems(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load raw transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo<Row[]>(() => {
    if (!items) return []
    const out: Row[] = []
    for (const item of items) {
      for (const raw of item.transactions) {
        const auto = mapPlaidTransactions([raw], item.id)[0]
        const override = overrides[overrideKey(auto.description)]
        const category = override ?? auto.category
        const mapped: Transaction = { ...auto, category, overridden: Boolean(override) }
        const primary = raw.personal_finance_category?.primary
        let suspectWhy = ''
        if (category === 'other') suspectWhy = 'fell through to Other'
        else if (category === 'income' && primary !== 'INCOME')
          suspectWhy = 'income not from Plaid INCOME — check for a refund'
        out.push({
          item,
          raw,
          mapped,
          autoCategory: auto.category,
          overridden: Boolean(override),
          suspect: suspectWhy !== '',
          suspectWhy,
        })
      }
    }
    return out.sort((a, b) => b.raw.date.localeCompare(a.raw.date))
  }, [items, overrides])

  const summary = useMemo(() => {
    const counts = new Map<Category, number>()
    for (const r of rows) counts.set(r.mapped.category, (counts.get(r.mapped.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const suspectCount = rows.filter((r) => r.suspect).length

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (!items) return <p className="text-sm text-slate-400">Loading…</p>

  if (rows.length === 0) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No connected accounts with transactions yet. Connect a bank and sync, then reload.
        </p>
        <button
          onClick={() => void load()}
          className="mt-3 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Reload
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {rows.length} transactions
          </span>
          {suspectCount > 0 && (
            <Badge tone="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
              ⚠ {suspectCount} to review
            </Badge>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Reloading…' : 'Reload'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summary.map(([cat, n]) => {
            const m = categoryMeta(cat)
            return (
              <Badge
                key={cat}
                tone="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {m.emoji} {m.label} · {n}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Raw name / merchant</th>
              <th className="pb-2 pr-3 text-right">Plaid amt</th>
              <th className="pb-2 pr-3">Plaid PFC (primary / detailed)</th>
              <th className="pb-2 pr-3">→ App category</th>
              <th className="pb-2 pr-3 text-right">App amt</th>
              <th className="pb-2">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const m = categoryMeta(r.mapped.category)
              const income = isRealIncome(r.mapped)
              const refund = isRefund(r.mapped)
              const counts = countsTowardTotals(r.mapped)
              return (
                <tr
                  key={r.raw.transaction_id}
                  className={r.suspect ? 'bg-amber-50/50 dark:bg-amber-500/5' : undefined}
                >
                  <td className="py-1.5 pr-3 font-mono text-xs text-slate-400 dark:text-slate-500">
                    {r.raw.date}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                    {r.raw.merchant_name || r.raw.name || '—'}
                    {r.raw.merchant_name && r.raw.name && r.raw.merchant_name !== r.raw.name && (
                      <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                        ({r.raw.name})
                      </span>
                    )}
                    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">
                      {r.item.institution}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                    {money(r.raw.amount)}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {r.raw.personal_finance_category?.primary ?? '—'}
                    {r.raw.personal_finance_category?.detailed && (
                      <span className="block text-slate-400 dark:text-slate-600">
                        {r.raw.personal_finance_category.detailed}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                    {m.emoji} {m.label}
                    {r.overridden && r.autoCategory !== r.mapped.category && (
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                        was {categoryMeta(r.autoCategory).label}
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-1.5 pr-3 text-right font-mono text-xs ${
                      r.mapped.amount < 0
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {money(r.mapped.amount)}
                  </td>
                  <td className="py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {income && (
                        <Badge tone="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          income
                        </Badge>
                      )}
                      {refund && (
                        <Badge tone="bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          refund
                        </Badge>
                      )}
                      {!counts && (
                        <Badge tone="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          excluded
                        </Badge>
                      )}
                      {r.overridden && (
                        <Badge tone="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          override
                        </Badge>
                      )}
                      {r.suspect && (
                        <Badge tone="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          {r.suspectWhy}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
