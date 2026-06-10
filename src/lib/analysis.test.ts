import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import {
  budgetStatus,
  filterByRange,
  monthKey,
  netTotal,
  prevMonthKey,
  recurringPayments,
  shiftMonth,
  totalIncome,
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

describe('budgetStatus', () => {
  it('measures spend against budget for the month', () => {
    const txs = [tx('2026-06-02', -120, 'groceries'), tx('2026-05-02', -999, 'groceries')]
    const [s] = budgetStatus(txs, { groceries: 100 }, '2026-06')
    expect(s.spent).toBe(120)
    expect(s.over).toBe(true)
    expect(s.pct).toBeCloseTo(120)
  })
})
