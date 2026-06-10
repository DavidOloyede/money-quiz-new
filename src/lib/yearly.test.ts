import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { buildYearSheet, endBalances, yearsPresent } from './yearly'

let n = 0
function tx(date: string, amount: number, category: string): Transaction {
  return { id: `t${n++}`, date, description: `tx ${n}`, amount, category }
}

// Mid-June: months 0-5 are actual for 2026, 6-11 projected.
const NOW = new Date(2026, 5, 15)

const fixture: Transaction[] = [
  tx('2026-04-01', 3000, 'income'),
  tx('2026-04-10', -400, 'groceries'),
  tx('2026-05-01', 3000, 'income'),
  tx('2026-05-10', -500, 'groceries'),
  tx('2026-05-12', -100, 'tithes'),
  tx('2026-06-01', 3000, 'income'),
  tx('2026-06-10', -300, 'groceries'),
]

describe('yearsPresent', () => {
  it('lists distinct years ascending', () => {
    expect(yearsPresent([tx('2025-12-31', -1, 'other'), tx('2026-01-01', -1, 'other')])).toEqual([
      2025, 2026,
    ])
  })
})

describe('buildYearSheet', () => {
  it('marks months after now as projected for the current year', () => {
    const sheet = buildYearSheet(fixture, 2026, {}, NOW)
    expect(sheet.lastActualMonth).toBe(5)
    expect(sheet.hasProjections).toBe(true)
    expect(sheet.net[5].projected).toBe(false)
    expect(sheet.net[6].projected).toBe(true)
  })

  it('treats a past year as fully actual', () => {
    const sheet = buildYearSheet([tx('2025-03-01', -50, 'dining')], 2025, {}, NOW)
    expect(sheet.lastActualMonth).toBe(11)
    expect(sheet.hasProjections).toBe(false)
  })

  it('projects from the data start, not January (run-rate)', () => {
    const sheet = buildYearSheet(fixture, 2026, {}, NOW)
    const groceries = sheet.expenseSections
      .flatMap((s) => s.rows)
      .find((r) => r.id === 'groceries')!
    // Data covers Apr-Jun: (400+500+300)/3 = 400, NOT /6 = 200.
    expect(groceries.cells[6].value).toBeCloseTo(400)
    expect(groceries.cells[6].projected).toBe(true)
  })

  it('prefers the category budget for projections when set', () => {
    const sheet = buildYearSheet(fixture, 2026, { groceries: 350 }, NOW)
    const groceries = sheet.expenseSections
      .flatMap((s) => s.rows)
      .find((r) => r.id === 'groceries')!
    expect(groceries.cells[7].value).toBe(350)
  })

  it('groups tithes into the Giving section', () => {
    const sheet = buildYearSheet(fixture, 2026, {}, NOW)
    const giving = sheet.expenseSections.find((s) => s.id === 'giving')!
    expect(giving.rows.map((r) => r.id)).toContain('tithes')
  })

  it('computes per-month net = income - expenses', () => {
    const sheet = buildYearSheet(fixture, 2026, {}, NOW)
    expect(sheet.net[3].value).toBeCloseTo(3000 - 400) // April
    expect(sheet.net[4].value).toBeCloseTo(3000 - 600) // May
  })
})

describe('endBalances', () => {
  it('accumulates net on top of the starting balance', () => {
    const net = Array.from({ length: 12 }, () => ({ value: 100, projected: false }))
    const out = endBalances(500, net)
    expect(out[0]).toBe(600)
    expect(out[11]).toBe(1700)
  })
})
