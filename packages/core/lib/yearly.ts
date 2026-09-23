/**
 * Builds the data behind the Year Sheet view — a spreadsheet-style grid of one
 * full year: income and expenses per category per month, grouped into sections
 * (Daily Living, Home, …) with per-month totals, a NET row, and a projected
 * running balance.
 *
 * Months up to "now" show actuals; later months are *projected* — a category's
 * monthly budget if one is set, otherwise its average over the elapsed months —
 * so the sheet always sketches the whole year, like the Google-Sheets budget
 * it's modeled on.
 */
import type { Budgets, Category, Transaction } from '../types'
import { countsTowardTotals, isRefund } from './analysis'
import { allCategories, categoryDef } from './categories'

export interface SheetCell {
  value: number
  /** True when the number is a projection rather than recorded transactions. */
  projected: boolean
}

export interface SheetRow {
  id: Category
  label: string
  emoji: string
  cells: SheetCell[]
  total: number
  avg: number
}

export interface SheetSection {
  id: string
  title: string
  rows: SheetRow[]
  /** Per-month totals across the section's rows. */
  totals: SheetCell[]
  total: number
  avg: number
}

export interface YearSheet {
  year: number
  /** Index (0-11) of the last month backed by actuals; -1 = whole year projected. */
  lastActualMonth: number
  income: SheetSection
  expenseSections: SheetSection[]
  /** Per-month totals across every expense section. */
  expenseTotals: SheetCell[]
  net: SheetCell[]
  /** Whether any cell anywhere is a projection (drives the legend). */
  hasProjections: boolean
}

/** Years that have at least one transaction, ascending. */
export function yearsPresent(transactions: Transaction[]): number[] {
  const set = new Set<number>()
  for (const t of transactions) set.add(Number(t.date.slice(0, 4)))
  return [...set].filter((y) => Number.isFinite(y)).sort((a, b) => a - b)
}

/** How built-in expense categories fold into the sheet's sections. */
const EXPENSE_SECTIONS: { id: string; title: string; cats: Category[] }[] = [
  {
    id: 'daily',
    title: 'Daily Living',
    cats: ['groceries', 'dining', 'personal', 'shopping', 'health', 'pets', 'education'],
  },
  { id: 'home', title: 'Home Expenses', cats: ['rent', 'home', 'utilities', 'insurance'] },
  { id: 'transport', title: 'Transportation', cats: ['transport'] },
  { id: 'business', title: 'Business & Rental', cats: ['business'] },
  { id: 'fun', title: 'Subscriptions & Entertainment', cats: ['subscriptions', 'entertainment'] },
  { id: 'giving', title: 'Giving', cats: ['charity', 'tithes'] },
  { id: 'debt', title: 'Debt & Fees', cats: ['loans', 'fees'] },
]

const zeros = () => Array<number>(12).fill(0)

function buildRow(
  id: Category,
  actual: number[],
  firstActual: number,
  lastActual: number,
  budget: number | undefined,
): SheetRow {
  // Run rate over the months the data actually covers — if imports start in
  // April, January–March shouldn't drag the average down.
  const elapsed = lastActual - firstActual + 1
  const actualSum = actual.slice(firstActual, lastActual + 1).reduce((a, b) => a + b, 0)
  const runRate = elapsed > 0 ? actualSum / elapsed : 0
  const expected = budget !== undefined && budget > 0 ? budget : runRate
  const cells: SheetCell[] = actual.map((v, m) =>
    m <= lastActual ? { value: v, projected: false } : { value: expected, projected: true },
  )
  const total = cells.reduce((a, c) => a + c.value, 0)
  const def = categoryDef(id)
  return { id, label: def.label, emoji: def.emoji, cells, total, avg: total / 12 }
}

function sectionFromRows(id: string, title: string, rows: SheetRow[]): SheetSection {
  const totals: SheetCell[] = Array.from({ length: 12 }, (_, m) => ({
    value: rows.reduce((a, r) => a + r.cells[m].value, 0),
    projected: rows.some((r) => r.cells[m].projected),
  }))
  const total = totals.reduce((a, c) => a + c.value, 0)
  return { id, title, rows, totals, total, avg: total / 12 }
}

export function buildYearSheet(
  transactions: Transaction[],
  year: number,
  budgets: Budgets,
  now: Date = new Date(),
): YearSheet {
  // Months after this index are projections. Past years are fully actual;
  // the current year is actual through the in-progress month.
  const lastActualMonth =
    year < now.getFullYear() ? 11 : year > now.getFullYear() ? -1 : now.getMonth()

  const incomeByCat = new Map<Category, number[]>()
  const expenseByCat = new Map<Category, number[]>()
  // Money coming back to you — a card refund, cashback, or someone paying you
  // back — is neither income nor a negative expense, so it's collected apart
  // from both and shown as its own "Refunds & Cashback" row. Deciding that
  // with isRefund() rather than the category's kind is what lets a
  // reimbursement fold in here even when its category couldn't have said so.
  const refundTotals = zeros()
  let hasRefunds = false
  let firstActualMonth = lastActualMonth
  for (const t of transactions) {
    if (Number(t.date.slice(0, 4)) !== year || !countsTowardTotals(t)) continue
    const m = Number(t.date.slice(5, 7)) - 1
    if (m < 0 || m > 11) continue
    if (m < firstActualMonth) firstActualMonth = m
    if (isRefund(t)) {
      hasRefunds = true
      refundTotals[m] += Math.abs(t.amount)
      continue
    }
    const map = t.amount > 0 ? incomeByCat : expenseByCat
    const arr = map.get(t.category) ?? zeros()
    arr[m] += Math.abs(t.amount)
    map.set(t.category, arr)
  }
  firstActualMonth = Math.max(0, firstActualMonth)

  const incomeRows: SheetRow[] = []
  for (const [cat, actual] of incomeByCat) {
    incomeRows.push(buildRow(cat, actual, firstActualMonth, lastActualMonth, undefined))
  }
  if (hasRefunds) {
    incomeRows.push({
      ...buildRow('refunds', refundTotals, firstActualMonth, lastActualMonth, undefined),
      label: 'Refunds & Cashback',
      emoji: '↩️',
    })
  }
  const income = sectionFromRows(
    'income',
    'Income',
    incomeRows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total),
  )

  // Expense rows, foldered into the fixed sections; anything unmatched
  // (the Other category, user-made categories) lands in a trailing section.
  const sectioned = new Set(EXPENSE_SECTIONS.flatMap((s) => s.cats))
  const rowFor = (cat: Category) =>
    buildRow(cat, expenseByCat.get(cat) ?? zeros(), firstActualMonth, lastActualMonth, budgets[cat])
  const expenseSections: SheetSection[] = []
  for (const s of EXPENSE_SECTIONS) {
    const rows = s.cats
      .filter((c) => expenseByCat.has(c) || (budgets[c] ?? 0) > 0)
      .map(rowFor)
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
    if (rows.length > 0) expenseSections.push(sectionFromRows(s.id, s.title, rows))
  }
  const otherCats = allCategories()
    .map((d) => d.id)
    .filter((id) => !sectioned.has(id) && expenseByCat.has(id))
  const otherRows = otherCats
    .map(rowFor)
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
  if (otherRows.length > 0) expenseSections.push(sectionFromRows('other', 'Other', otherRows))

  const expenseTotals: SheetCell[] = Array.from({ length: 12 }, (_, m) => ({
    value: expenseSections.reduce((a, s) => a + s.totals[m].value, 0),
    projected: m > lastActualMonth,
  }))
  const net: SheetCell[] = Array.from({ length: 12 }, (_, m) => ({
    value: income.totals[m].value - expenseTotals[m].value,
    projected: m > lastActualMonth,
  }))

  return {
    year,
    lastActualMonth,
    income,
    expenseSections,
    expenseTotals,
    net,
    hasProjections: lastActualMonth < 11,
  }
}

/** Running balance at the end of each month: starting balance + cumulative net. */
export function endBalances(startingBalance: number, net: SheetCell[]): number[] {
  const out: number[] = []
  let bal = startingBalance
  for (const c of net) {
    bal += c.value
    out.push(bal)
  }
  return out
}
