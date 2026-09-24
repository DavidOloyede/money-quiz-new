import { describe, expect, it } from 'vitest'
import { renameCandidates } from './merchant'
import type { Transaction } from '../types'

const tx = (id: string, description: string, amount: number): Transaction => ({
  id,
  date: '2026-09-01',
  description,
  amount,
  category: 'shopping',
})

// The Apple rows from a real Empower export: two subscriptions at two prices.
const rows = [
  tx('a1', 'Apple', -9.99),
  tx('a2', 'Apple', -9.99),
  tx('a3', 'Apple', -6.48),
  tx('a4', 'Apple', -6.48),
  tx('a5', 'Apple', 10.81),
  tx('k1', 'Kroger', -9.99),
]

describe('renameCandidates', () => {
  it('splits same-amount matches from the rest of the merchant', () => {
    const { sameAmount, all } = renameCandidates(rows[0], rows, 'Apple iCloud')
    expect(sameAmount.map((t) => t.id)).toEqual(['a2'])
    expect(all.map((t) => t.id)).toEqual(['a2', 'a3', 'a4', 'a5'])
  })

  it('never offers the renamed row itself or another merchant at the same price', () => {
    const { all } = renameCandidates(rows[0], rows, 'Apple iCloud')
    expect(all.map((t) => t.id)).not.toContain('a1')
    expect(all.map((t) => t.id)).not.toContain('k1')
  })

  it('skips rows already showing the new name', () => {
    const renamed = [...rows, tx('a6', 'Apple iCloud', -9.99)]
    const { sameAmount } = renameCandidates(rows[0], renamed, 'Apple iCloud')
    expect(sameAmount.map((t) => t.id)).toEqual(['a2'])
  })

  it('matches differently-worded descriptors that share the merchant name', () => {
    const claude = [
      tx('c1', 'Anthropic* Claude Sub Anthropic.comca', -21.32),
      tx('c2', 'Claude', -21.32),
      tx('c3', 'Anthropic Anthropic.comca', -5.33),
    ]
    const { sameAmount, all } = renameCandidates(claude[0], claude, 'Claude Pro')
    expect(sameAmount.map((t) => t.id)).toEqual(['c2'])
    expect(all.map((t) => t.id)).toEqual(['c2', 'c3'])
  })
})
