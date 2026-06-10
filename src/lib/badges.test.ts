import { describe, expect, it } from 'vitest'
import type { GameState, Transaction } from '../types'
import { awardBadges, BADGES, earnedBadgeIds, type BadgeInputs } from './badges'
import { DEFAULT_GAME_STATE } from './gamification'

let n = 0
function tx(date: string, amount: number, category: string): Transaction {
  return { id: `t${n++}`, date, description: `tx ${n}`, amount, category }
}

const noInputs: BadgeInputs = {
  transactions: [],
  quizHistory: [],
  hasImported: false,
  paidOffCount: 0,
}
const game: GameState = { ...DEFAULT_GAME_STATE }

describe('earnedBadgeIds', () => {
  it('earns nothing with no activity', () => {
    expect(earnedBadgeIds(game, noInputs)).toEqual([])
  })

  it('awards first-import and debt-slayer from flags', () => {
    const ids = earnedBadgeIds(game, { ...noInputs, hasImported: true, paidOffCount: 1 })
    expect(ids).toContain('first-import')
    expect(ids).toContain('debt-slayer')
  })

  it('awards streak badges from bestStreak', () => {
    expect(earnedBadgeIds({ ...game, bestStreak: 7 }, noInputs)).toContain('streak-7')
    expect(earnedBadgeIds({ ...game, bestStreak: 6 }, noInputs)).not.toContain('streak-7')
    expect(earnedBadgeIds({ ...game, bestStreak: 30 }, noInputs)).toContain('streak-30')
  })

  it('awards quiz-perfect only on a clean sweep', () => {
    const perfect = { ...noInputs, quizHistory: [{ at: '2026-06-01T00:00:00Z', correct: 8, total: 8 }] }
    const close = { ...noInputs, quizHistory: [{ at: '2026-06-01T00:00:00Z', correct: 7, total: 8 }] }
    expect(earnedBadgeIds(game, perfect)).toContain('quiz-perfect')
    expect(earnedBadgeIds(game, close)).not.toContain('quiz-perfect')
  })

  it('awards cheerful-giver for 3 consecutive giving months, across a year boundary', () => {
    const giving = {
      ...noInputs,
      transactions: [
        tx('2025-11-05', -100, 'tithes'),
        tx('2025-12-05', -100, 'tithes'),
        tx('2026-01-05', -100, 'charity'),
      ],
    }
    expect(earnedBadgeIds(game, giving)).toContain('cheerful-giver')
  })

  it('does not award cheerful-giver for non-consecutive months', () => {
    const gappy = {
      ...noInputs,
      transactions: [
        tx('2026-01-05', -100, 'tithes'),
        tx('2026-02-05', -100, 'tithes'),
        tx('2026-04-05', -100, 'tithes'),
      ],
    }
    expect(earnedBadgeIds(game, gappy)).not.toContain('cheerful-giver')
  })

  it('awards first-fruits at exactly 10% of a month\'s income', () => {
    const exact = {
      ...noInputs,
      transactions: [tx('2026-04-01', 3000, 'income'), tx('2026-04-05', -300, 'tithes')],
    }
    const under = {
      ...noInputs,
      transactions: [tx('2026-04-01', 3000, 'income'), tx('2026-04-05', -299, 'tithes')],
    }
    expect(earnedBadgeIds(game, exact)).toContain('first-fruits')
    expect(earnedBadgeIds(game, under)).not.toContain('first-fruits')
  })
})

describe('awardBadges', () => {
  const now = new Date('2026-06-09T12:00:00Z')

  it('returns the same reference when nothing is new (StrictMode-safe)', () => {
    expect(awardBadges(game, noInputs, now)).toBe(game)
    const once = awardBadges(game, { ...noInputs, hasImported: true }, now)
    expect(awardBadges(once, { ...noInputs, hasImported: true }, now)).toBe(once)
  })

  it('stamps newly earned badges with the award date', () => {
    const s = awardBadges(game, { ...noInputs, hasImported: true }, now)
    expect(s.badges['first-import']).toBe(now.toISOString())
  })

  it('never un-awards and keeps the original earned date', () => {
    const earned: GameState = { ...game, badges: { 'first-import': '2026-01-01T00:00:00.000Z' } }
    // Inputs no longer satisfy the condition (hasImported false) — badge stays.
    const s = awardBadges(earned, noInputs, now)
    expect(s.badges['first-import']).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('BADGES definitions', () => {
  it('have unique ids and complete display fields', () => {
    const ids = BADGES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of BADGES) {
      expect(b.label).toBeTruthy()
      expect(b.emoji).toBeTruthy()
      expect(b.description).toBeTruthy()
    }
  })
})
