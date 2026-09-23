import { describe, expect, it } from 'vitest'
import { categorize, categorizeMatch } from './categorize'
import { isRefund, isRealIncome } from './analysis'

/**
 * Every row here is invented — made-up merchants and amounts that only mimic
 * the *shape* of real bank descriptors. Never paste real statement lines in.
 */
const OUT = -100
const IN = 100

describe('direction-aware rules', () => {
  it('files rent paid as housing', () => {
    expect(categorize('MAPLEWOOD APARTMENTS RENT', -1650)).toBe('rent')
    expect(categorize('SUMMIT LEASING OFFICE', -1200)).toBe('rent')
  })

  it('files rent RECEIVED as income, never as housing spending', () => {
    // The bug: a tenant deposit matched the rent keyword, landed in a spending
    // category, and isRefund() then quietly shrank housing spending by it.
    const t = {
      id: 'a',
      date: '2026-07-01',
      description: 'RENTPORTAL RENT:TENANTA UNIT B',
      amount: 2640,
      category: categorize('RENTPORTAL RENT:TENANTA UNIT B', 2640),
    }
    expect(t.category).toBe('income')
    expect(isRefund(t)).toBe(false)
    expect(isRealIncome(t)).toBe(true)
  })

  it('files a lease payout from a property manager as income too', () => {
    expect(categorize('HILLTOP PROPERTY MGMT DISBURSEMENT', 1875)).toBe('income')
  })

  it('still recognizes mortgage abbreviations as housing', () => {
    expect(categorize('SUMMIT MTG PYMTS', -4350)).toBe('rent')
    expect(categorize('NORTHSTAR MTGE ACH', -2100)).toBe('rent')
    expect(categorize('Lakeside Mortgage', -1900)).toBe('rent')
  })
})

describe('card bills paid from checking', () => {
  it('treats an issuer card payment as a transfer, not spending', () => {
    expect(categorize('CITI CARD ONLINE PAYMENT 08/14 WEB ID: CITICTP', -800)).toBe('transfers')
    expect(categorize('DISCOVER CARD PYMT ACH', -450)).toBe('transfers')
    expect(categorize('AMEX CARD EPAYMENT ACH PMT', -1200)).toBe('transfers')
  })

  it('needs a known issuer, so an unrelated merchant is untouched', () => {
    expect(categorize('VISTA GARDEN CARD PAYMENT', -800)).toBe('other')
  })

  it('leaves a loan bill from the same bank to the loans rule', () => {
    // "payment" + an issuer name, but no card word — this is a car note.
    expect(categorize('CAPITAL ONE AUTO LOAN PAYMENT', -389)).toBe('loans')
  })

  it('does not steal a Zelle row that happens to name a card issuer', () => {
    expect(categorize('Zelle payment to Discover Card Member JPM1234', -50)).toBe('zelle')
  })

  it('ignores money IN, which the card statement side handles', () => {
    expect(categorize('CITI CARD ONLINE PAYMENT', 800)).not.toBe('transfers')
  })
})

describe('refunds are no longer mislabeled as income', () => {
  // 'refund' / 'cashback' / 'reimburs' used to sit on the income rule, which
  // made isRefund() (money in, in a SPENDING category) permanently false.
  it('lets a merchant refund net against the merchant’s own category', () => {
    const cat = categorize('AMAZON MKTPL REFUND', 53.99)
    expect(cat).toBe('shopping')
    expect(isRefund({ id: 'a', date: '2026-07-01', description: 'x', amount: 53.99, category: cat })).toBe(
      true,
    )
  })

  it('keeps a tax refund as real income', () => {
    const cat = categorize('TAX REFUND - IRS TREAS 310', 420)
    expect(cat).toBe('income')
    expect(isRealIncome({ id: 'a', date: '2026-07-01', description: 'x', amount: 420, category: cat })).toBe(
      true,
    )
  })
})

describe('new keyword groups', () => {
  it.each([
    ['METROCARD MTA*NYCT PAYGO', 'transport'],
    ['NJT RAIL TICKET MOBILE', 'transport'],
    ['PRIMO WATER REFILL', 'utilities'],
    ['USPS PO 1234500', 'shopping'],
    ['OWNWELL PROPERTY TAX SVC', 'fees'],
    ['PLAN FEE - VISTA FLEX PLAN 04/06', 'fees'],
    ['NORTHBANK BENEFITS DEDUCTION', 'insurance'],
    ['TURBOTENANT PLAN', 'home'],
    ['ZILLOW RENTAL LISTING', 'home'],
  ])('%s → %s', (description, expected) => {
    expect(categorize(description, OUT)).toBe(expected)
  })

  it('files a listing tool as a home cost, not as rent paid', () => {
    // 'home' is checked before 'rent', so "Zillow Rental" can't read as housing.
    expect(categorize('ZILLOW RENTAL LISTING', OUT)).not.toBe('rent')
  })
})

describe('categorizeMatch', () => {
  it('reports a real rule hit', () => {
    expect(categorizeMatch('Corner Coffee Roasters', OUT)).toEqual({
      category: 'dining',
      matched: true,
    })
  })

  it('reports the sign-only fallback as unmatched', () => {
    expect(categorizeMatch('QTX 88123 PURCHASE', OUT)).toEqual({ category: 'other', matched: false })
    expect(categorizeMatch('QTX 88123 DEPOSIT', IN)).toEqual({ category: 'income', matched: false })
  })
})
