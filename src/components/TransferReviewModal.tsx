import { useMemo, useState } from 'react'
import type { Category } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { transferReviewGroups } from '@moneyquiz/core/lib/transferReview'
import { allCategories, categoryLabel } from '@moneyquiz/core/lib/categories'
import { displayDescription } from '@moneyquiz/core/lib/merchant'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { CheckIcon, XIcon } from './icons'

/**
 * The queue of transfers that still need a human decision — what's left after
 * the ones the user made to themselves are filtered out by their owner names.
 *
 * Grouped by counterparty, because the decision is nearly always about the
 * person, not the row: "everything from my brother is a gift", "Diamond
 * Electric is a home expense". Each decision can be remembered for that
 * counterparty's future transfers, which is what stops the queue refilling
 * after every import.
 */
export function TransferReviewModal({ onClose }: { onClose: () => void }) {
  const { transactions, transferRules, setTransferRule, setTreatment, setCategoryBulk, aliases } =
    useStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [remember, setRemember] = useState(true)

  const groups = useMemo(
    () => transferReviewGroups(transactions, transferRules),
    [transactions, transferRules],
  )

  const rowsOf = (ids: string[]) => transactions.filter((t) => ids.includes(t.id))

  /** Apply a decision to a counterparty's rows, and optionally to their future ones. */
  const decide = (
    group: (typeof groups)[number],
    decision: { category?: Category; treatment?: 'internal' | 'reimbursement' },
  ) => {
    if (decision.treatment) setTreatment(group.ids, decision.treatment, decision.category)
    else if (decision.category) setCategoryBulk(group.ids, decision.category)
    if (remember) {
      setTransferRule(group.key, { ...decision, reviewed: true, decidedAt: new Date().toISOString() })
    } else if (!decision.category && !decision.treatment) {
      // "Leave as is" only makes sense as a remembered rule — otherwise the
      // group would reappear the moment the list recomputes.
      setTransferRule(group.key, { reviewed: true, decidedAt: new Date().toISOString() })
    }
    setExpanded(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-linen-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-cream dark:bg-linen-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-linen-100 dark:border-linen-800 p-5">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">
              Review transfers
            </h3>
            <p className="mt-0.5 text-sm text-linen-500 dark:text-linen-400">
              {groups.length === 0
                ? 'Nothing left to review.'
                : `${groups.reduce((n, g) => n + g.count, 0)} transfers with ${groups.length} ${
                    groups.length === 1 ? 'person or business' : 'people and businesses'
                  }. Transfers to yourself are already hidden.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-linen-100 dark:hover:bg-linen-800"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-linen-300 dark:border-linen-600 p-8 text-center">
              <p className="text-sm text-linen-500 dark:text-linen-400">
                Every transfer has been accounted for. New ones will show up here after your
                next import.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li
                  key={g.key}
                  className="rounded-lg border border-linen-200 dark:border-linen-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(expanded === g.key ? null : g.key)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-linen-50 dark:hover:bg-linen-800"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-linen-700 dark:text-linen-200">
                        {g.label}
                      </span>
                      <span className="block text-xs text-linen-500 dark:text-linen-400 tabular-nums">
                        {g.count} transfer{g.count === 1 ? '' : 's'} · last {formatDate(g.lastDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      {g.moneyIn > 0 && (
                        <span className="block text-forest-600">
                          {formatCurrency(g.moneyIn)} in
                        </span>
                      )}
                      {g.moneyOut > 0 && (
                        <span className="block text-linen-600 dark:text-linen-300">
                          {formatCurrency(g.moneyOut)} out
                        </span>
                      )}
                    </span>
                  </button>

                  {expanded === g.key && (
                    <div className="border-t border-linen-100 dark:border-linen-800 bg-linen-50/60 dark:bg-linen-800/40 p-3">
                      <ul className="mb-3 max-h-40 space-y-1 overflow-auto">
                        {rowsOf(g.ids).map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-2 text-xs text-linen-600 dark:text-linen-300"
                          >
                            <span className="w-20 shrink-0 tabular-nums">{formatDate(t.date)}</span>
                            <span className="min-w-0 flex-1 truncate">
                              {displayDescription(t.description, aliases)}
                            </span>
                            <span
                              className={`shrink-0 tabular-nums ${
                                t.amount > 0 ? 'text-forest-600' : ''
                              }`}
                            >
                              {formatCurrency(t.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex flex-wrap items-center gap-2">
                        {g.moneyIn > 0 && (
                          <button
                            onClick={() => decide(g, { category: 'income' })}
                            className="rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-cream dark:hover:bg-linen-800"
                          >
                            Income
                          </button>
                        )}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) decide(g, { category: e.target.value as Category })
                          }}
                          className="rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-xs text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                        >
                          <option value="">Expense — pick a category…</option>
                          {allCategories()
                            .filter((d) => d.kind === 'spending')
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.label}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => decide(g, { treatment: 'reimbursement' })}
                          className="rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-cream dark:hover:bg-linen-800"
                        >
                          Reimbursement
                        </button>
                        <button
                          onClick={() => decide(g, { treatment: 'internal' })}
                          className="rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-cream dark:hover:bg-linen-800"
                        >
                          Internal / ignore
                        </button>
                        <button
                          onClick={() => decide(g, {})}
                          title={`Keep these in ${categoryLabel('zelle')} and stop showing them`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-linen-500 underline-offset-2 hover:underline dark:text-linen-400"
                        >
                          Leave as is
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linen-100 dark:border-linen-800 p-4">
          <label className="flex items-center gap-2 text-sm text-linen-600 dark:text-linen-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-linen-300 text-forest-600 focus:ring-forest-500"
            />
            Apply to future imports from the same person
          </label>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
          >
            <CheckIcon className="h-4 w-4" /> Done
          </button>
        </div>
      </div>
    </div>
  )
}
