import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { needsReview, transferReviewGroups, unreviewedTransferCount } from './transferReview'
import type { TransferRules } from './transferReview'
import { isSelfTransfer } from './owner'
import { assignTxKeys } from './txKey'
import { resolveLinks } from './links'

const OWNER = ['Jordan Avery', 'Averybank']

/** Mirrors what the store does before the review ever sees a row. */
function resolved(rows: Omit<Transaction, 'id' | 'key'>[]): Transaction[] {
  const withIds = rows.map((r, i) => ({ ...r, id: `id-${i}` }))
  const keys = assignTxKeys(withIds)
  const keyed = withIds.map((t) => ({ ...t, key: keys.get(t.id) }))
  const derived: Record<string, 'internal'> = {}
  for (const t of keyed) {
    if (t.key && isSelfTransfer(t.description, OWNER)) derived[t.key] = 'internal'
  }
  return resolveLinks(keyed, derived, {})
}

const at = (date: string, description: string, amount: number, category = 'zelle') => ({
  date,
  description,
  amount,
  category,
})

const ROWS = resolved([
  // Self — should never reach the queue.
  at('2026-07-02', 'Zelle payment to JORDAN  AVERY', -250),
  at('2026-07-02', 'Zelle payment from Averybank JPM99cwmvuv3', 250),
  at('2026-07-03', 'Online Transfer to SAV 4821', -400, 'transfers'),
  // Needs a decision.
  at('2026-07-11', 'Zelle payment to Marcus Ellison', -450),
  at('2026-07-24', 'Zelle payment to Marcus Ellison', -275),
  at('2026-07-08', 'Zelle payment from Renee Avery', 300),
  at('2026-07-20', 'CASH APP*DANA WHITLOCK', 61),
  // Not a transfer at all.
  at('2026-07-05', 'CORNER COFFEE ROASTERS', -6.4, 'dining'),
])

describe('needsReview', () => {
  it('hides the transfers the owner made to themselves', () => {
    const self = ROWS.filter((t) => /JORDAN|Averybank|SAV 4821/i.test(t.description))
    expect(self).toHaveLength(3)
    expect(self.every((t) => t.treatment === 'internal')).toBe(true)
    expect(self.some((t) => needsReview(t))).toBe(false)
  })

  it('keeps transfers to other people', () => {
    expect(ROWS.filter((t) => needsReview(t))).toHaveLength(4)
  })

  it('ignores ordinary spending', () => {
    expect(needsReview(ROWS.find((t) => /COFFEE/.test(t.description))!)).toBe(false)
  })

  it('drops a row once its counterparty has a rule', () => {
    const rules: TransferRules = {
      'marcus ellison': { category: 'home', reviewed: true, decidedAt: '2026-07-25T00:00:00Z' },
    }
    expect(unreviewedTransferCount(ROWS, rules)).toBe(2)
  })

  it('drops a row the user already re-filed by hand', () => {
    const edited = ROWS.map((t) =>
      /Renee/.test(t.description) ? { ...t, overridden: true } : t,
    )
    expect(unreviewedTransferCount(edited)).toBe(3)
  })

  it('drops a row the user already gave a treatment', () => {
    const edited = ROWS.map((t) =>
      /DANA/.test(t.description) ? { ...t, treatment: 'reimbursement' as const } : t,
    )
    expect(unreviewedTransferCount(edited)).toBe(3)
  })
})

describe('transferReviewGroups', () => {
  it('groups by counterparty, biggest first', () => {
    const groups = transferReviewGroups(ROWS)
    expect(groups.map((g) => g.label)).toEqual(['Marcus Ellison', 'Renee Avery', 'Dana Whitlock'])
  })

  it('totals each direction separately', () => {
    const [marcus, renee] = transferReviewGroups(ROWS)
    expect(marcus.count).toBe(2)
    expect(marcus.moneyOut).toBe(725)
    expect(marcus.moneyIn).toBe(0)
    expect(renee.moneyIn).toBe(300)
    expect(renee.moneyOut).toBe(0)
  })

  it('carries the ids so the queue can act on them', () => {
    const marcus = transferReviewGroups(ROWS)[0]
    expect(marcus.ids).toHaveLength(2)
    expect(marcus.lastDate).toBe('2026-07-24')
  })

  it('empties out once everything has been ruled on', () => {
    const rules: TransferRules = Object.fromEntries(
      transferReviewGroups(ROWS).map((g) => [
        g.key,
        { reviewed: true as const, decidedAt: '2026-07-25T00:00:00Z' },
      ]),
    )
    expect(transferReviewGroups(ROWS, rules)).toEqual([])
    expect(unreviewedTransferCount(ROWS, rules)).toBe(0)
  })

  it('applies an existing rule to a transfer imported later', () => {
    const rules: TransferRules = {
      'marcus ellison': { category: 'home', reviewed: true, decidedAt: '2026-07-25T00:00:00Z' },
    }
    const later = resolved([at('2026-09-02', 'Zelle payment to Marcus Ellison', -180)])
    expect(unreviewedTransferCount(later, rules)).toBe(0)
  })
})
