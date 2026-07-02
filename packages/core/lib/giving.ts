/**
 * Giving & generosity math — tithes and charity rolled together, measured
 * against income. Powers the Giving card on the Dashboard, the giving goal,
 * and the giving badges. "Honor the Lord with your wealth, with the
 * firstfruits of all your increase" (Proverbs 3:9, WEB).
 */
import type { Category, Transaction } from '../types'
import { countsTowardTotals, monthKey, totalIncome } from './analysis'

/** The categories that count as giving. */
export const GIVING_CATEGORIES: Category[] = ['tithes', 'charity']

/** The traditional tithe — a tenth of income — used as the benchmark line. */
export const TITHE_BENCHMARK_PCT = 10

export function isGivingCategory(id: Category): boolean {
  return GIVING_CATEGORIES.includes(id)
}

/** Is this transaction a counted gift (money out, in a giving category)? */
function isGift(t: Transaction): boolean {
  return t.amount < 0 && isGivingCategory(t.category) && countsTowardTotals(t)
}

export interface GivingStats {
  /** Everything given (tithes + charity), positive dollars. */
  total: number
  tithes: number
  charity: number
  income: number
  /** Giving as a % of income; null when there's no income to compare against. */
  pctOfIncome: number | null
}

export function givingStats(transactions: Transaction[]): GivingStats {
  let tithes = 0
  let charity = 0
  for (const t of transactions) {
    if (!isGift(t)) continue
    if (t.category === 'tithes') tithes += -t.amount
    else charity += -t.amount
  }
  const total = tithes + charity
  const income = totalIncome(transactions)
  return {
    total,
    tithes,
    charity,
    income,
    pctOfIncome: income > 0 ? (total / income) * 100 : null,
  }
}

export interface GivingMonth {
  monthKey: string
  total: number
  income: number
  /** Giving as % of that month's income; null when the month had no income. */
  pct: number | null
}

/** Per-month giving vs income, oldest month first (feeds the trend bars). */
export function monthlyGiving(transactions: Transaction[]): GivingMonth[] {
  const map = new Map<string, { total: number; income: number }>()
  for (const t of transactions) {
    if (!countsTowardTotals(t)) continue
    const k = monthKey(t.date)
    const e = map.get(k) ?? { total: 0, income: 0 }
    if (isGift(t)) e.total += -t.amount
    if (t.amount > 0) e.income += t.amount
    map.set(k, e)
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      monthKey: k,
      total: v.total,
      income: v.income,
      pct: v.income > 0 ? (v.total / v.income) * 100 : null,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

export interface GivingGoalStatus {
  goalPct: number
  income: number
  /** Dollar target for the month: income × goal%. */
  target: number
  given: number
  /** 0-100+ progress toward the target; 0 when there's no target yet. */
  pct: number
  met: boolean
}

/** Progress toward a %-of-income giving goal for one "YYYY-MM" month. */
export function givingGoalStatus(
  transactions: Transaction[],
  goalPct: number,
  monthKeyStr: string,
): GivingGoalStatus {
  const monthTx = transactions.filter((t) => monthKey(t.date) === monthKeyStr)
  const { total: given, income } = givingStats(monthTx)
  const target = (income * goalPct) / 100
  return {
    goalPct,
    income,
    target,
    given,
    pct: target > 0 ? (given / target) * 100 : 0,
    met: target > 0 && given >= target,
  }
}
