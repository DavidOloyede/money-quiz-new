import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { buildYearSheet, endBalances, yearsPresent, type SheetCell, type SheetSection } from '../lib/yearly'
import { EmptyState } from './EmptyState'
import { TableIcon } from './icons'
import type { View } from './Nav'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Spreadsheet-style number: blank for zero, parentheses-free negatives. */
function cellText(n: number, blankZero = true): string {
  if (blankZero && Math.abs(n) < 0.005) return ''
  return num.format(n)
}

/**
 * The frozen block at the top of the sheet (header + 4 summary rows) uses
 * fixed row heights so each row can be position:sticky at a known offset:
 * header h-9 (36px), then four h-8 (32px) rows stacked beneath it.
 */
const FROZEN_TOPS = ['top-[36px]', 'top-[68px]', 'top-[100px]', 'top-[132px]']

interface Props {
  onNavigate: (v: View) => void
}

/**
 * The Year Sheet — an Excel-like grid of the whole year, modeled on a classic
 * Google-Sheets budget: month columns, income/expense sections with totals,
 * a NET row, and a projected end-of-month balance line that starts from an
 * editable starting balance. Future months show projected numbers (budgets or
 * monthly averages), styled in italic amber. The header and summary rows stay
 * frozen while scrolling, and a second horizontal scrollbar sits on top so
 * you never have to scroll to the bottom to pan sideways.
 */
export function YearSheetView({ onNavigate }: Props) {
  const { transactions, hasData, loadSample, budgets, startingBalances, setStartingBalance } =
    useStore()

  const years = useMemo(() => yearsPresent(transactions), [transactions])
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(() =>
    years.includes(currentYear) ? currentYear : years[years.length - 1] ?? currentYear,
  )
  const sheet = useMemo(
    () => buildYearSheet(transactions, year, budgets),
    [transactions, year, budgets],
  )
  const startBal = startingBalances[String(year)] ?? 0
  const [balDraft, setBalDraft] = useState<string | null>(null)
  const balances = useMemo(() => endBalances(startBal, sheet.net), [startBal, sheet])

  // Twin horizontal scrollbars: a slim one above the sheet mirrors the main
  // container's scroll position (assigning an equal scrollLeft is a no-op, so
  // the two onScroll handlers can't ping-pong).
  const mainRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  useEffect(() => {
    const measure = () => setScrollWidth(mainRef.current?.scrollWidth ?? 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [sheet, hasData])
  const syncFromMain = () => {
    if (topBarRef.current && mainRef.current) topBarRef.current.scrollLeft = mainRef.current.scrollLeft
  }
  const syncFromTop = () => {
    if (topBarRef.current && mainRef.current) mainRef.current.scrollLeft = topBarRef.current.scrollLeft
  }

  if (!hasData) {
    return (
      <Shell>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <EmptyState
            icon={<TableIcon className="w-7 h-7" />}
            title="No data for a year sheet yet"
            message="Import a CSV of your transactions or load the sample dataset to see your whole year laid out like a spreadsheet."
          >
            <button
              onClick={loadSample}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Load sample data
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Go to Import
            </button>
          </EmptyState>
        </div>
      </Shell>
    )
  }

  const commitBalance = () => {
    if (balDraft === null) return
    const n = parseFloat(balDraft.replace(/[$,\s]/g, ''))
    setStartingBalance(String(year), Number.isFinite(n) ? n : 0)
    setBalDraft(null)
  }

  return (
    <Shell
      action={
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            Starting balance
            <input
              inputMode="decimal"
              value={balDraft ?? (startBal === 0 ? '' : num.format(startBal))}
              placeholder="0.00"
              onChange={(e) => setBalDraft(e.target.value)}
              onBlur={commitBalance}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
            {(years.length > 0 ? years : [currentYear]).map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  year === y
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {sheet.hasProjections && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Months after{' '}
          <span className="font-medium">
            {sheet.lastActualMonth >= 0 ? MONTHS[sheet.lastActualMonth] : 'the start of the year'}
          </span>{' '}
          are <span className="italic text-amber-600 dark:text-amber-400">projected</span> — your
          monthly budget for the category when one is set, otherwise the average of the months so
          far.
        </p>
      )}

      {/* Top horizontal scrollbar (mirrors the sheet's own) */}
      <div
        ref={topBarRef}
        onScroll={syncFromTop}
        className="overflow-x-auto overflow-y-hidden"
        aria-hidden
      >
        <div style={{ width: scrollWidth }} className="h-px" />
      </div>

      <div
        ref={mainRef}
        onScroll={syncFromMain}
        className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      >
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 h-9 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 text-left font-semibold text-slate-500 dark:text-slate-400 w-44">
                {year}
              </th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`sticky top-0 z-20 h-9 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 text-right font-semibold ${
                    i === sheet.lastActualMonth && year === currentYear
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {m}
                </th>
              ))}
              <th className="sticky top-0 z-20 h-9 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 text-right font-bold text-slate-600 dark:text-slate-300">
                TOTAL
              </th>
              <th className="sticky top-0 z-20 h-9 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                AVG
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Frozen summary block, like the top of the sheet */}
            <SummaryRow label="Total Income" cells={sheet.income.totals} positive stickyTop={FROZEN_TOPS[0]} />
            <SummaryRow label="Total Expenses" cells={sheet.expenseTotals} stickyTop={FROZEN_TOPS[1]} />
            <NetRow label="NET (Income − Expenses)" cells={sheet.net} stickyTop={FROZEN_TOPS[2]} />
            <BalanceRow label="Projected End Balance" balances={balances} stickyTop={FROZEN_TOPS[3]} />

            {/* Income section */}
            <SectionHeader title="INCOME" tone="income" />
            {sheet.income.rows.map((r) => (
              <DataRow key={r.id} label={`${r.emoji} ${r.label}`} cells={r.cells} total={r.total} avg={r.avg} />
            ))}
            <TotalRow section={sheet.income} label="Total Income" tone="income" />

            {/* Expense sections */}
            {sheet.expenseSections.map((s) => (
              <SectionRows key={s.id} section={s} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Set monthly budgets on the Dashboard to drive the projections; the starting balance is
        saved per year.
      </p>
    </Shell>
  )
}

function SectionRows({ section }: { section: SheetSection }) {
  return (
    <>
      <SectionHeader title={section.title.toUpperCase()} tone="expense" />
      {section.rows.map((r) => (
        <DataRow key={r.id} label={`${r.emoji} ${r.label}`} cells={r.cells} total={r.total} avg={r.avg} />
      ))}
      <TotalRow section={section} label={`Total ${section.title}`} tone="expense" />
    </>
  )
}

function SectionHeader({ title, tone }: { title: string; tone: 'income' | 'expense' }) {
  const bg =
    tone === 'income'
      ? 'bg-emerald-700 dark:bg-emerald-800'
      : 'bg-sky-800 dark:bg-sky-900'
  return (
    <tr>
      <td className={`sticky left-0 z-10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white ${bg}`}>
        {title}
      </td>
      <td colSpan={14} className={bg} />
    </tr>
  )
}

function Cell({ cell, accent, extra = '' }: { cell: SheetCell; accent?: string; extra?: string }) {
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${extra} ${
        cell.projected
          ? 'italic text-amber-600/90 dark:text-amber-400/80'
          : accent ?? 'text-slate-700 dark:text-slate-200'
      }`}
    >
      {cellText(cell.value)}
    </td>
  )
}

const ROW_BORDER = 'border-t border-slate-100 dark:border-slate-800'

function DataRow({
  label,
  cells,
  total,
  avg,
}: {
  label: string
  cells: SheetCell[]
  total: number
  avg: number
}) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className={`sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap ${ROW_BORDER}`}>
        {label}
      </td>
      {cells.map((c, i) => (
        <Cell key={i} cell={c} extra={ROW_BORDER} />
      ))}
      <td className={`px-2 py-1.5 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100 ${ROW_BORDER}`}>
        {cellText(total)}
      </td>
      <td className={`px-2 py-1.5 text-right tabular-nums text-slate-400 dark:text-slate-500 ${ROW_BORDER}`}>
        {cellText(avg)}
      </td>
    </tr>
  )
}

function TotalRow({
  section,
  label,
  tone,
}: {
  section: SheetSection
  label: string
  tone: 'income' | 'expense'
}) {
  const bg = tone === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-slate-50 dark:bg-slate-800/60'
  const border = 'border-t border-slate-200 dark:border-slate-700'
  return (
    <tr className={bg}>
      <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap ${tone === 'income' ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-slate-50 dark:bg-slate-800'} ${border}`}>
        {label}
      </td>
      {section.totals.map((c, i) => (
        <Cell key={i} cell={c} accent="font-medium text-slate-700 dark:text-slate-200" extra={border} />
      ))}
      <td className={`px-2 py-1.5 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100 ${border}`}>
        {cellText(section.total)}
      </td>
      <td className={`px-2 py-1.5 text-right font-semibold tabular-nums text-slate-500 dark:text-slate-400 ${border}`}>
        {cellText(section.avg)}
      </td>
    </tr>
  )
}

/** A cell in the frozen summary block: sticky at a fixed offset, opaque bg. */
function frozenCls(stickyTop: string, bg: string, firstCol = false): string {
  return `sticky ${stickyTop} ${firstCol ? 'left-0 z-30' : 'z-20'} h-8 ${bg} border-b border-slate-100 dark:border-slate-800`
}

function SummaryRow({
  label,
  cells,
  positive,
  stickyTop,
}: {
  label: string
  cells: SheetCell[]
  positive?: boolean
  stickyTop: string
}) {
  const total = cells.reduce((a, c) => a + c.value, 0)
  const accent = positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
  const bg = 'bg-white dark:bg-slate-900'
  return (
    <tr>
      <td className={`px-3 py-1.5 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200 ${frozenCls(stickyTop, bg, true)}`}>
        {label}
      </td>
      {cells.map((c, i) => (
        <Cell key={i} cell={c} accent={accent} extra={frozenCls(stickyTop, bg)} />
      ))}
      <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${accent} ${frozenCls(stickyTop, bg)}`}>
        {cellText(total)}
      </td>
      <td className={`px-2 py-1.5 text-right tabular-nums text-slate-400 dark:text-slate-500 ${frozenCls(stickyTop, bg)}`}>
        {cellText(total / 12)}
      </td>
    </tr>
  )
}

/** The NET row: green when the month came out ahead, red when it didn't. */
function NetRow({ label, cells, stickyTop }: { label: string; cells: SheetCell[]; stickyTop: string }) {
  const total = cells.reduce((a, c) => a + c.value, 0)
  // Frozen rows overlay scrolling content, so the tints must be opaque.
  const color = (n: number) =>
    n >= 0
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
  return (
    <tr>
      <td className={`px-3 py-1.5 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200 ${frozenCls(stickyTop, 'bg-white dark:bg-slate-900', true)}`}>
        {label}
      </td>
      {cells.map((c, i) => (
        <td
          key={i}
          className={`px-2 py-1.5 text-right tabular-nums font-medium ${frozenCls(stickyTop, color(c.value))} ${
            c.projected ? 'italic' : ''
          }`}
        >
          {cellText(c.value, false)}
        </td>
      ))}
      <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${frozenCls(stickyTop, color(total))}`}>
        {cellText(total, false)}
      </td>
      <td className={`px-2 py-1.5 text-right tabular-nums text-slate-400 dark:text-slate-500 ${frozenCls(stickyTop, 'bg-white dark:bg-slate-900')}`}>
        {cellText(total / 12, false)}
      </td>
    </tr>
  )
}

/** Running end-of-month balance, red once it dips below zero. */
function BalanceRow({
  label,
  balances,
  stickyTop,
}: {
  label: string
  balances: number[]
  stickyTop: string
}) {
  const color = (n: number) =>
    n >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-rose-600 dark:text-rose-400 font-semibold'
  const bg = 'bg-amber-50 dark:bg-slate-900'
  const bottom = 'border-b-2 border-slate-200 dark:border-slate-700'
  return (
    <tr>
      <td className={`px-3 py-1.5 whitespace-nowrap font-semibold text-amber-800 dark:text-amber-300 ${frozenCls(stickyTop, bg, true)} ${bottom}`}>
        {label}
      </td>
      {balances.map((b, i) => (
        <td key={i} className={`px-2 py-1.5 text-right tabular-nums ${color(b)} ${frozenCls(stickyTop, bg)} ${bottom}`}>
          {cellText(b, false)}
        </td>
      ))}
      <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${color(balances[11] ?? 0)} ${frozenCls(stickyTop, bg)} ${bottom}`}>
        {cellText(balances[11] ?? 0, false)}
      </td>
      <td className={`${frozenCls(stickyTop, bg)} ${bottom}`} />
    </tr>
  )
}

function Shell({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Year Sheet</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
