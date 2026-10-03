/**
 * The "match your columns" step of a CSV upload. Every bank writes its export
 * differently, so this screen asks three plain questions in order: where the
 * file came from, which column holds what, and whether the preview looks
 * right. It deliberately says "money out / money in" rather than
 * "debit / credit", because "credit" also means a credit card one question
 * earlier and people read the two as the same thing.
 */
import { useMemo, useState } from 'react'
import type { AccountType, AmountMode, ColumnMapping, CsvRow } from '@moneyquiz/core/types'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import {
  guessAccountType,
  guessMapping,
  mappingFitsHeaders,
  rowsToTransactions,
} from '@moneyquiz/core/lib/importCsv'
import { detectBankFormat } from '@moneyquiz/core/lib/bankFormats'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'

interface Props {
  headers: string[]
  rows: CsvRow[]
  initial?: ColumnMapping | null
  onConfirm: (m: ColumnMapping) => void
  onCancel: () => void
}

/** How many raw rows of the user's own file to show, so they can see what each column holds. */
const FILE_PEEK_ROWS = 3

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
      className="w-full rounded-lg border border-linen-300 dark:border-linen-600 bg-white dark:bg-linen-800 px-3 py-2 text-sm text-linen-800 dark:text-linen-100 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/25"
    >
      <option value="">{allowNone ? 'None' : 'Choose a column'}</option>
      {headers.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  )
}

/** A column picker with its label, a one-line hint, and the value it picked from the first row. */
function Field({
  label,
  hint,
  sample,
  children,
}: {
  label: string
  hint?: string
  sample?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-linen-700 dark:text-linen-200">{label}</span>
      {hint && <span className="mb-1.5 block text-xs text-linen-500 dark:text-linen-400">{hint}</span>}
      {!hint && <span className="mb-1.5 block" />}
      {children}
      <span className="mt-1 block min-h-[1rem] truncate text-xs text-linen-400 dark:text-linen-500">
        {sample ? (
          <>
            First row: <span className="font-medium text-linen-600 dark:text-linen-300">{sample}</span>
          </>
        ) : null}
      </span>
    </label>
  )
}

function StepHeading({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-600 text-xs font-semibold text-white">
        {n}
      </span>
      <div>
        <h4 className="font-rounded text-[17px] font-extrabold text-linen-800 dark:text-linen-100">{title}</h4>
        {sub && <p className="text-sm text-linen-500 dark:text-linen-400">{sub}</p>}
      </div>
    </div>
  )
}

/** A two-way choice drawn as cards, each with a title and a plain-words example. */
function ChoiceCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; title: string; hint: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              active
                ? 'border-forest-500 bg-forest-50 dark:bg-forest-500/10 ring-1 ring-forest-500'
                : 'border-linen-300 dark:border-linen-600 hover:bg-linen-50 dark:hover:bg-linen-800'
            }`}
          >
            <span
              className={`block text-sm font-semibold ${
                active ? 'text-forest-700 dark:text-forest-300' : 'text-linen-800 dark:text-linen-100'
              }`}
            >
              {opt.title}
            </span>
            <span className="mt-0.5 block text-xs text-linen-500 dark:text-linen-400">{opt.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ColumnMapping({ headers, rows, initial, onConfirm, onCancel }: Props) {
  const usedRemembered = !!initial && mappingFitsHeaders(initial, headers)
  // A known bank layout knows things the headers can't say, like Amex writing
  // purchases as positive numbers. The user's own saved mapping still wins.
  const detected = useMemo(() => (usedRemembered ? null : detectBankFormat(headers)), [usedRemembered, headers])
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    if (usedRemembered && initial) return initial
    if (detected) return detected.mapping
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
  const accountType = mapping.accountType ?? 'bank'
  const firstRow = rows[0]
  const sampleOf = (col: string | undefined) => (col && firstRow ? firstRow[col]?.trim() || undefined : undefined)

  // Tags the user's raw columns with the role they're mapped to, so the
  // "your file" peek shows at a glance which column feeds what.
  const roleOf = useMemo(() => {
    const roles = new Map<string, string>()
    const tag = (col: string | undefined, role: string) => {
      if (col) roles.set(col, roles.has(col) ? `${roles.get(col)} + ${role}` : role)
    }
    tag(mapping.date, 'Date')
    tag(mapping.description, 'Description')
    if (mapping.amountMode === 'single') tag(mapping.amount, 'Amount')
    else {
      tag(mapping.debit, 'Money out')
      tag(mapping.credit, 'Money in')
    }
    tag(mapping.category, 'Category')
    return roles
  }, [mapping])

  const peekRows = rows.slice(0, FILE_PEEK_ROWS)

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-rounded text-[17px] font-extrabold text-linen-800 dark:text-linen-100">Match your columns</h3>
          <p className="text-sm text-linen-500 dark:text-linen-400">
            Three quick checks. We&apos;ll remember your answers for this bank next time.
          </p>
        </div>
        {usedRemembered && (
          <span className="rounded-full bg-forest-50 dark:bg-forest-500/10 px-2.5 py-1 text-xs font-medium text-forest-700 dark:text-forest-300">
            Using your saved answers
          </span>
        )}
        {detected && (
          <span className="rounded-full bg-forest-50 dark:bg-forest-500/10 px-2.5 py-1 text-xs font-medium text-forest-700 dark:text-forest-300">
            Recognised: {detected.format.label}
          </span>
        )}
      </div>

      {/* Step 1: where the file came from */}
      <section className="mt-6">
        <StepHeading n={1} title="Where is this file from?" />
        <ChoiceCards<AccountType>
          value={accountType}
          onChange={(v) => update({ accountType: v })}
          options={[
            {
              id: 'bank',
              title: 'Checking or savings account',
              hint: 'Where your paycheck lands and your bills are paid from.',
            },
            {
              id: 'credit',
              title: 'Credit card',
              hint: 'Purchases you pay off later with a card payment.',
            },
          ]}
        />
        {accountType === 'credit' && (
          <p className="mt-2 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
            We&apos;ll leave out your <span className="font-medium">card payments</span>, since that money
            already shows up leaving your checking account. Purchases and refunds are kept.
          </p>
        )}
      </section>

      {/* Step 2: which column is which */}
      <section className="mt-7">
        <StepHeading
          n={2}
          title="Which column is which?"
          sub="Here are the first rows of your file. Pick the column that holds each thing."
        />

        <div className="overflow-x-auto rounded-lg border border-linen-200 dark:border-linen-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-linen-50 dark:bg-linen-800/50 text-left">
                {headers.map((h) => {
                  const role = roleOf.get(h)
                  return (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-3 py-2 align-bottom font-medium ${
                        role ? 'bg-forest-50 dark:bg-forest-500/10' : ''
                      }`}
                    >
                      <span
                        className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          role
                            ? 'bg-forest-600 text-white'
                            : 'bg-linen-200/70 dark:bg-linen-700 text-linen-500 dark:text-linen-400'
                        }`}
                      >
                        {role ?? 'Not used'}
                      </span>
                      <span className="block text-linen-700 dark:text-linen-200">{h}</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-linen-100 dark:divide-linen-800">
              {peekRows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={`max-w-[14rem] truncate whitespace-nowrap px-3 py-1.5 ${
                        roleOf.has(h)
                          ? 'bg-forest-50/60 dark:bg-forest-500/5 text-linen-700 dark:text-linen-200'
                          : 'text-linen-400 dark:text-linen-500'
                      }`}
                    >
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" hint="When the purchase happened." sample={sampleOf(mapping.date)}>
            <ColumnSelect value={mapping.date} onChange={(v) => update({ date: v })} headers={headers} />
          </Field>
          <Field
            label="Description"
            hint="The store or payee, like “STARBUCKS #1234”."
            sample={sampleOf(mapping.description)}
          >
            <ColumnSelect
              value={mapping.description}
              onChange={(v) => update({ description: v })}
              headers={headers}
            />
          </Field>
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block text-sm font-medium text-linen-700 dark:text-linen-200">
            How does your file show amounts?
          </span>
          <ChoiceCards<AmountMode>
            value={mapping.amountMode}
            onChange={(v) => update({ amountMode: v })}
            options={[
              {
                id: 'single',
                title: 'One amount column',
                hint: 'Spending and deposits share a column, like -42.10 and 1,500.00.',
              },
              {
                id: 'debitCredit',
                title: 'Two columns: money out and money in',
                hint: 'Often named Debit and Credit, or Withdrawal and Deposit.',
              },
            ]}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mapping.amountMode === 'single' ? (
            <>
              <Field label="Amount" sample={sampleOf(mapping.amount)}>
                <ColumnSelect value={mapping.amount} onChange={(v) => update({ amount: v })} headers={headers} />
              </Field>
              <label className="flex items-start gap-2 self-center rounded-lg border border-linen-200 dark:border-linen-700 px-3 py-2.5 text-sm text-linen-700 dark:text-linen-200">
                <input
                  type="checkbox"
                  checked={mapping.invertAmount ?? false}
                  onChange={(e) => update({ invertAmount: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-linen-300 dark:border-linen-600 text-forest-600 focus:ring-forest-500"
                />
                <span>
                  My file shows spending as positive numbers
                  <span className="block text-xs text-linen-500 dark:text-linen-400">
                    Tick this if your purchases show up as money in below.
                  </span>
                </span>
              </label>
            </>
          ) : (
            <>
              <Field
                label="Money out"
                hint="Purchases and bills. Often called Debit or Withdrawal."
                sample={sampleOf(mapping.debit)}
              >
                <ColumnSelect
                  value={mapping.debit}
                  onChange={(v) => update({ debit: v })}
                  headers={headers}
                  allowNone
                />
              </Field>
              <Field
                label="Money in"
                hint="Paychecks and refunds. Often called Credit or Deposit."
                sample={sampleOf(mapping.credit)}
              >
                <ColumnSelect
                  value={mapping.credit}
                  onChange={(v) => update({ credit: v })}
                  headers={headers}
                  allowNone
                />
              </Field>
            </>
          )}
          <Field
            label="Category (optional)"
            hint="Leave as None and we'll sort every purchase for you."
            sample={sampleOf(mapping.category)}
          >
            <ColumnSelect
              value={mapping.category}
              onChange={(v) => update({ category: v || undefined })}
              headers={headers}
              allowNone
            />
          </Field>
        </div>
      </section>

      {/* Step 3: check the preview */}
      <section className="mt-7">
        <StepHeading
          n={3}
          title="Does this look right?"
          sub="This is how your first rows will look in Manna Money. Purchases should say “out”, paychecks and refunds “in”."
        />
        <div className="mb-2 text-xs text-linen-500 dark:text-linen-400">
          {full.transactions.length} of {full.total} rows will import
          {full.droppedPayments > 0 && (
            <span className="text-sky-600">
              {' '}
              · {full.droppedPayments} card payment{full.droppedPayments === 1 ? '' : 's'} left out
            </span>
          )}
          {full.skipped > 0 && (
            <span className="text-honey-600"> · {full.skipped} couldn&apos;t be read</span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-linen-100 dark:border-linen-800">
          <table className="w-full text-sm">
            <thead className="bg-linen-50 dark:bg-linen-800/50 text-left text-xs uppercase tracking-wide text-linen-400 dark:text-linen-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linen-100 dark:divide-linen-800">
              {preview.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-linen-500 dark:text-linen-400">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-3 py-2 text-linen-700 dark:text-linen-200">{t.description}</td>
                  <td className="px-3 py-2 text-linen-600 dark:text-linen-300">
                    {categoryMeta(t.category).emoji} {categoryMeta(t.category).label}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    <span className={t.amount < 0 ? 'text-linen-700 dark:text-linen-200' : 'text-forest-600'}>
                      {formatCurrency(t.amount)}
                    </span>
                    <span
                      className={`ml-2 inline-block w-8 rounded-full py-0.5 text-center text-[10px] font-semibold uppercase ${
                        t.amount < 0
                          ? 'bg-linen-100 dark:bg-linen-800 text-linen-500 dark:text-linen-400'
                          : 'bg-forest-50 dark:bg-forest-500/10 text-forest-700 dark:text-forest-300'
                      }`}
                    >
                      {t.amount < 0 ? 'out' : 'in'}
                    </span>
                  </td>
                </tr>
              ))}
              {preview.transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-linen-400 dark:text-linen-500">
                    Nothing to show yet. Pick the Date, Description and Amount columns above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="btn-secondary px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={!valid}
          className="btn-primary px-4 py-2 text-sm"
        >
          Import {full.transactions.length} transactions
        </button>
      </div>
    </div>
  )
}
