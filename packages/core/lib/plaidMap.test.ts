import { describe, expect, it } from 'vitest'
import { mapPlaidTransactions } from './plaidMap'
import type { PlaidTxn } from './plaid'

const base: PlaidTxn = {
  transaction_id: 't1',
  date: '2026-09-20',
  name: 'WALMART SUPERCENTER #1234',
  merchant_name: 'Walmart',
  amount: 38.62,
  personal_finance_category: { primary: 'GENERAL_MERCHANDISE', detailed: 'GENERAL_MERCHANDISE_SUPERSTORES' },
}

describe('mapPlaidTransactions', () => {
  it('flips the sign, prefers the merchant name, and keeps the source', () => {
    const [t] = mapPlaidTransactions([base], 'item-1')
    expect(t).toMatchObject({
      id: 'plaid:t1',
      date: '2026-09-20',
      description: 'Walmart',
      amount: -38.62,
      category: 'shopping',
      sourceId: 'item-1',
    })
  })

  it('carries Plaid’s merchant logo through', () => {
    const logo = 'https://plaid-merchant-logos.plaid.com/walmart_1100.png'
    const [t] = mapPlaidTransactions([{ ...base, logo_url: logo }], 'item-1')
    expect(t.logoUrl).toBe(logo)
  })

  it('falls back to a counterparty’s logo when the merchant has none', () => {
    const [t] = mapPlaidTransactions(
      [
        {
          ...base,
          logo_url: null,
          counterparties: [
            { name: 'Someone', type: 'merchant', logo_url: null },
            { name: 'Walmart', type: 'marketplace', logo_url: 'https://example.test/w.png' },
          ],
        },
      ],
      'item-1',
    )
    expect(t.logoUrl).toBe('https://example.test/w.png')
  })

  it('leaves logoUrl off entirely when there is no logo', () => {
    const [t] = mapPlaidTransactions([base], 'item-1')
    expect('logoUrl' in t).toBe(false)
  })
})
