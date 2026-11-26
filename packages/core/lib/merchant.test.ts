import { describe, expect, it } from 'vitest'
import {
  categoryCandidates,
  categoryOffers,
  merchantKey,
  merchantSweep,
  renameCandidates,
  renameOffers,
} from './merchant'
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

describe('categoryCandidates', () => {
  const dues = [
    { ...tx('w1', 'WILLOW BEND OWNERS ASSOCIATION', -118), category: 'home' },
    tx('w2', 'WILLOW BEND OWNERS ASSOCIATION', -118),
    tx('w3', 'WILLOW BEND OWNERS ASSOCIATION', -342.5),
    tx('w4', 'WILLOW BEND HOA SPECIAL', -118),
    { ...tx('w5', 'WILLOW BEND OWNERS ASSOCIATION', -118), category: 'home' },
    tx('k1', 'KROGER', -118),
  ]

  it('offers same-amount rows sharing the name, and the whole merchant at any amount', () => {
    const { sameAmount, sameMerchant } = categoryCandidates(dues[0], dues, 'home')
    expect(sameAmount.map((t) => t.id)).toEqual(['w2', 'w4'])
    expect(sameMerchant.map((t) => t.id)).toEqual(['w2', 'w3'])
  })

  it('leaves out rows already in the new category, the edited row, and other merchants', () => {
    const { sameAmount, sameMerchant } = categoryCandidates(dues[0], dues, 'home')
    const ids = [...sameAmount, ...sameMerchant].map((t) => t.id)
    expect(ids).not.toContain('w1')
    expect(ids).not.toContain('w5')
    expect(ids).not.toContain('k1')
  })
})

describe('categoryOffers', () => {
  // The sample data's Willow Bend descriptor covers two bills: $118 HOA dues
  // and $342.50 home insurance. The user renamed the four insurance rows, so
  // the store shows them under the new name (renamed: true).
  const hoa = (id: string) => ({ ...tx(id, 'WILLOW BEND OWNERS ASSOCIATION', -118), category: 'home' })
  const ins = (id: string, category = 'home') => ({
    ...tx(id, 'Willow Bend home insurance', -342.5),
    key: `key-${id}`,
    renamed: true,
    category,
  })
  const willow = [hoa('h1'), hoa('h2'), hoa('h3'), ins('i1', 'insurance'), ins('i2'), ins('i3'), ins('i4')]

  it('never turns a same-amount offer into a merchant rule, even as the only offer', () => {
    // Regression: setting one renamed $342.50 row to Insurance offered "the 3
    // $342.50 charges" with no wider button, and applying it ran the
    // whole-merchant sweep, which put all four back in Home & HOA.
    const offers = categoryOffers(willow[3], willow, 'insurance')
    expect(offers).toHaveLength(1)
    expect(offers[0].wholeMerchant).toBe(false)
    expect(offers[0].rows.map((t) => t.id)).toEqual(['i2', 'i3', 'i4'])
  })

  it('offers the wider tier when it reaches other rows, even at the same count', () => {
    const dues = [
      { ...tx('w1', 'WILLOW BEND OWNERS ASSOCIATION', -118), category: 'home' },
      tx('w2', 'WILLOW BEND OWNERS ASSOCIATION', -118),
      tx('w3', 'WILLOW BEND OWNERS ASSOCIATION', -342.5),
      tx('w4', 'WILLOW BEND HOA SPECIAL', -118),
    ]
    // Two rows each, but not the same two: w4 shares a word, w3 the merchant.
    const offers = categoryOffers(dues[0], dues, 'home')
    expect(offers.map((o) => [o.wholeMerchant, o.rows.map((t) => t.id)])).toEqual([
      [false, ['w2', 'w4']],
      [true, ['w2', 'w3']],
    ])
  })

  it('leaves out the wider tier when it adds nothing, and offers it alone when there is no amount match', () => {
    const same = [tx('n1', 'NETFLIX', -15.49), tx('n2', 'NETFLIX', -15.49)]
    expect(categoryOffers(same[0], same, 'subscriptions').map((o) => o.wholeMerchant)).toEqual([false])
    const power = [tx('p1', 'CITY POWER', -80), tx('p2', 'CITY POWER', -112)]
    expect(categoryOffers(power[0], power, 'utilities').map((o) => o.wholeMerchant)).toEqual([true])
  })
})

describe('renameOffers', () => {
  it('uses the same two tiers as the category prompt', () => {
    const offers = renameOffers(rows[0], rows, 'Apple iCloud')
    expect(offers.map((o) => [o.wholeMerchant, o.rows.map((t) => t.id)])).toEqual([
      [false, ['a2']],
      [true, ['a2', 'a3', 'a4', 'a5']],
    ])
  })
})

describe('merchantSweep', () => {
  const row = (id: string, description: string, renamed = false): Transaction => ({
    ...tx(id, description, -10),
    key: `key-${id}`,
    renamed: renamed || undefined,
  })

  it('re-files and unpins rows showing the bank text, and remembers the merchant', () => {
    const shown = [row('a', 'CITY POWER'), row('b', 'CITY POWER'), row('c', 'KROGER')]
    expect(merchantSweep(shown, merchantKey('CITY POWER'))).toEqual({
      refile: ['a', 'b'],
      unpin: ['key-a', 'key-b'],
      pin: [],
      remember: true,
    })
  })

  it('pins renamed rows instead of clearing them, and makes no rule from a user label', () => {
    // Regression: the sweep matched stored rows by their bank text (so the
    // renamed rows were never re-filed) yet cleared their pins, undoing the
    // edit that started the offer.
    const shown = [
      row('i1', 'Willow Bend home insurance', true),
      row('i2', 'Willow Bend home insurance', true),
      row('h1', 'WILLOW BEND OWNERS ASSOCIATION'),
    ]
    expect(merchantSweep(shown, merchantKey('Willow Bend home insurance'))).toEqual({
      refile: [],
      unpin: [],
      pin: ['key-i1', 'key-i2'],
      remember: false,
    })
  })

  it('leaves rows renamed away from the bank text out of its sweep', () => {
    const shown = [
      row('i1', 'Willow Bend home insurance', true),
      row('h1', 'WILLOW BEND OWNERS ASSOCIATION'),
    ]
    const sweep = merchantSweep(shown, merchantKey('WILLOW BEND OWNERS ASSOCIATION'))
    expect(sweep.refile).toEqual(['h1'])
    expect(sweep.pin).toEqual([])
    expect(sweep.remember).toBe(true)
  })
})
