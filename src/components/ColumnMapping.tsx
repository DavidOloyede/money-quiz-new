import { useMemo, useState } from 'react'
import type { AccountType, AmountMode, ColumnMapping, CsvRow } from '../types'
import { CATEGORY_META } from '../types'
import {
  guessAccountType,
  guessMapping,
  mappingFitsHeaders,
  rowsToTransactions,
} from '../lib/importCsv'
import { formatCurrency, formatDate } from '../lib/format'

interface Props {
  headers: string[]
  rows: CsvRow[]
  initial?: ColumnMapping | null
  onConfirm: (m: ColumnMapping) => void
  onCancel: () => void
}

function ColumnSelect({
  value,
  onChange,
  headers,
  allowNone,
}: {
  value: string | undefined
  onChange: (v: string) => void
  headers: string[]
  allowNone?: boolean
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      <option value="">{allowNone ? '— none —' : '— select column —'}</option>
      {headers.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

export function ColumnMapping({ headers, rows, initial, onConfirm, onCancel }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    if (initial && mappingFitsHeaders(initial, headers)) return initial
    return { ...guessMapping(headers), accountType: guessAccountType(headers, rows) }
  })

  const update = (patch: Partial<ColumnMapping>) =>
    setMapping((m) => ({ ...m, ...patch }))

  const previewRows = useMemo(() => rows.slice(0, 5), [rows])
  const preview = useMemo(
    () => rowsToTransactions(previewRows, mapping),
    [previewRows, mapping],
  )
  const full = useMemo(() => rowsToTransactions(rows, mapping), [rows, mapping])

  const valid = full.transactions.length > 0
  const usedRemembered = !!initial && mappingFitsHeaders(initial, headers)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">Match your columns</h3>
          <p className="text-sm text-slate-500">
            Tell us which column is which. We&apos;ll remember this for next time.
          </p>
        </div>
        {usedRemembered && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Using your saved mapping
          </span>
        )}
      </div>

      <div className="mt-5">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          What kind of account is this?
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'bank', label: 'Bank / checking' },
              { id: 'credit', label: 'Credit card' },
            ] as { id: AccountType; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => update({ accountType: opt.id })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                (mapping.accountType ?? 'bank') === opt.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(mapping.accountType ?? 'bank') === 'credit' && (
          <p className="mt-1.5 text-xs text-slate-500">
            Card <span className="font-medium">payments</span> will be removed — they&apos;re
            already counted as money leaving your checking account. Purchases and refunds are kept.
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date column">
          <ColumnSelect
            value={mapping.date}
            onChange={(v) => update({ date: v })}
            headers={headers}
          />
        </Field>
        <Field label="Description / merchant column">
          <ColumnSelect
            value={mapping.description}
            onChange={(v) => update({ description: v })}
            headers={headers}
          />
        </Field>
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          How are amounts stored?
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'single', label: 'One signed column' },
              { id: 'debitCredit', label: 'Separate debit & credit' },
            ] as { id: AmountMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => update({ amountMode: opt.id })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                mapping.amountMode === opt.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mapping.amountMode === 'single' ? (
          <>
            <Field label="Amount column">
              <ColumnSelect
                value={mapping.amount}
                onChange={(v) => update({ amount: v })}
                headers={headers}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={mapping.invertAmount ?? false}
                onChange={(e) => update({ invertAmount: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Positive numbers are expenses (flip the sign)
            </label>
          </>
        ) : (
          <>
            <Field label="Debit (money out) column">
              <ColumnSelect
                value={mapping.debit}
                onChange={(v) => update({ debit: v })}
                headers={headers}
                allowNone
              />
            </Field>
            <Field label="Credit (money in) column">
              <ColumnSelect
                value={mapping.credit}
                onChange={(v) => update({ credit: v })}
                headers={headers}
                allowNone
              />
            </Field>
          </>
        )}
        <Field label="Category column (optional)">
          <ColumnSelect
            value={mapping.category}
            onChange={(v) => update({ category: v || undefined })}
            headers={headers}
            allowNone
          />
        </Field>
      </div>

      {/* Preview */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Preview
          </span>
          <span className="text-xs text-slate-500">
            {full.transactions.length} of {full.total} rows will import
            {full.droppedPayments > 0 && (
              <span className="text-sky-600"> · {full.droppedPayments} card payment{full.droppedPayments === 1 ? '' : 's'} removed</span>
            )}
            {full.skipped > 0 && (
              <span className="text-amber-600"> · {full.skipped} skipped</span>
            )}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{t.description}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {CATEGORY_META[t.category].emoji} {CATEGORY_META[t.category].label}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                      t.amount < 0 ? 'text-slate-700' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
              {preview.transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                    No rows could be parsed with this mapping yet — check your column
                    choices above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={!valid}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import {full.transactions.length} transactions
        </button>
      </div>
    </div>
  )
}
