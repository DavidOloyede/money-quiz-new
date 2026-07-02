import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { debtRecurring, monthlyDebtTrend, paidOffCandidates } from './debt'

let n = 0
function tx(date: string, amount: number, category: string, description: string): Transaction {
  return { id: `t${n++}`, date, description, amount, category }
}

/** A loan paid monthly Jan–Mar, then silence while other data continues. */
function loanFixture(lastOtherDate: string): Transaction[] {
  return [
    tx('2026-01-15', -220, 'loans', 'Student Loan Payment'),
    tx('2026-02-15', -220, 'loans', 'Student Loan Payment'),
    tx('2026-03-15', -220, 'loans', 'Student Loan Payment'),
    tx('2026-01-03', -60, 'groceries', 'Market'),
    tx(lastOtherDate, -60, 'groceries', 'Market'),
  ]
}

describe('debtRecurring', () => {
  it('keeps only loans-category recurring payments', () => {
    const txs = [
      ...loanFixture('2026-04-01'),
      tx('2026-01-06', -15.99, 'subscriptions', 'Netflix'),
    ]
    const debts = debtRecurring(txs)
    expect(debts).toHaveLength(1)
    expect(debts[0].merchant.toLowerCase()).toContain('student loan')
  })
})

describe('monthlyDebtTrend', () => {
  it('totals loan payments per month, oldest first', () => {
    const trend = monthlyDebtTrend(loanFixture('2026-04-01'))
    expect(trend.map((m) => m.monthKey)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(trend[0].total).toBe(220)
  })
})

describe('paidOffCandidates', () => {
  it('flags a loan quiet for more than 45 days relative to the newest data', () => {
    // last loan charge 2026-03-15, newest data 2026-05-01 -> 47 days
    const cands = paidOffCandidates(loanFixture('2026-05-01'))
    expect(cands).toHaveLength(1)
    expect(cands[0].daysSince).toBe(47)
  })

  it('does not flag within the 45-day window', () => {
    // newest data 2026-04-28 -> 44 days after the last loan charge
    expect(paidOffCandidates(loanFixture('2026-04-28'))).toHaveLength(0)
  })

  it('uses the newest data date, not the wall clock (stale import is safe)', () => {
    // Everything is old, but the loan ran right up to the newest data point.
    const txs = loanFixture('2026-03-20')
    expect(paidOffCandidates(txs)).toHaveLength(0)
  })

  it('excludes confirmed payoffs', () => {
    const txs = loanFixture('2026-05-01')
    const [cand] = paidOffCandidates(txs)
    const confirmed = { [cand.payment.groupKey]: '2026-05-02T00:00:00.000Z' }
    expect(paidOffCandidates(txs, {}, {}, confirmed)).toHaveLength(0)
  })
})
