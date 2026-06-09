import type { Category, Transaction } from '../types'
import { isExcludedCategory } from './categories'
import { merchantKey, merchantLabel } from './merchant'

export type TimeRange = 'thisMonth' | 'lastMonth' | 'thisYear'

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
  if (range === 'thisYear') {
    const year = String(now.getFullYear())
    return transactions.filter((t) => t.date.slice(0, 4) === year)
  }
  const key = range === 'thisMonth' ? currentMonthKey(now) : prevMonthKey(now)
  return transactions.filter((t) => monthKey(t.date) === key)
}

export function rangeLabel(range: TimeRange): string {
  switch (range) {
    case 'thisMonth':
      return 'this month'
    case 'lastMonth':
      return 'last month'
    case 'thisYear':
      return 'this year'
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
  const map = new Map<string, { label: string; count: number; total: number }>()
  for (const t of transactions) {
    if (t.amount >= 0 || !countsTowardTotals(t)) continue
    const key = merchantKey(t.description)
    const entry = map.get(key) ?? { label: merchantLabel(t.description), count: 0, total: 0 }
    entry.count += 1
    entry.total += -t.amount
    map.set(key, entry)
  }
  return [...map.values()]
    .map((v) => ({ merchant: v.label, count: v.count, total: v.total }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
}

/** Expense merchants by total spend, biggest first. */
export function topMerchants(transactions: Transaction[], n = 8): MerchantStat[] {
  return merchantStats(transactions)
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
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

/** Filter to an inclusive custom date window (ISO YYYY-MM-DD bounds). */
export function filterByDateRange(
  transactions: Transaction[],
  from?: string,
  to?: string,
): Transaction[] {
  return transactions.filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
}

/** Shift a "YYYY-MM" key back by N months. */
function shiftMonth(key: string, back: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - back, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export interface RecurringPayment {
  merchant: string
  /** Stable merchant key, so callers can flag/unflag the subscription. */
  merchantKey: string
  category: Category
  count: number
  months: number
  /** Average charge size. */
  avgAmount: number
  /** The typical (most common, to-the-cent) charge amount. */
  recurringAmount: number
  /** Normalized monthly cost: total spend / number of months it spanned. */
  monthlyEstimate: number
  /** True when the charge is essentially the same amount every time. */
  fixed: boolean
  /** True when the user flagged this merchant as a subscription. */
  isSubscription: boolean
  lastDate: string
}

interface RecurringGroup {
  label: string
  key: string
  cat: Category
  amounts: number[]
  months: Set<string>
  total: number
  last: string
  sub: boolean
}

/** Bucket expenses by merchant, tracking amounts, months, and the subscription flag. */
function groupRecurring(transactions: Transaction[]): RecurringGroup[] {
  const map = new Map<string, RecurringGroup>()
  for (const t of transactions) {
    if (t.amount >= 0 || !countsTowardTotals(t)) continue
    const key = merchantKey(t.description)
    const e =
      map.get(key) ??
      {
        label: merchantLabel(t.description),
        key,
        cat: t.category,
        amounts: [],
        months: new Set<string>(),
        total: 0,
        last: '',
        sub: false,
      }
    e.amounts.push(-t.amount)
    e.months.add(monthKey(t.date))
    e.total += -t.amount
    e.cat = t.category
    if (t.subscription) e.sub = true
    if (t.date > e.last) e.last = t.date
    map.set(key, e)
  }
  return [...map.values()]
}

/** The most common amount (rounded to the cent) and how many times it recurs. */
function modeAmount(amounts: number[]): { value: number; freq: number } {
  const counts = new Map<number, number>()
  for (const a of amounts) {
    const cents = Math.round(a * 100) / 100
    counts.set(cents, (counts.get(cents) ?? 0) + 1)
  }
  let value = amounts[0] ?? 0
  let freq = 0
  for (const [v, f] of counts) {
    if (f > freq || (f === freq && v > value)) {
      value = v
      freq = f
    }
  }
  return { value, freq }
}

function toRecurring(e: RecurringGroup, mode: { value: number; freq: number }): RecurringPayment {
  const count = e.amounts.length
  // A single charge can't show variance, so assume it's fixed; otherwise the
  // same amount must dominate (repeat and cover at least half the charges).
  const fixed = count <= 1 ? true : mode.freq >= 2 && mode.freq / count >= 0.5
  return {
    merchant: e.label,
    merchantKey: e.key,
    category: e.cat,
    count,
    months: e.months.size,
    avgAmount: e.total / count,
    recurringAmount: mode.value,
    monthlyEstimate: e.total / Math.max(1, e.months.size),
    fixed,
    isSubscription: e.sub,
    lastDate: e.last,
  }
}

/**
 * Recurring charges — subscriptions, fixed bills (rent, student loans), and
 * averaged variable bills (water, power). A merchant qualifies when:
 *  - the user flagged it as a subscription, OR
 *  - it repeats across 3+ months, OR
 *  - the *same amount* recurs 3+ times — so a fixed monthly payment is caught
 *    even with a short history (the "same amount" emphasis).
 *
 * `monthlyEstimate` normalizes everything to a per-month cost, so variable
 * bills are effectively averaged. Sorted by monthly cost, biggest first.
 */
export function recurringPayments(transactions: Transaction[]): RecurringPayment[] {
  const out: RecurringPayment[] = []
  for (const e of groupRecurring(transactions)) {
    const mode = modeAmount(e.amounts)
    const r = toRecurring(e, mode)
    const qualifies =
      r.isSubscription || (r.count >= 3 && r.months >= 3) || (r.fixed && mode.freq >= 3)
    if (qualifies) out.push(r)
  }
  return out.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
}

/**
 * Just the merchants the user flagged as subscriptions, summarized like
 * recurring payments — the "all my subscriptions in one place" list.
 */
export function subscriptions(transactions: Transaction[]): RecurringPayment[] {
  const out: RecurringPayment[] = []
  for (const e of groupRecurring(transactions)) {
    if (e.sub) out.push(toRecurring(e, modeAmount(e.amounts)))
  }
  return out.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)
}

export interface CategoryTrend {
  category: Category
  monthKey: string
  current: number
  baseline: number
  delta: number
  deltaPct: number
}

/**
 * Per-category change in the latest full month versus the average of the prior
 * up-to-3 months. Only material moves (>=25% and >=$25) are returned, biggest
 * dollar move first — the basis for "Dining is up 40%" style callouts.
 */
export function spendingTrends(transactions: Transaction[], now: Date = new Date()): CategoryTrend[] {
  const curKey = prevMonthKey(now)
  const baseKeys = [1, 2, 3].map((b) => shiftMonth(curKey, b))
  const curMap = new Map(
    spendingByCategory(transactions.filter((t) => monthKey(t.date) === curKey)).map((c) => [
      c.category,
      c.total,
    ]),
  )
  const baseTotals = new Map<Category, number[]>()
  for (const mk of baseKeys) {
    for (const c of spendingByCategory(transactions.filter((t) => monthKey(t.date) === mk))) {
      const arr = baseTotals.get(c.category) ?? []
      arr.push(c.total)
      baseTotals.set(c.category, arr)
    }
  }
  const cats = new Set<Category>([...curMap.keys(), ...baseTotals.keys()])
  const out: CategoryTrend[] = []
  for (const cat of cats) {
    const current = curMap.get(cat) ?? 0
    const arr = baseTotals.get(cat) ?? []
    const baseline = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const delta = current - baseline
    if (Math.abs(delta) < 25) continue
    const deltaPct = baseline > 0 ? (delta / baseline) * 100 : 100
    if (baseline > 0 && Math.abs(deltaPct) < 25) continue
    out.push({ category: cat, monthKey: curKey, current, baseline, delta, deltaPct })
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export interface BudgetStatusItem {
  category: Category
  budget: number
  spent: number
  pct: number
  over: boolean
}

/** Spend vs budget for a given "YYYY-MM", only for categories with a budget set. */
export function budgetStatus(
  transactions: Transaction[],
  budgets: Record<string, number>,
  monthKeyStr: string,
): BudgetStatusItem[] {
  const monthTx = transactions.filter((t) => monthKey(t.date) === monthKeyStr)
  const spentByCat = new Map(spendingByCategory(monthTx).map((c) => [c.category, c.total]))
  return Object.entries(budgets)
    .filter(([, b]) => b > 0)
    .map(([category, budget]) => {
      const spent = spentByCat.get(category) ?? 0
      return { category, budget, spent, pct: budget > 0 ? (spent / budget) * 100 : 0, over: spent > budget }
    })
    .sort((a, b) => b.pct - a.pct)
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
