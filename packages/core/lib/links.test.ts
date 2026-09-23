import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { autoDetectLinks, linkCandidates, resolveLinks } from './links'
import { assignTxKeys } from './txKey'
import { isRealIncome, isRefund, totalIncome, totalSpending } from './analysis'

/** Build a keyed list the way the store does, so `key` is populated. */
function keyed(rows: Omit<Transaction, 'id' | 'key'>[]): Transaction[] {
  const withIds = rows.map((r, i) => ({ ...r, id: `id-${i}` }))
  const keys = assignTxKeys(withIds)
  return withIds.map((t) => ({ ...t, key: keys.get(t.id) }))
}

const at = (date: string, description: string, amount: number, category = 'other') => ({
  date,
  description,
  amount,
  category,
})

/**
 * The installment-plan trio: a repair is bought, then moved onto a payment
 * plan, which the card reports as a credit plus an equal new charge.
 */
const PLAN = keyed([
  at('2026-07-23', 'TIMBERLINE AUTO REPAIR', -511.47, 'transport'),
  at('2026-08-05', 'FLEX PAY CREDIT-TIMBERLINE AUTO REPAIR', 511.47, 'income'),
  at('2026-08-05', 'FLEX PAY', -511.47, 'other'),
])
const [PURCHASE, CREDIT, PLAN_CHARGE] = PLAN

describe('autoDetectLinks', () => {
  it('pairs a plan credit with the equal plan charge beside it', () => {
    const found = autoDetectLinks(PLAN)
    expect(found).toEqual({ [CREDIT.key as string]: PLAN_CHARGE.key })
  })

  it('never links the credit to the original purchase', () => {
    expect(Object.values(autoDetectLinks(PLAN))).not.toContain(PURCHASE.key)
  })

  it('is idempotent — a second pass finds nothing new', () => {
    const first = autoDetectLinks(PLAN)
    expect(autoDetectLinks(PLAN, first)).toEqual({})
  })

  it('respects an unlink instead of re-making it', () => {
    // '' is the tombstone the store writes when the user breaks a link.
    expect(autoDetectLinks(PLAN, { [CREDIT.key as string]: '' })).toEqual({})
  })

  it('ignores a plan charge posted too long after the credit', () => {
    const far = keyed([
      at('2026-08-05', 'FLEX PAY CREDIT-TIMBERLINE AUTO REPAIR', 511.47),
      at('2026-09-20', 'FLEX PAY', -511.47),
    ])
    expect(autoDetectLinks(far)).toEqual({})
  })

  it('does not pair two credits with one charge', () => {
    const two = keyed([
      at('2026-08-05', 'FLEX PAY CREDIT-A', 100),
      at('2026-08-06', 'FLEX PAY CREDIT-B', 100),
      at('2026-08-05', 'FLEX PAY', -100),
    ])
    expect(Object.keys(autoDetectLinks(two))).toHaveLength(1)
  })
})

describe('resolveLinks — what a link does to the numbers', () => {
  it('leaves the trio counting the repair once, with no phantom income', () => {
    const rows = resolveLinks(PLAN, {}, autoDetectLinks(PLAN))
    // The credit is no longer income...
    expect(rows.some((t) => isRealIncome(t))).toBe(false)
    expect(totalIncome(rows)).toBe(0)
    // ...and the plan charge is cancelled by it, so the repair costs 511.47 once.
    expect(totalSpending(rows)).toBeCloseTo(511.47, 2)
  })

  it('files the credit under whatever its charge is filed under', () => {
    const rows = resolveLinks(PLAN, {}, autoDetectLinks(PLAN))
    const credit = rows.find((t) => t.key === CREDIT.key)!
    expect(credit.category).toBe(PLAN_CHARGE.category)
    expect(credit.treatment).toBe('reimbursement')
    expect(credit.linkedTo).toBe(PLAN_CHARGE.key)
  })

  it('tells the charge which credits point at it', () => {
    const rows = resolveLinks(PLAN, {}, autoDetectLinks(PLAN))
    expect(rows.find((t) => t.key === PLAN_CHARGE.key)!.linkedFrom).toEqual([CREDIT.key])
  })

  it('supports several partial repayments against one charge', () => {
    const rows = keyed([
      at('2026-07-01', 'GROUP DINNER', -120, 'dining'),
      at('2026-07-03', 'Zelle payment from Dana Whitlock', 40, 'zelle'),
      at('2026-07-04', 'Zelle payment from Sam Okafor', 40, 'zelle'),
    ])
    const [charge, a, b] = rows
    const resolved = resolveLinks(rows, {}, {
      [a.key as string]: charge.key as string,
      [b.key as string]: charge.key as string,
    })
    expect(resolved.find((t) => t.key === charge.key)!.linkedFrom).toHaveLength(2)
    // Your share of the dinner is what's left.
    expect(totalSpending(resolved)).toBeCloseTo(40, 2)
    expect(totalIncome(resolved)).toBe(0)
  })

  it('ignores a link whose partner is no longer imported', () => {
    const rows = keyed([at('2026-08-05', 'FLEX PAY CREDIT-X', 100)])
    const resolved = resolveLinks(rows, {}, { [rows[0].key as string]: 'missing#0' })
    expect(resolved[0].linkedTo).toBeUndefined()
    expect(resolved[0].treatment).toBeUndefined()
  })

  it('lets an explicit treatment beat the link', () => {
    const rows = resolveLinks(PLAN, { [CREDIT.key as string]: 'internal' }, autoDetectLinks(PLAN))
    expect(rows.find((t) => t.key === CREDIT.key)!.treatment).toBe('internal')
  })
})

describe('resolveLinks — treatments on their own', () => {
  const rows = keyed([
    at('2026-07-01', 'HARBOR POINT LABS PAYROLL', 2465, 'income'),
    at('2026-07-05', 'CASH APP*JORDAN AVERY', -160, 'other'),
    at('2026-07-06', 'Zelle payment from Dana Whitlock', 42.5, 'zelle'),
  ])
  const [pay, selfTransfer, paidBack] = rows

  it('keeps an internal transfer out of every total', () => {
    const resolved = resolveLinks(rows, { [selfTransfer.key as string]: 'internal' })
    const row = resolved.find((t) => t.key === selfTransfer.key)!
    expect(isRefund(row)).toBe(false)
    expect(totalSpending(resolved)).toBe(0)
    expect(totalIncome(resolved)).toBe(2465)
  })

  it('counts a reimbursement as a refund, not as income', () => {
    const resolved = resolveLinks(rows, { [paidBack.key as string]: 'reimbursement' })
    const row = resolved.find((t) => t.key === paidBack.key)!
    expect(isRefund(row)).toBe(true)
    expect(isRealIncome(row)).toBe(false)
    // Only the paycheck is income; the 42.50 nets against the 160 of spending
    // rather than adding to what was earned.
    expect(totalIncome(resolved)).toBe(2465)
    expect(totalSpending(resolved)).toBeCloseTo(117.5, 2)
  })

  it('leaves rows alone when nothing is marked', () => {
    const resolved = resolveLinks(rows)
    expect(resolved.every((t) => t.treatment === undefined)).toBe(true)
    expect(totalIncome(resolved)).toBe(pay.amount)
  })
})

describe('linkCandidates', () => {
  const rows = keyed([
    at('2026-07-01', 'RIVERMARK CLOTHING CO', -63.4, 'shopping'),
    at('2026-07-20', 'GREENLEAF SUPERMARKET', -63.4, 'groceries'),
    at('2026-07-22', 'RIVERMARK CLOTHING CO RETURN', 63.4, 'shopping'),
    at('2026-07-23', 'SOL TACO KITCHEN', -16.75, 'dining'),
    at('2026-07-24', 'NORTHSIDE GROCERY CO REFUND', 18.25, 'groceries'),
  ])
  const refund = rows[2]

  it('offers only opposite-sign rows of the same amount, nearest date first', () => {
    const found = linkCandidates(rows, refund)
    expect(found.map((t) => t.description)).toEqual([
      'GREENLEAF SUPERMARKET',
      'RIVERMARK CLOTHING CO',
    ])
  })

  it('never offers the row itself or another credit', () => {
    const found = linkCandidates(rows, refund, { anyAmount: true })
    expect(found.some((t) => t.id === refund.id)).toBe(false)
    expect(found.every((t) => t.amount < 0)).toBe(true)
  })

  it('widens to any amount for a partial repayment', () => {
    expect(linkCandidates(rows, refund, { anyAmount: true }).length).toBe(3)
  })

  it('filters by a search query', () => {
    const found = linkCandidates(rows, refund, { anyAmount: true, query: 'taco' })
    expect(found.map((t) => t.description)).toEqual(['SOL TACO KITCHEN'])
  })
})
