import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { filterTransactions, isEmptyCriteria, matchesCriteria } from './filter'

let n = 0
const tx = (
  description: string,
  amount: number,
  category: string,
  sourceId?: string,
  recurring?: boolean,
): Transaction => ({
  id: `t${n++}`,
  date: '2026-07-01',
  description,
  amount,
  category,
  sourceId,
  recurring,
})

// The case this exists for: one descriptor covering two different bills.
const ROWS: Transaction[] = [
  tx('WILLOW BEND OWNERS ASSOCIATION', -118, 'home', 'checking'),
  tx('WILLOW BEND OWNERS ASSOCIATION', -118, 'home', 'checking'),
  tx('WILLOW BEND OWNERS ASSOCIATION', -342.5, 'home', 'checking'),
  tx('CORNER COFFEE ROASTERS', -6.4, 'dining', 'credit', true),
  tx('NORTHSIDE GROCERY CO', -78.5, 'groceries', 'credit'),
  tx('NORTHSIDE GROCERY CO REFUND', 118, 'groceries', 'credit'),
]

describe('isEmptyCriteria', () => {
  it('is true for nothing, and for the explicit "all"', () => {
    expect(isEmptyCriteria({})).toBe(true)
    expect(isEmptyCriteria({ query: '  ', category: 'all', sources: [] })).toBe(true)
  })

  it('is false once anything narrows', () => {
    expect(isEmptyCriteria({ min: 0 })).toBe(false)
    expect(isEmptyCriteria({ recurringOnly: true })).toBe(false)
  })

  it('returns the original array when nothing narrows', () => {
    expect(filterTransactions(ROWS, {})).toBe(ROWS)
  })
})

describe('filterTransactions', () => {
  it('narrows by text, case-insensitively', () => {
    expect(filterTransactions(ROWS, { query: 'willow bend' })).toHaveLength(3)
    expect(filterTransactions(ROWS, { query: 'GROCERY' })).toHaveLength(2)
  })

  it('narrows by category', () => {
    expect(filterTransactions(ROWS, { category: 'home' })).toHaveLength(3)
    expect(filterTransactions(ROWS, { category: 'all' })).toHaveLength(ROWS.length)
  })

  it('narrows by import source', () => {
    expect(filterTransactions(ROWS, { sources: ['credit'] })).toHaveLength(3)
    expect(filterTransactions(ROWS, { sources: ['checking', 'credit'] })).toHaveLength(6)
    expect(filterTransactions(ROWS, { sources: [] })).toHaveLength(6)
  })

  it('matches an exact amount by magnitude, either direction', () => {
    // 118 finds both the -118 dues and the +118 refund.
    expect(filterTransactions(ROWS, { amount: 118 })).toHaveLength(3)
    expect(filterTransactions(ROWS, { amount: -118 })).toHaveLength(3)
  })

  it('matches a magnitude range', () => {
    expect(filterTransactions(ROWS, { min: 100 })).toHaveLength(4)
    expect(filterTransactions(ROWS, { max: 10 })).toHaveLength(1)
    expect(filterTransactions(ROWS, { min: 100, max: 200 })).toHaveLength(3)
  })

  it('lets an exact amount win over a range', () => {
    expect(filterTransactions(ROWS, { amount: 342.5, min: 0, max: 1 })).toHaveLength(1)
  })

  it('narrows to recurring rows', () => {
    expect(filterTransactions(ROWS, { recurringOnly: true })).toHaveLength(1)
  })

  it('combines everything, which is the point', () => {
    // Exactly David's case: one name, one amount, out of a pile that shares
    // the name at a different amount.
    const found = filterTransactions(ROWS, {
      query: 'willow bend',
      amount: 118,
      sources: ['checking'],
    })
    expect(found).toHaveLength(2)
    expect(found.every((t) => t.amount === -118)).toBe(true)
  })

  it('survives float noise on the amount', () => {
    expect(matchesCriteria(tx('X', -118.1, 'other'), { amount: 118.1 })).toBe(true)
  })
})
