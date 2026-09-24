import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { merchantKey } from './merchant'
import {
  autoRecurringBill,
  budgetStatus,
  chargesInMonth,
  filterByRange,
  monthKey,
  monthlyTrend,
  netTotal,
  prevMonthKey,
  recurringBills,
  recurringPayments,
  shiftMonth,
  spendingByCategory,
  topMerchants,
  spendingHabits,
  totalIncome,
  totalRefunds,
  totalSpending,
  upcomingCharges,
  topExpenseGroups,
} from './analysis'

let n = 0
function tx(date: string, amount: number, category: string, extra: Partial<Transaction> = {}): Transaction {
  return { id: `t${n++}`, date, description: extra.description ?? `tx ${n}`, amount, category, ...extra }
}

describe('totals', () => {
  const txs = [
    tx('2026-04-01', 3000, 'income'),
    tx('2026-04-02', -100, 'groceries'),
    tx('2026-04-03', -500, 'transfers'), // excluded
    tx('2026-04-04', -75, 'zelle', { counts: true }), // promoted recurring transfer
  ]

  it('excludes transfers but honors counts: true', () => {
    expect(totalSpending(txs)).toBe(175)
    expect(totalIncome(txs)).toBe(3000)
    expect(netTotal(txs)).toBe(3000 - 175)
  })
})

describe('refunds', () => {
  const txs = [
    tx('2026-04-01', 3000, 'income'),
    tx('2026-04-02', -200, 'shopping'),
    tx('2026-04-20', 60, 'shopping'), // refund: positive in a spending category
    tx('2026-04-05', -100, 'groceries'),
  ]

  it('does not count refunds as income', () => {
    expect(totalIncome(txs)).toBe(3000)
    expect(totalRefunds(txs)).toBe(60)
  })

  it('nets refunds against spending, keeping the net invariant', () => {
    expect(totalSpending(txs)).toBe(240) // 300 spent − 60 refunded
    expect(netTotal(txs)).toBe(totalIncome(txs) - totalSpending(txs))
  })

  it('nets a refund inside its own category only', () => {
    const cats = spendingByCategory(txs)
    expect(cats.find((c) => c.category === 'shopping')?.total).toBe(140)
    expect(cats.find((c) => c.category === 'groceries')?.total).toBe(100)
  })

  it('drops a category a refund fully cancels out', () => {
    const fully = [tx('2026-04-02', -50, 'pets'), tx('2026-05-01', 50, 'pets')]
    expect(spendingByCategory(fully)).toHaveLength(0)
  })

  it('credits a months-later refund to the month it lands in', () => {
    const late = [tx('2026-03-10', -200, 'shopping'), tx('2026-05-02', 60, 'shopping')]
    const trend = monthlyTrend(late)
    expect(trend.find((p) => p.monthKey === '2026-03')?.spending).toBe(200)
    expect(trend.find((p) => p.monthKey === '2026-05')?.spending).toBe(-60)
    expect(trend.find((p) => p.monthKey === '2026-05')?.income).toBe(0)
  })
})

describe('month helpers', () => {
  const now = new Date(2026, 5, 15) // June 2026
  it('keys and shifts months across year boundaries', () => {
    expect(monthKey('2026-06-09')).toBe('2026-06')
    expect(prevMonthKey(now)).toBe('2026-05')
    expect(shiftMonth('2026-01', 1)).toBe('2025-12')
    expect(shiftMonth('2026-03', 14)).toBe('2025-01')
  })

  it('filters by range', () => {
    const txs = [tx('2026-06-01', -10, 'dining'), tx('2026-05-01', -20, 'dining'), tx('2025-06-01', -30, 'dining')]
    expect(filterByRange(txs, 'thisMonth', now)).toHaveLength(1)
    expect(filterByRange(txs, 'lastMonth', now)).toHaveLength(1)
    expect(filterByRange(txs, 'thisYear', now)).toHaveLength(2)
  })
})

describe('recurringPayments', () => {
  const monthly = (desc: string, months: string[], amount: number) =>
    months.map((m) => tx(`${m}-15`, -amount, 'loans', { description: desc }))

  it('qualifies a merchant repeating across 3+ months', () => {
    const txs = monthly('Student Loan Payment', ['2026-01', '2026-02', '2026-03'], 220)
    expect(recurringPayments(txs)).toHaveLength(1)
  })

  it('does not qualify with only 2 months and varying amounts', () => {
    const txs = [
      tx('2026-01-15', -220, 'loans', { description: 'Student Loan Payment' }),
      tx('2026-02-15', -180, 'loans', { description: 'Student Loan Payment' }),
    ]
    expect(recurringPayments(txs)).toHaveLength(0)
  })

  it('qualifies the same amount repeating 3+ times even within fewer months', () => {
    const txs = [
      tx('2026-01-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-01-15', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-02-05', -50, 'other', { description: 'Storage Unit' }),
    ]
    expect(recurringPayments(txs)).toHaveLength(1)
    expect(recurringPayments(txs)[0].fixed).toBe(true)
  })

  it('always includes the Subscriptions category and honors dismissals', () => {
    const txs = [tx('2026-06-01', -15.49, 'subscriptions', { description: 'Netflix' })]
    const [r] = recurringPayments(txs)
    expect(r.isSubscription).toBe(true)
    expect(recurringPayments(txs, {}, { [r.groupKey]: true })).toHaveLength(0)
  })
})

describe('Plaid logos on merchant summaries', () => {
  const logo = 'https://plaid-merchant-logos.plaid.com/walmart_1100.png'
  // Only one of the three rows came with a logo — the group still gets it.
  const walmart = ['2026-01', '2026-02', '2026-03'].map((m, i) =>
    tx(`${m}-09`, -38.62, 'shopping', { description: 'Walmart', ...(i === 1 && { logoUrl: logo }) }),
  )

  it('carries the logo onto top merchants, recurring groups and their charges', () => {
    expect(topMerchants(walmart)[0].logoUrl).toBe(logo)
    const [r] = recurringPayments(walmart)
    expect(r.logoUrl).toBe(logo)
    expect(upcomingCharges([r], {}, new Date(2026, 3, 1))[0].logoUrl).toBe(logo)
  })

  it('names the company behind a group, even when its label drops the clue', () => {
    const apple = ['2026-01', '2026-02', '2026-03'].map((m) =>
      tx(`${m}-15`, -2.99, 'subscriptions', { description: 'APPLE.COM/BILL' }),
    )
    const [r] = recurringPayments(apple)
    expect(r.merchant).toBe('Apple')
    expect(r.brand).toBe('apple')
    expect(topMerchants(apple)[0].brand).toBe('apple')
    expect(upcomingCharges([r], {}, new Date(2026, 3, 1))[0].brand).toBe('apple')
    // A name the user chose wins over the bank's descriptor.
    const aliased = recurringPayments(apple, { [merchantKey('APPLE.COM/BILL')]: 'Spotify' })[0]
    expect(aliased.brand).toBe('spotify')
  })

  it('adds no logo field for merchants without one', () => {
    const plain = walmart.map(({ logoUrl, ...t }) => t)
    expect('logoUrl' in topMerchants(plain)[0]).toBe(false)
    expect('logoUrl' in recurringPayments(plain)[0]).toBe(false)
    const local = [tx('2026-01-09', -6, 'dining', { description: 'CORNER COFFEE ROASTERS' })]
    expect('brand' in topMerchants(local)[0]).toBe(false)
  })
})

describe('autoRecurringBill', () => {
  it('detects a bill on its own, ignoring ★ flags', () => {
    const auto = ['2026-01', '2026-02', '2026-03'].map((m) =>
      tx(`${m}-15`, -220, 'loans', { description: 'Student Loan Payment', recurring: true }),
    )
    expect(autoRecurringBill(auto, 'student loan')).toBe(true)
  })

  it('is false for a group that only qualifies via its ★ flag', () => {
    const flaggedOnly = [tx('2026-06-01', -42, 'shopping', { description: 'Pottery Class', recurring: true })]
    expect(autoRecurringBill(flaggedOnly, 'pottery class')).toBe(false)
  })

  it('is false for a habit (varying repeat at a discretionary merchant)', () => {
    const habit = [
      tx('2026-01-12', -35.2, 'shopping', { description: 'Amazon Marketplace' }),
      tx('2026-02-12', -78.5, 'shopping', { description: 'Amazon Marketplace' }),
      tx('2026-03-12', -12.99, 'shopping', { description: 'Amazon Marketplace' }),
    ]
    expect(autoRecurringBill(habit, 'amazon marketplace')).toBe(false)
  })
})

describe('bill vs habit classification', () => {
  /** Same merchant, three months, varying amounts (no repeated amount). */
  const varying = (desc: string, category: string, amounts: [number, number, number]) => [
    tx('2026-01-12', -amounts[0], category, { description: desc }),
    tx('2026-02-12', -amounts[1], category, { description: desc }),
    tx('2026-03-12', -amounts[2], category, { description: desc }),
  ]

  it('files a varying discretionary repeat (Amazon) as a habit', () => {
    const [r] = recurringPayments(varying('Amazon Marketplace', 'shopping', [35.2, 78.5, 12.99]))
    expect(r.kind).toBe('habit')
  })

  it('files a varying utility (energy bill) as a bill', () => {
    const [r] = recurringPayments(varying('Champion Energy', 'utilities', [80, 95, 110]))
    expect(r.kind).toBe('bill')
  })

  it('files a fixed-amount repeat as a bill even in a discretionary category', () => {
    const txs = [
      tx('2026-01-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-02-05', -50, 'other', { description: 'Storage Unit' }),
      tx('2026-03-05', -50, 'other', { description: 'Storage Unit' }),
    ]
    expect(recurringPayments(txs)[0].kind).toBe('bill')
  })

  it('files subscriptions and ★-flagged groups as bills', () => {
    const sub = recurringPayments([
      tx('2026-06-01', -15.49, 'subscriptions', { description: 'Netflix' }),
    ])
    expect(sub[0].kind).toBe('bill')
    const flagged = recurringPayments(
      varying('Whataburger', 'dining', [9.5, 14.25, 22.8]).map((t) => ({ ...t, recurring: true })),
    )
    expect(flagged[0].kind).toBe('bill')
  })

  it('honors user re-filings and splits bills from habits', () => {
    const txs = [
      ...varying('Amazon Marketplace', 'shopping', [35.2, 78.5, 12.99]),
      ...varying('Champion Energy', 'utilities', [80, 95, 110]),
    ]
    expect(recurringBills(txs).map((r) => r.merchant)).toEqual(['Champion Energy'])
    expect(spendingHabits(txs).map((r) => r.merchant)).toEqual(['Amazon Marketplace'])

    const amazonKey = spendingHabits(txs)[0].groupKey
    const refiled = { [amazonKey]: 'bill' as const }
    expect(spendingHabits(txs, {}, {}, refiled)).toHaveLength(0)
    expect(recurringBills(txs, {}, {}, refiled)).toHaveLength(2)
  })
})

describe('calendar charges', () => {
  // A fixed-amount loan landing on the 5th across three months → one recurring bill.
  const loan = ['2026-01', '2026-02', '2026-03'].map((m) =>
    tx(`${m}-05`, -220, 'loans', { description: 'Student Loan Payment' }),
  )
  const now = new Date(2026, 5, 10) // June 10, 2026

  it('places a monthly bill on its typical day in the month grid', () => {
    const [r] = recurringPayments(loan)
    const charges = chargesInMonth([r], {}, now)
    expect(charges).toHaveLength(1)
    expect(charges[0].date).toBe('2026-06-05')
    expect(charges[0].day).toBe(5)
    expect(charges[0].amount).toBe(220)
  })

  it("honors the user's billing day over the inferred day", () => {
    const [r] = recurringPayments(loan)
    const meta = { [r.keys[0]]: { billingDay: 21 } }
    expect(chargesInMonth([r], meta, now)[0].date).toBe('2026-06-21')
  })

  it('rolls a monthly charge already past this month into next month for upcoming', () => {
    const [r] = recurringPayments(loan) // day 5, today is the 10th → due July 5
    expect(upcomingCharges([r], {}, now)[0].date).toBe('2026-07-05')
  })

  it('excludes cancelled subscriptions and only shows annual ones in their renewal month', () => {
    const netflix = recurringPayments([tx('2026-06-01', -15.49, 'subscriptions', { description: 'Netflix' })])[0]
    const ended = { [netflix.keys[0]]: { endedDate: '2026-05-01' } }
    expect(chargesInMonth([netflix], ended, now)).toHaveLength(0)

    const annual = { [netflix.keys[0]]: { cadence: 'annual' as const, renewalDate: '2026-09-01' } }
    expect(chargesInMonth([netflix], annual, now)).toHaveLength(0) // not due in June
    expect(upcomingCharges([netflix], annual, now, 120)[0].date).toBe('2026-09-01')
  })
})

describe('budgetStatus', () => {
  it('measures spend against budget for the month', () => {
    const txs = [tx('2026-06-02', -120, 'groceries'), tx('2026-05-02', -999, 'groceries')]
    const [s] = budgetStatus(txs, { groceries: 100 }, '2026-06')
    expect(s.spent).toBe(120)
    expect(s.over).toBe(true)
    expect(s.pct).toBeCloseTo(120)
  })
})

describe('topExpenseGroups', () => {
  const rows = (): Transaction[] => {
    let n = 0
    const t = (description: string, amount: number, category: string, key?: string): Transaction => ({
      id: `g${n++}`,
      date: '2026-07-01',
      description,
      amount,
      category,
      key: key ?? `k${n}`,
    })
    return [
      // One bill repeating — the case that made the ungrouped list useless.
      t('CEDARBROOK MTG PYMTS', -1845, 'rent'),
      t('CEDARBROOK MTG PYMTS', -1845, 'rent'),
      t('CEDARBROOK MTG PYMTS', -1845, 'rent'),
      // One large single purchase.
      t('VOLTIC ELECTRONICS', -1899, 'shopping', 'voltic'),
      // A merchant visited often for small amounts.
      t('CORNER COFFEE ROASTERS', -6.4, 'dining'),
      t('CORNER COFFEE ROASTERS', -6.9, 'dining'),
    ]
  }

  it('ranks merchants by what they cost in total, not by biggest single row', () => {
    const groups = topExpenseGroups(rows(), 5)
    expect(groups[0].label).toMatch(/Cedarbrook/)
    expect(groups[0].total).toBeCloseTo(5535, 2)
    expect(groups[0].count).toBe(3)
    expect(groups[1].label).toMatch(/Voltic/)
  })

  it('carries the ids so a row can drill into its own charges', () => {
    expect(topExpenseGroups(rows(), 5)[0].ids).toHaveLength(3)
  })

  it('names the company behind a merchant so the list can show its logo', () => {
    const list: Transaction[] = [
      { id: 'a1', date: '2026-07-01', description: 'Apple', amount: -900, category: 'shopping' },
      { id: 'a2', date: '2026-07-02', description: 'APPLE.COM/BILL 866-712-7753 CA', amount: -300, category: 'subscriptions' },
      { id: 'c1', date: '2026-07-03', description: 'Jpmorganchase', amount: -500, category: 'utilities' },
      { id: 'l1', date: '2026-07-04', description: 'CORNER COFFEE ROASTERS', amount: -50, category: 'dining' },
    ]
    const byLabel = Object.fromEntries(topExpenseGroups(list, 5).map((g) => [g.label, g]))
    expect(byLabel['Apple'].brand).toBe('apple')
    expect(byLabel['Jpmorganchase'].brand).toBe('chase')
    expect(byLabel['Corner Coffee Roasters'].brand).toBeUndefined()
  })

  it('carries Plaid’s own logo when a merchant has no bundled one', () => {
    const list: Transaction[] = [
      { id: 'p1', date: '2026-07-01', description: 'HEB #482', amount: -80, category: 'groceries', logoUrl: 'https://example.test/heb.png' },
      { id: 'p2', date: '2026-07-05', description: 'HEB #482', amount: -60, category: 'groceries' },
    ]
    const [g] = topExpenseGroups(list, 5)
    expect(g.logoUrl).toBe('https://example.test/heb.png')
    expect(g.brand).toBeUndefined()
  })

  it('reports the category most of the money sits in', () => {
    expect(topExpenseGroups(rows(), 5)[0].category).toBe('rent')
  })

  it('nets an unlinked refund against its own merchant', () => {
    const list = rows()
    list.push({
      id: 'r1',
      date: '2026-07-20',
      description: 'VOLTIC ELECTRONICS',
      amount: 400,
      category: 'shopping',
      key: 'refund1',
    })
    const voltic = topExpenseGroups(list, 5).find((g) => /Voltic/.test(g.label))!
    expect(voltic.total).toBeCloseTo(1499, 2)
  })

  it('nets a LINKED refund against the charge it offsets, not its own name', () => {
    // Banks rarely describe a return the way they described the purchase.
    const list = rows()
    list.push({
      id: 'r2',
      date: '2026-07-20',
      description: 'ONLINE RETURN CREDIT 88213',
      amount: 400,
      category: 'shopping',
      key: 'refund2',
      treatment: 'reimbursement',
      linkedTo: 'voltic',
    })
    const groups = topExpenseGroups(list, 5)
    expect(groups.find((g) => /Voltic/.test(g.label))!.total).toBeCloseTo(1499, 2)
    expect(groups.some((g) => /Return Credit/i.test(g.label))).toBe(false)
  })

  it('drops a merchant a refund cancelled out entirely', () => {
    const list = rows()
    list.push({
      id: 'r3',
      date: '2026-07-20',
      description: 'VOLTIC ELECTRONICS',
      amount: 1899,
      category: 'shopping',
      key: 'refund3',
    })
    expect(topExpenseGroups(list, 5).some((g) => /Voltic/.test(g.label))).toBe(false)
  })
})
