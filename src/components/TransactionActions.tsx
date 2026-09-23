import { useMemo, useState } from 'react'
import type { Category, Transaction, TxTreatment } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { linkCandidates } from '@moneyquiz/core/lib/links'
import { allCategories, categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { displayDescription } from '@moneyquiz/core/lib/merchant'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { CheckIcon, LinkIcon, XIcon } from './icons'

/**
 * The per-transaction actions that don't fit in a table cell: how a row should
 * be counted, and what other row it offsets.
 *
 * It's a modal rather than a popover because the link picker needs room for a
 * searchable list, and because the same sheet is opened from the table and
 * from both drill-in modals — one mounted thing, one place to fix.
 */
export function useTransactionActions() {
  const [openId, setOpenId] = useState<string | null>(null)
  const node = openId ? <ActionsModal id={openId} onClose={() => setOpenId(null)} /> : null
  return { open: setOpenId, node }
}

const TREATMENTS: { value: TxTreatment; label: string; hint: string }[] = [
  { value: 'normal', label: 'Normal', hint: 'Counts as spending or income, as usual.' },
  {
    value: 'reimbursement',
    label: 'Reimbursement',
    hint: "Someone paid you back. Reduces what you spent instead of counting as income.",
  },
  {
    value: 'internal',
    label: 'Internal transfer',
    hint: 'Money between your own accounts. Kept out of every total.',
  },
]

function ActionsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { transactions, aliases, setTreatment, linkTransaction, unlinkTransaction } = useStore()
  const t = transactions.find((x) => x.id === id)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [anyAmount, setAnyAmount] = useState(false)
  const [offset, setOffset] = useState<Category | ''>('')

  const partner = useMemo(
    () => (t?.linkedTo ? transactions.find((x) => x.key === t.linkedTo) : undefined),
    [transactions, t?.linkedTo],
  )
  const children = useMemo(
    () => (t?.linkedFrom ? transactions.filter((x) => x.key && t.linkedFrom?.includes(x.key)) : []),
    [transactions, t?.linkedFrom],
  )
  const candidates = useMemo(
    () => (t ? linkCandidates(transactions, t, { anyAmount, query }) : []),
    [transactions, t, anyAmount, query],
  )

  if (!t) return null
  const treatment = t.treatment ?? 'normal'

  const choose = (next: TxTreatment) => {
    setTreatment([t.id], next, next === 'reimbursement' && offset ? offset : undefined)
    if (next !== 'reimbursement') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-linen-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-cream dark:bg-linen-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-linen-100 dark:border-linen-800 p-5">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">
              {displayDescription(t.description, aliases)}
            </h3>
            <p className="mt-0.5 text-sm text-linen-500 dark:text-linen-400 tabular-nums">
              {formatDate(t.date)} · {formatCurrency(t.amount)} · {categoryLabel(t.category)}
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
          <h4 className="text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
            How it counts
          </h4>
          <div className="mt-2 space-y-1.5">
            {TREATMENTS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                  treatment === opt.value
                    ? 'border-forest-400 bg-forest-50 dark:border-forest-500/50 dark:bg-forest-500/10'
                    : 'border-linen-200 dark:border-linen-700 hover:bg-linen-50 dark:hover:bg-linen-800'
                }`}
              >
                <input
                  type="radio"
                  name="treatment"
                  checked={treatment === opt.value}
                  onChange={() => choose(opt.value)}
                  className="mt-0.5 h-4 w-4 border-linen-300 text-forest-600 focus:ring-forest-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-linen-700 dark:text-linen-200">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-linen-500 dark:text-linen-400">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {treatment === 'reimbursement' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-linen-50 dark:bg-linen-800/50 p-3">
              <span className="text-sm text-linen-600 dark:text-linen-300">Offsets spending in</span>
              <select
                value={offset || t.category}
                onChange={(e) => {
                  const next = e.target.value as Category
                  setOffset(next)
                  setTreatment([t.id], 'reimbursement', next)
                }}
                className="rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
              >
                {allCategories()
                  .filter((d) => d.kind === 'spending')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <h4 className="mt-6 text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
            Linked transaction
          </h4>

          {partner ? (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-linen-200 dark:border-linen-700 p-3">
              <LinkIcon className="h-4 w-4 shrink-0 text-forest-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-linen-700 dark:text-linen-200">
                  {displayDescription(partner.description, aliases)}
                </div>
                <div className="text-xs text-linen-500 dark:text-linen-400 tabular-nums">
                  {formatDate(partner.date)} · {formatCurrency(partner.amount)} · offsets this
                </div>
              </div>
              <button
                onClick={() => unlinkTransaction(t.id)}
                className="shrink-0 rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800"
              >
                Unlink
              </button>
            </div>
          ) : children.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {children.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-linen-200 dark:border-linen-700 p-3"
                >
                  <LinkIcon className="h-4 w-4 shrink-0 text-forest-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-linen-700 dark:text-linen-200">
                      {displayDescription(c.description, aliases)}
                    </div>
                    <div className="text-xs text-linen-500 dark:text-linen-400 tabular-nums">
                      {formatDate(c.date)} · {formatCurrency(c.amount)} · offsets this charge
                    </div>
                  </div>
                  <button
                    onClick={() => unlinkTransaction(c.id)}
                    className="shrink-0 rounded-lg border border-linen-300 dark:border-linen-600 px-2.5 py-1.5 text-xs font-medium text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800"
                  >
                    Unlink
                  </button>
                </li>
              ))}
            </ul>
          ) : !picking ? (
            <div className="mt-2 rounded-lg border border-dashed border-linen-300 dark:border-linen-600 p-4 text-center">
              <p className="text-sm text-linen-500 dark:text-linen-400">
                {t.amount > 0
                  ? 'Link this to the charge it refunds, so the pair cancels out.'
                  : 'Link a refund or repayment to this charge to reduce what it cost you.'}
              </p>
              <button
                onClick={() => setPicking(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700"
              >
                <LinkIcon className="h-4 w-4" /> Find a match
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search description…"
                  className="min-w-0 flex-1 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-3 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                />
                <label className="flex items-center gap-1.5 text-xs text-linen-600 dark:text-linen-300">
                  <input
                    type="checkbox"
                    checked={anyAmount}
                    onChange={(e) => setAnyAmount(e.target.checked)}
                    className="h-4 w-4 rounded border-linen-300 text-forest-600 focus:ring-forest-500"
                  />
                  Any amount
                </label>
              </div>
              <p className="mt-1.5 text-xs text-linen-400 dark:text-linen-500">
                {anyAmount
                  ? 'Showing every opposite charge — use this for a partial repayment.'
                  : `Showing charges of exactly ${formatCurrency(Math.abs(t.amount))}.`}
              </p>
              <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        // The credit always points at the charge it offsets.
                        if (t.amount > 0) linkTransaction(t.id, c.id)
                        else linkTransaction(c.id, t.id)
                        setPicking(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-linen-200 dark:border-linen-700 p-2.5 text-left hover:border-forest-400 hover:bg-forest-50 dark:hover:bg-forest-500/10"
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs"
                        style={{ background: `${categoryMeta(c.category).color}1a` }}
                        aria-hidden
                      >
                        {categoryMeta(c.category).emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-linen-700 dark:text-linen-200">
                          {displayDescription(c.description, aliases)}
                        </span>
                        <span className="block text-xs text-linen-500 dark:text-linen-400 tabular-nums">
                          {formatDate(c.date)} · {formatCurrency(c.amount)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {candidates.length === 0 && (
                  <li className="rounded-lg border border-dashed border-linen-300 dark:border-linen-600 p-4 text-center text-sm text-linen-400 dark:text-linen-500">
                    Nothing matches. Try “Any amount”.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-linen-100 dark:border-linen-800 p-4">
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

/** The small marks a row carries when it's been linked or re-treated. */
export function TransactionMarks({ t }: { t: Transaction }) {
  return (
    <>
      {t.treatment === 'reimbursement' && (
        <span className="rounded bg-forest-100 dark:bg-forest-500/20 px-1.5 py-0.5 text-[10px] font-medium text-forest-700 dark:text-forest-300">
          reimbursed
        </span>
      )}
      {t.treatment === 'internal' && (
        <span className="rounded bg-linen-100 dark:bg-linen-700/40 px-1.5 py-0.5 text-[10px] font-medium text-linen-500 dark:text-linen-300">
          internal
        </span>
      )}
      {(t.linkedTo || t.linkedFrom) && (
        <span
          className="inline-flex items-center gap-0.5 rounded bg-forest-50 dark:bg-forest-500/15 px-1.5 py-0.5 text-[10px] font-medium text-forest-700 dark:text-forest-300"
          title={t.linkedTo ? 'Offsets another charge' : 'Offset by a linked credit'}
        >
          <LinkIcon className="h-2.5 w-2.5" />
          {t.linkedFrom ? t.linkedFrom.length : 1}
        </span>
      )}
    </>
  )
}
