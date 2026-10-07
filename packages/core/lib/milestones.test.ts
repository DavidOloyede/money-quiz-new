import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { checkIn, DEFAULT_GAME_STATE, levelTitle, streakDayXp, xpForLevel } from './gamification'
import { milestonesBetween } from './milestones'

const at = (xp: number, badges: Record<string, string> = {}): GameState => ({
  ...DEFAULT_GAME_STATE,
  xp,
  badges,
})

describe('milestonesBetween', () => {
  it('finds nothing when nothing crossed a line', () => {
    expect(milestonesBetween(at(10), at(60))).toEqual([])
    expect(milestonesBetween(at(10, { 'first-import': 'x' }), at(10, { 'first-import': 'x' }))).toEqual([])
  })

  it('spots a level-up with the new title', () => {
    const [m] = milestonesBetween(at(xpForLevel(2) - 5), at(xpForLevel(2) + 5))
    expect(m).toEqual({ kind: 'level', from: 1, to: 2, title: levelTitle(2) })
  })

  it('reports a multi-level jump as one step to the final level', () => {
    const [m] = milestonesBetween(at(0), at(xpForLevel(4)))
    expect(m).toMatchObject({ kind: 'level', from: 1, to: 4 })
  })

  it('never celebrates losing XP', () => {
    expect(milestonesBetween(at(xpForLevel(3)), at(0))).toEqual([])
  })

  it('groups badges earned together, in the badge case order', () => {
    const [m] = milestonesBetween(at(0), at(0, { 'first-fruits': 'x', 'first-import': 'x' }))
    expect(m.kind).toBe('badges')
    if (m.kind === 'badges') expect(m.badges.map((b) => b.id)).toEqual(['first-import', 'first-fruits'])
  })

  it('ignores badges already held and ids it does not know', () => {
    const prev = at(0, { 'first-import': 'x' })
    const next = at(0, { 'first-import': 'x', 'retired-badge': 'x' })
    expect(milestonesBetween(prev, next)).toEqual([])
  })

  it('puts the level-up before the badges when both happen', () => {
    const kinds = milestonesBetween(at(0), at(xpForLevel(2), { 'quiz-perfect': 'x' })).map((m) => m.kind)
    expect(kinds).toEqual(['level', 'badges'])
  })
})

describe('milestonesBetween: the streak', () => {
  it('celebrates the day an answer extends the streak', () => {
    const before = { ...at(0), streak: 3, bestStreak: 3, lastActiveDay: '2026-10-05' }
    const after = checkIn(before, '2026-10-06')
    expect(milestonesBetween(before, after)).toEqual([
      { kind: 'streak', from: 3, to: 4, xp: streakDayXp(4) },
    ])
  })

  it('starts from 0 when the streak had lapsed, or never begun', () => {
    const lapsed = { ...at(0), streak: 9, bestStreak: 9, lastActiveDay: '2026-09-01' }
    const [m] = milestonesBetween(lapsed, checkIn(lapsed, '2026-10-06'))
    expect(m).toMatchObject({ kind: 'streak', from: 0, to: 1 })
    const [first] = milestonesBetween(at(0), checkIn(at(0), '2026-10-06'))
    expect(first).toMatchObject({ kind: 'streak', from: 0, to: 1 })
  })

  it('stays quiet for later answers the same day', () => {
    const today = checkIn(at(0), '2026-10-06')
    expect(milestonesBetween(today, checkIn(today, '2026-10-06'))).toEqual([])
    expect(milestonesBetween(today, { ...today, xp: today.xp + 15 })).toEqual([])
  })

  it('puts the streak ahead of the level-up its XP caused', () => {
    const before = { ...at(xpForLevel(2) - 1), streak: 6, bestStreak: 6, lastActiveDay: '2026-10-05' }
    const kinds = milestonesBetween(before, checkIn(before, '2026-10-06')).map((m) => m.kind)
    expect(kinds).toEqual(['streak', 'level'])
  })
})
