import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { givingGoalStatus, givingStats, monthlyGiving } from './giving'

let n = 0
function tx(date: string, amount: number, category: string, extra: Partial<Transaction> = {}): Transaction {
  return { id: `t${n++}`, date, description: `tx ${n}`, amount, category, ...extra }
}

const fixture: Transaction[] = [
  tx('2026-04-01', 3000, 'income'),
  tx('2026-04-05', -300, 'tithes'),
  tx('2026-04-12', -50, 'charity'),
  tx('2026-04-15', -120, 'groceries'),
  tx('2026-04-20', -500, 'transfers'), // excluded — must not count anywhere
  tx('2026-05-01', 3000, 'income'),
  tx('2026-05-06', -150, 'tithes'),
]

describe('givingStats', () => {
  it('splits tithes and charity and measures against income', () => {
    const s = givingStats(fixture)
    expect(s.tithes).toBe(450)
    expect(s.charity).toBe(50)
    expect(s.total).toBe(500)
    expect(s.income).toBe(6000)
    expect(s.pctOfIncome).toBeCloseTo((500 / 6000) * 100)
  })

  it('ignores excluded categories and income rows', () => {
    const s = givingStats([tx('2026-04-01', -100, 'zelle'), tx('2026-04-02', 100, 'tithes')])
    expect(s.total).toBe(0)
  })

  it('returns null pct when there is no income', () => {
    expect(givingStats([tx('2026-04-05', -300, 'tithes')]).pctOfIncome).toBeNull()
  })
})

describe('monthlyGiving', () => {
  it('buckets by month, oldest first, with per-month pct', () => {
    const months = monthlyGiving(fixture)
    expect(months.map((m) => m.monthKey)).toEqual(['2026-04', '2026-05'])
    expect(months[0].total).toBe(350)
    expect(months[0].pct).toBeCloseTo((350 / 3000) * 100)
    expect(months[1].total).toBe(150)
  })

  it('reports null pct for months without income', () => {
    const months = monthlyGiving([tx('2026-03-02', -40, 'charity')])
    expect(months[0].pct).toBeNull()
  })
})

describe('givingGoalStatus', () => {
  it('computes the dollar target from the goal percent', () => {
    const g = givingGoalStatus(fixture, 10, '2026-04')
    expect(g.income).toBe(3000)
    expect(g.target).toBe(300)
    expect(g.given).toBe(350)
    expect(g.pct).toBeCloseTo((350 / 300) * 100)
    expect(g.met).toBe(true)
  })

  it('is unmet when giving falls short', () => {
    const g = givingGoalStatus(fixture, 10, '2026-05')
    expect(g.given).toBe(150)
    expect(g.met).toBe(false)
  })

  it('handles a zero-income month without dividing by zero', () => {
    const g = givingGoalStatus([tx('2026-06-05', -50, 'tithes')], 10, '2026-06')
    expect(g.target).toBe(0)
    expect(g.pct).toBe(0)
    expect(g.met).toBe(false)
  })
})
