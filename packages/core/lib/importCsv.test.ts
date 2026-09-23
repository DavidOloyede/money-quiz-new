import { describe, expect, it } from 'vitest'
import type { ColumnMapping, CsvRow } from '../types'
import { guessAccountType, guessMapping, isCardPayment, mappingFitsHeaders, rowsToTransactions } from './importCsv'

/**
 * Invented rows only — the header *shapes* mirror real exports (single-amount,
 * debit/credit pair, a bank category column), but every merchant and figure is
 * made up. Never paste real statement lines in.
 */

describe('guessMapping', () => {
  it('picks date / description / amount from a single-amount export', () => {
    const m = guessMapping(['Date', 'Description', 'Amount', 'Type', 'Balance'])
    expect(m.date).toBe('Date')
    expect(m.description).toBe('Description')
    expect(m.amountMode).toBe('single')
    expect(m.amount).toBe('Amount')
  })

  it('uses debit/credit columns when there is no single amount', () => {
    const m = guessMapping(['Status', 'Date', 'Description', 'Debit', 'Credit'])
    expect(m.amountMode).toBe('debitCredit')
    expect(m.debit).toBe('Debit')
    expect(m.credit).toBe('Credit')
  })

  it('picks up a bank category column but never a Type column', () => {
    expect(guessMapping(['Date', 'Description', 'Category', 'Amount']).category).toBe('Category')
    expect(guessMapping(['Date', 'Description', 'Type', 'Amount']).category).toBeUndefined()
  })
})

describe('guessAccountType', () => {
  it('reads a running balance column as a bank account', () => {
    expect(guessAccountType(['Date', 'Description', 'Amount', 'Balance'], [])).toBe('bank')
  })

  it('reads card-payment markers in the descriptions as a credit card', () => {
    const rows: CsvRow[] = [
      { Date: '2026-07-01', Description: 'PAYMENT THANK YOU', Amount: '250.00' },
      { Date: '2026-07-02', Description: 'Corner Coffee Roasters', Amount: '-6.25' },
    ]
    expect(guessAccountType(['Date', 'Description', 'Amount'], rows)).toBe('credit')
  })
})

describe('rowsToTransactions — amounts and signs', () => {
  const m: ColumnMapping = {
    date: 'Date',
    description: 'Description',
    amountMode: 'single',
    amount: 'Amount',
    accountType: 'bank',
  }

  it('keeps the sign and normalizes the date', () => {
    const res = rowsToTransactions(
      [{ Date: '07/14/2026', Description: 'Northside Grocery Co', Amount: '-64.30' }],
      m,
    )
    expect(res.transactions[0]).toMatchObject({
      date: '2026-07-14',
      amount: -64.3,
      category: 'groceries',
    })
  })

  it('inverts when the export uses positive-for-expense', () => {
    const res = rowsToTransactions(
      [{ Date: '2026-07-14', Description: 'Northside Grocery Co', Amount: '64.30' }],
      { ...m, invertAmount: true },
    )
    expect(res.transactions[0].amount).toBe(-64.3)
  })

  it('reads a debit/credit pair as credit-minus-debit', () => {
    const dc: ColumnMapping = {
      date: 'Date',
      description: 'Description',
      amountMode: 'debitCredit',
      debit: 'Debit',
      credit: 'Credit',
      accountType: 'credit',
    }
    const res = rowsToTransactions(
      [
        { Date: '2026-07-14', Description: 'Northside Grocery Co', Debit: '64.30', Credit: '' },
        { Date: '2026-07-20', Description: 'Northside Grocery Co', Debit: '', Credit: '-12.00' },
      ],
      dc,
    )
    expect(res.transactions[0].amount).toBe(-64.3)
    expect(res.transactions[1].amount).toBe(12)
  })

  it('skips rows missing a date, description or amount', () => {
    const res = rowsToTransactions(
      [
        { Date: '', Description: 'Northside Grocery Co', Amount: '-64.30' },
        { Date: '2026-07-14', Description: '', Amount: '-64.30' },
        { Date: '2026-07-14', Description: 'Northside Grocery Co', Amount: 'n/a' },
      ],
      m,
    )
    expect(res.transactions).toHaveLength(0)
    expect(res.skipped).toBe(3)
  })

  it('stamps the source id so the import can be removed later', () => {
    const res = rowsToTransactions(
      [{ Date: '2026-07-14', Description: 'Northside Grocery Co', Amount: '-64.30' }],
      m,
      { sourceId: 'src-1' },
    )
    expect(res.transactions[0].sourceId).toBe('src-1')
  })
})

describe('rowsToTransactions — card payments', () => {
  it('drops the balance payment from a credit-card export', () => {
    const res = rowsToTransactions(
      [
        { Date: '2026-07-01', Description: 'PAYMENT THANK YOU', Amount: '250.00' },
        { Date: '2026-07-02', Description: 'Corner Coffee Roasters', Amount: '-6.25' },
      ],
      { date: 'Date', description: 'Description', amountMode: 'single', amount: 'Amount', accountType: 'credit' },
    )
    expect(res.droppedPayments).toBe(1)
    expect(res.transactions).toHaveLength(1)
  })

  it('keeps — but excludes — the same payment seen from the checking side', () => {
    // The checking row is real money leaving; it just isn't spending, because
    // the card statement already itemizes what was bought.
    const res = rowsToTransactions(
      [{ Date: '2026-07-01', Description: 'CITI CARD ONLINE PAYMENT WEB ID: CITICTP', Amount: '-250.00' }],
      { date: 'Date', description: 'Description', amountMode: 'single', amount: 'Amount', accountType: 'bank' },
    )
    expect(res.droppedPayments).toBe(0)
    expect(res.transactions[0].category).toBe('transfers')
  })

  it('isCardPayment only fires on money in', () => {
    expect(isCardPayment('PAYMENT THANK YOU', 250)).toBe(true)
    expect(isCardPayment('PAYMENT THANK YOU', -250)).toBe(false)
  })
})

describe('rowsToTransactions — bank category column is the fallback, not the boss', () => {
  const m: ColumnMapping = {
    date: 'Date',
    description: 'Description',
    amountMode: 'single',
    amount: 'Amount',
    category: 'Category',
    accountType: 'credit',
  }
  const run = (Description: string, Category: string, Amount = '-21.32') =>
    rowsToTransactions([{ Date: '2026-07-14', Description, Amount, Category }], m).transactions[0].category

  it('lets a confident keyword beat a wrong bank label', () => {
    expect(run('Anthropic* Claude Sub', 'Restaurants')).toBe('subscriptions')
    expect(run('Turbotenant Plan', 'Restaurants')).toBe('home')
    expect(run('Zillow Rental Listing', 'Rent')).toBe('home')
  })

  it('falls back to the bank label when we have no keyword at all', () => {
    expect(run('QTX 88123', 'Electronics')).toBe('shopping')
    expect(run('QTX 88123', 'Online Services')).toBe('subscriptions')
    expect(run('QTX 88123', 'Dues & Subscriptions')).toBe('subscriptions')
    expect(run('QTX 88123', 'Hobbies')).toBe('entertainment')
    expect(run('QTX 88123', 'Home Improvement')).toBe('home')
    expect(run('QTX 88123', 'Office Supplies')).toBe('shopping')
    expect(run('QTX 88123', 'General Merchandise')).toBe('shopping')
  })

  it('maps a fee label to Fees & Taxes, not to an excluded transfer', () => {
    // /transfer|withdrawal|fee/ used to send "Service Charges/Fees" to
    // Transfers, which dropped it out of every total.
    expect(run('QTX 88123', 'Service Charges/Fees')).toBe('fees')
  })

  it('still maps genuine transfer labels to Transfers', () => {
    expect(run('QTX 88123', 'Transfers')).toBe('transfers')
  })

  it('leaves a meaningless label to the sign fallback', () => {
    expect(run('QTX 88123', 'Other Expenses')).toBe('other')
  })
})

describe('mappingFitsHeaders', () => {
  const m: ColumnMapping = {
    date: 'Date',
    description: 'Description',
    amountMode: 'single',
    amount: 'Amount',
  }

  it('accepts headers that still carry every mapped column', () => {
    expect(mappingFitsHeaders(m, ['Date', 'Description', 'Amount', 'Balance'])).toBe(true)
  })

  it('rejects headers that lost one', () => {
    expect(mappingFitsHeaders(m, ['Date', 'Description'])).toBe(false)
  })
})
