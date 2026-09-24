import { describe, expect, it } from 'vitest'
import { loadSampleTransactions, SAMPLE_ACCOUNTS, sampleCsv } from './sampleData'
import { BUILTIN_CATEGORIES } from '../lib/categories'
import {
  currentMonthKey,
  filterByRange,
  isRefund,
  monthKey,
  prevMonthKey,
  totalIncome,
  totalSpending,
} from '../lib/analysis'
import { generateQuiz } from '../lib/quiz'
import { buildYearSheet } from '../lib/yearly'
import { guessMapping, rowsToTransactions } from '../lib/importCsv'
import { brandSlugFor } from '../lib/merchantLogos'

// A fixed "now" so every expectation is reproducible. Deliberately mid-month
// and mid-week, so the current month is partial the way a real export is.
const NOW = new Date(2026, 8, 22) // 22 Sep 2026
const tx = loadSampleTransactions(NOW)

describe('shape', () => {
  it('produces a year of transactions', () => {
    expect(tx.length).toBeGreaterThan(300)
  })

  it('is deterministic for a given now', () => {
    const again = loadSampleTransactions(NOW)
    // Ids are minted fresh each call by design; everything else must match.
    expect(again.map(({ id, ...rest }) => rest)).toEqual(tx.map(({ id, ...rest }) => rest))
  })

  it('never invents a transaction in the future', () => {
    expect(tx.every((t) => t.date <= '2026-09-22')).toBe(true)
  })

  it('covers a rolling 12 months ending this month', () => {
    const months = new Set(tx.map((t) => monthKey(t.date)))
    expect(months.size).toBe(12)
    expect(months.has(currentMonthKey(NOW))).toBe(true)
    expect(months.has(prevMonthKey(NOW))).toBe(true)
    expect(months.has('2025-10')).toBe(true)
  })
})

describe('every time range has something to show', () => {
  it.each(['thisMonth', 'lastMonth', 'thisYear'] as const)('%s is not empty', (range) => {
    const rows = filterByRange(tx, range, NOW)
    expect(rows.length).toBeGreaterThan(0)
    expect(totalSpending(rows)).toBeGreaterThan(0)
    expect(totalIncome(rows)).toBeGreaterThan(0)
  })
})

describe('coverage', () => {
  it('has rows in every built-in category', () => {
    const present = new Set(tx.map((t) => t.category))
    const missing = BUILTIN_CATEGORIES.map((c) => c.id).filter((id) => !present.has(id))
    expect(missing).toEqual([])
  })

  it('has rows from every sample account', () => {
    for (const account of SAMPLE_ACCOUNTS) {
      expect(tx.filter((t) => t.sourceId === account.id).length).toBeGreaterThan(0)
    }
  })

  it('shows off the patterns the dashboard looks for', () => {
    const count = (re: RegExp) => tx.filter((t) => re.test(t.description)).length
    // A frequent merchant, and one clear largest purchase.
    expect(count(/STARBUCKS/)).toBeGreaterThan(20)
    const biggest = tx.filter((t) => t.amount < 0).sort((a, b) => a.amount - b.amount)[0]
    expect(biggest.description).toMatch(/VOLTIC/)
    // A big repeating bill, so grouped top-expenses has an "x N" to show.
    expect(count(/CEDARBROOK MTG/)).toBe(12)
    // Refunds that must net against spending rather than read as income.
    expect(tx.some((t) => isRefund(t))).toBe(true)
    // The installment trio, and a same-name/different-amount pair.
    expect(count(/FLEX PAY/)).toBe(2)
    const willow = tx.filter((t) => /WILLOW BEND/.test(t.description))
    expect(new Set(willow.map((t) => t.amount)).size).toBe(2)
  })

  it('mixes merchants we have logos for with ones we don’t', () => {
    // Real chains show their logo; invented local names show none — both
    // should be visible in dining, subscriptions and the recurring bills.
    const withLogo = (category: string, logo: boolean) =>
      tx.some((t) => t.category === category && !!brandSlugFor(t.description) === logo)
    for (const category of ['dining', 'subscriptions', 'transport', 'utilities']) {
      expect(withLogo(category, true)).toBe(true)
      expect(withLogo(category, false)).toBe(true)
    }
    expect(tx.some((t) => /NETFLIX/.test(t.description) && t.category === 'entertainment')).toBe(true)
  })

  it('puts the duplex costs on the Business / Rental ledger', () => {
    const business = tx.filter((t) => t.category === 'business')
    expect(business.length).toBeGreaterThan(0)
    // All costs — rent RECEIVED stays income, because a spending category
    // would make money in read as a refund against it.
    expect(business.every((t) => t.amount < 0)).toBe(true)
    expect(business.some((t) => /TURBOTENANT/.test(t.description))).toBe(true)
    expect(business.some((t) => /KEYSTONE LEASING/.test(t.description))).toBe(true)
  })

  it('leaves the personal power bill alone while re-filing the unit’s', () => {
    // Same energy company, two ledgers — a narrow rule beating a broad one.
    const power = tx.filter((t) => /BRIGHTLINE ENERGY/.test(t.description))
    expect(power.some((t) => t.category === 'utilities')).toBe(true)
    expect(power.some((t) => t.category === 'business')).toBe(true)
    expect(
      power.filter((t) => /UNIT B/.test(t.description)).every((t) => t.category === 'business'),
    ).toBe(true)
    // The tenant's rent also mentions the unit, and must stay income.
    expect(
      tx.filter((t) => /MAPLE COURT/.test(t.description)).every((t) => t.category === 'income'),
    ).toBe(true)
  })

  it('keeps rent received out of the housing category', () => {
    const rentIn = tx.filter((t) => /MAPLE COURT RENT/.test(t.description))
    expect(rentIn.length).toBeGreaterThan(0)
    expect(rentIn.every((t) => t.category === 'income')).toBe(true)
  })

  it('leaves the card statement free of its own payment rows', () => {
    // Import drops them, so the loaded sample must not contain them either —
    // the checking side already records that money leaving.
    expect(tx.some((t) => /PAYMENT - THANK YOU/.test(t.description))).toBe(false)
    expect(tx.some((t) => /Sample Credit Card ending in/.test(t.description))).toBe(true)
  })
})

describe('downstream features', () => {
  it('builds a full quiz without throwing', () => {
    const quiz = generateQuiz(tx, { now: NOW })
    expect(quiz.length).toBeGreaterThanOrEqual(5)
    expect(quiz.every((q) => q.options.length > 1)).toBe(true)
  })

  it('fills the Year Sheet with actuals through the current month', () => {
    const sheet = buildYearSheet(tx, 2026, {}, NOW)
    expect(sheet.lastActualMonth).toBe(8)
    expect(sheet.income.total).toBeGreaterThan(0)
    expect(sheet.expenseSections.length).toBeGreaterThan(3)
  })
})

describe('sampleCsv', () => {
  it('emits one re-importable file per account', () => {
    for (const account of SAMPLE_ACCOUNTS) {
      const csv = sampleCsv(account.id, NOW)
      const [header, ...lines] = csv.split('\n')
      expect(header).toBe('Date,Description,Amount')
      expect(lines.length).toBeGreaterThan(0)

      const rows = lines.map((line) => {
        const [date, rest] = [line.slice(0, 10), line.slice(11)]
        const lastComma = rest.lastIndexOf(',')
        return {
          Date: date,
          Description: rest.slice(0, lastComma).replace(/^"|"$/g, '').replace(/""/g, '"'),
          Amount: rest.slice(lastComma + 1),
        }
      })
      const m = guessMapping(['Date', 'Description', 'Amount'])
      m.accountType = account.accountType
      const res = rowsToTransactions(rows, m, { sourceId: account.id })
      expect(res.skipped).toBe(0)
      expect(res.transactions.length + res.droppedPayments).toBe(lines.length)
    }
  })

  it('keeps the card payments in the download, so a re-import drops them', () => {
    const csv = sampleCsv('sample-credit', NOW)
    expect(csv).toContain('PAYMENT - THANK YOU')
  })
})
