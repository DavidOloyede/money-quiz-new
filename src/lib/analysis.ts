import type { Category, Transaction } from '../types'
import { isExcludedCategory } from '../types'

export type TimeRange = 'thisMonth' | 'lastMonth' | 'all'

/**
 * Transfers and Zelle move money between your own accounts (or pay off a card)
 * rather than being real spending or income, so they're excluded from every
 * total, the category breakdown, and the trend. They're surfaced on their own
 * via `excludedSummary` instead.
 */
export function countsTowardTotals(t: Transaction): boolean {
  return !isExcludedCategory(t.category)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "YYYY-MM-DD" -> "YYYY-MM" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export function prevMonthKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function isExpense(t: Transaction): boolean {
  return t.amount < 0
}

export function isIncome(t: Transaction): boolean {
  return t.amount > 0
}

/** Filter transactions to a time range relative to `now`. */
export function filterByRange(
  transactions: Transaction[],
  range: TimeRange,
  now: Date = new Date(),
): Transaction[] {
  if (range === 'all') return transactions
  const key = range === 'thisMonth' ? currentMonthKey(now) : prevMonthKey(now)
  return transactions.filter((t) => monthKey(t.date) === key)
}

export function rangeLabel(range: TimeRange): string {
  switch (range) {
    case 'thisMonth':
      return 'this month'
    case 'lastMonth':
      return 'last month'
    case 'all':
      return 'all time'
  }
}

export function totalSpending(transactions: Transaction[]): number {
  return transactions.reduce(
    (sum, t) => (t.amount < 0 && countsTowardTotals(t) ? sum - t.amount : sum),
    0,
  )
}

export function totalIncome(transactions: Transaction[]): number {
  return transactions.reduce(
    (sum, t) => (t.amount > 0 && countsTowardTotals(t) ? sum + t.amount : sum),
    0,
  )
}

export function netTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => (countsTowardTotals(t) ? sum + t.amount : sum), 0)
}

export interface CategoryTotal {
  category: Category
  total: number
  count: number
}

/** Spending (expenses only) grouped by category, sorted high to low. */
export function spendingByCategory(transactions: Transaction[]): CategoryTotal[] {
  const map = new Map<Category, { total: number; count: number }>()
  for (const t of transactions) {
    if (t.amount >= 0 || !countsTowardTotals(t)) continue
    const entry = map.get(t.category) ?? { total: 0, count: 0 }
    entry.total += -t.amount
    entry.count += 1
    map.set(t.category, entry)
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
}

export interface ExpenseItem {
  id: string
  description: string
  amount: number // positive magnitude
  date: string
  category: Category
}

/** Largest individual expenses, biggest first. */
export function topExpenses(transactions: Transaction[], n = 5): ExpenseItem[] {
  return transactions
    .filter((t) => t.amount < 0 && countsTowardTotals(t))
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: -t.amount,
      date: t.date,
      category: t.category,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
}

export interface MonthlyPoint {
  monthKey: string
  spending: number
  income: number
  net: number
}

/** Per-month spending/income/net, oldest month first. */
export function monthlyTrend(transactions: Transaction[]): MonthlyPoint[] {
  const map = new Map<string, { spending: number; income: number }>()
  for (const t of transactions) {
    if (!countsTowardTotals(t)) continue
    const k = monthKey(t.date)
    const entry = map.get(k) ?? { spending: 0, income: 0 }
    if (t.amount < 0) entry.spending += -t.amount
    else entry.income += t.amount
    map.set(k, entry)
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      monthKey: k,
      spending: v.spending,
      income: v.income,
      net: v.income - v.spending,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

function utcTime(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

/** Inclusive day span between the earliest and latest transaction. */
export function spanDays(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0
  let min = Infinity
  let max = -Infinity
  for (const t of transactions) {
    const ms = utcTime(t.date)
    if (ms < min) min = ms
    if (ms > max) max = ms
  }
  return Math.round((max - min) / 86_400_000) + 1
}

export function avgDailySpend(transactions: Transaction[]): number {
  const days = Math.max(1, spanDays(transactions))
  return totalSpending(transactions) / days
}

export interface MerchantStat {
  merchant: string
  count: number
  total: number
}

/** Expense merchants by visit count (then spend), most frequent first. */
export function merchantStats(transactions: Transaction[]): MerchantStat[] {
  const map = new Map<string, { count: number; total: number }>()
  for (const t of transactions) {
    if (t.amount >= 0 || !countsTowardTotals(t)) continue
    const name = t.description.trim()
    const entry = map.get(name) ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += -t.amount
    map.set(name, entry)
  }
  return [...map.entries()]
    .map(([merchant, v]) => ({ merchant, count: v.count, total: v.total }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
}

export interface HeadlineStats {
  totalIncome: number
  totalSpending: number
  net: number
  count: number
  avgDailySpend: number
  biggestCategory: CategoryTotal | null
  largestExpense: ExpenseItem | null
}

export function headlineStats(transactions: Transaction[]): HeadlineStats {
  const cats = spendingByCategory(transactions)
  const top = topExpenses(transactions, 1)
  return {
    totalIncome: totalIncome(transactions),
    totalSpending: totalSpending(transactions),
    net: netTotal(transactions),
    count: transactions.length,
    avgDailySpend: avgDailySpend(transactions),
    biggestCategory: cats[0] ?? null,
    largestExpense: top[0] ?? null,
  }
}

/** Sorted ascending list of month keys present in the data. */
export function monthsPresent(transactions: Transaction[]): string[] {
  const set = new Set(transactions.map((t) => monthKey(t.date)))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export interface ExcludedTotal {
  category: Category
  out: number
  in: number
  count: number
}

/**
 * Per-category in/out totals for the categories excluded from spending
 * (transfers, Zelle), so they can be shown on their own. Largest activity first.
 */
export function excludedSummary(transactions: Transaction[]): ExcludedTotal[] {
  const map = new Map<Category, { out: number; in: number; count: number }>()
  for (const t of transactions) {
    if (countsTowardTotals(t)) continue
    const entry = map.get(t.category) ?? { out: 0, in: 0, count: 0 }
    if (t.amount < 0) entry.out += -t.amount
    else entry.in += t.amount
    entry.count += 1
    map.set(t.category, entry)
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, out: v.out, in: v.in, count: v.count }))
    .sort((a, b) => b.out + b.in - (a.out + a.in))
}
