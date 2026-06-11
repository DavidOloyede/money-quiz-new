import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import {
  budgetStatus,
  filterByRange,
  monthKey,
  monthlyTrend,
  netTotal,
  prevMonthKey,
  recurringBills,
  recurringPayments,
  shiftMonth,
  spendingByCategory,
  spendingHabits,
  totalIncome,
  totalRefunds,
  totalSpending,
} from './analysis'

let n = 0
function tx(date: string, amount: number, category: string, extra: Partial<Transaction> = {}): Transaction {
  return { id: `t${n++}`, date, description: extra.description ?? `tx ${n}`, amount, category, ...extra }
}

describe('totals', () => {
  const txs = [
    tx('2026-04-01', 3000, 'income'),
    tx('2026-04-02', -100, 'groceries'),
    tx('2026-04-03', -500, 'transfers'), // excluded
    tx('2026-04-04', -75, 'zelle', { counts: true }), // promoted recurring transfer
  ]

  it('excludes transfers but honors counts: true', () => {
    expect(totalSpending(txs)).toBe(175)
    expect(totalIncome(txs)).toBe(3000)
    expect(netTotal(txs)).toBe(3000 - 175)
  })
})

describe('refunds', () => {
  const txs = [
    tx('2026-04-01', 3000, 'income'),
    tx('2026-04-02', -200, 'shopping'),
    tx('2026-04-20', 60, 'shopping'), // refund: positive in a spending category
    tx('2026-04-05', -100, 'groceries'),
  ]

  it('does not count refunds as income', () => {
    expect(totalIncome(txs)).toBe(3000)
    expect(totalRefunds(txs)).toBe(60)
  })

  it('nets refunds against spending, keeping the net invariant', () => {
    expect(totalSpending(txs)).toBe(240) // 300 spent − 60 refunded
    expect(netTotal(txs)).toBe(totalIncome(txs) - totalSpending(txs))
  })

  it('nets a refund inside its own category only', () => {
    const cats = spendingByCategory(txs)
    expect(cats.find((c) => c.category === 'shopping')?.total).toBe(140)
    expect(cats.find((c) => c.category === 'groceries')?.total).toBe(100)
  })

  it('drops a category a refund fully cancels out', () => {
    const fully = [tx('2026-04-02', -50, 'pets'), tx('2026-05-01', 50, 'pets')]
    expect(spendingByCategory(fully)).toHaveLength(0)
  })

  it('credits a months-later refund to the month it lands in', () => {
    const late = [tx('2026-03-10', -200, 'shopping'), tx('2026-05-02', 60, 'shopping')]
    const trend = monthlyTrend(late)
    expect(trend.find((p) => p.monthKey === '2026-03')?.spending).toBe(200)
    expect(trend.find((p) => p.monthKey === '2026-05')?.spending).toBe(-60)
    expect(trend.find((p) => p.monthKey === '2026-05')?.income).toBe(0)
  })
})

describe('month helpers', () => {
  const now = new Date(2026, 5, 15) // June 2026
  it('keys and shifts months across year boundaries', () => {
    expect(monthKey('2026-06-09')).toBe('2026-06')
    expect(prevMonthKey(now)).toBe('2026-05')
    expect(shiftMonth('2026-01', 1)).toBe('2025-12')
    expect(shiftMonth('2026-03', 14)).toBe('2025-01')
  })

  it('filters by range', () => {
    const txs = [tx('2026-06-01', -10, 'dining'), tx('2026-05-01', -20, 'dining'), tx('2025-06-01', -30, 'dining')]
    expect(filterByRange(txs, 'thisMonth', now)).toHaveLength(1)
    expect(filterByRange(txs, 'lastMonth', now)).toHaveLength(1)
    expect(filterByRange(txs, 'thisYear', now)).toHaveLength(2)
  })
})

describe('recurringPayments', () => {
  const monthly = (desc: string, months: string[], amount: number) =>
    months.map((m) => tx(`${m}-15`, -amount, 'loans', { description: desc }))

  it('qualifies a merchant repeating across 3+ months', () => {
    const txs = monthly('Student Loan Payment', ['2026-01', '2026-02', '2026-03'], 220)
    expect(recurringPayments(txs)).toHaveLength(1)
  })

  it('does not qualify with only 2 months and varying amounts', () => {
    const txs = [
      tx('2026-01-15', -220, 'loans', { description: 'Student Loan Payment' }),
      tx('2026-02-15', -180, 'loans', { description: 'Student Loan Payment' }),
    ]
    expect(recurringPayments(txs)).toHaveLength(0)
  })

  it('qualifies the same amount repeating 3+ times even within fewer months', () => {
    const txs = [
      tx('2026-01-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-01-15', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-02-05', -50, 'other', { description: 'Storage Unit' }),
    ]
    expect(recurringPayments(txs)).toHaveLength(1)
    expect(recurringPayments(txs)[0].fixed).toBe(true)
  })

  it('always includes the Subscriptions category and honors dismissals', () => {
    const txs = [tx('2026-06-01', -15.49, 'subscriptions', { description: 'Netflix' })]
    const [r] = recurringPayments(txs)
    expect(r.isSubscription).toBe(true)
    expect(recurringPayments(txs, {}, { [r.groupKey]: true })).toHaveLength(0)
  })
})

describe('bill vs habit classification', () => {
  /** Same merchant, three months, varying amounts (no repeated amount). */
  const varying = (desc: string, category: string, amounts: [number, number, number]) => [
    tx('2026-01-12', -amounts[0], category, { description: desc }),
    tx('2026-02-12', -amounts[1], category, { description: desc }),
    tx('2026-03-12', -amounts[2], category, { description: desc }),
  ]

  it('files a varying discretionary repeat (Amazon) as a habit', () => {
    const [r] = recurringPayments(varying('Amazon Marketplace', 'shopping', [35.2, 78.5, 12.99]))
    expect(r.kind).toBe('habit')
  })

  it('files a varying utility (energy bill) as a bill', () => {
    const [r] = recurringPayments(varying('Champion Energy', 'utilities', [80, 95, 110]))
    expect(r.kind).toBe('bill')
  })

  it('files a fixed-amount repeat as a bill even in a discretionary category', () => {
    const txs = [
      tx('2026-01-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-02-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-03-05', -50, 'other', { description: 'Storage Unit' }),
    ]
    expect(recurringPayments(txs)[0].kind).toBe('bill')
  })

  it('files subscriptions and ★-flagged groups as bills', () => {
    const sub = recurringPayments([
      tx('2026-06-01', -15.49, 'subscriptions', { description: 'Netflix' }),
    ])
    expect(sub[0].kind).toBe('bill')
    const flagged = recurringPayments(
      varying('Whataburger', 'dining', [9.5, 14.25, 22.8]).map((t) => ({ ...t, recurring: true })),
    )
    expect(flagged[0].kind).toBe('bill')
  })

  it('honors user re-filings and splits bills from habits', () => {
    const txs = [
      ...varying('Amazon Marketplace', 'shopping', [35.2, 78.5, 12.99]),
      ...varying('Champion Energy', 'utilities', [80, 95, 110]),
    ]
    expect(recurringBills(txs).map((r) => r.merchant)).toEqual(['Champion Energy'])
    expect(spendingHabits(txs).map((r) => r.merchant)).toEqual(['Amazon Marketplace'])

    const amazonKey = spendingHabits(txs)[0].groupKey
    const refiled = { [amazonKey]: 'bill' as const }
    expect(spendingHabits(txs, {}, {}, refiled)).toHaveLength(0)
    expect(recurringBills(txs, {}, {}, refiled)).toHaveLength(2)
  })
})

describe('budgetStatus', () => {
  it('measures spend against budget for the month', () => {
    const txs = [tx('2026-06-02', -120, 'groceries'), tx('2026-05-02', -999, 'groceries')]
    const [s] = budgetStatus(txs, { groceries: 100 }, '2026-06')
    expect(s.spent).toBe(120)
    expect(s.over).toBe(true)
    expect(s.pct).toBeCloseTo(120)
  })
})
