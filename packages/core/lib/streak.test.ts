import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { DEFAULT_GAME_STATE } from './gamification'
import { countedToday, liveStreak, STREAK_GOALS, streakProgress } from './streak'

const game = (streak: number, lastActiveDay: string): GameState => ({
  ...DEFAULT_GAME_STATE,
  streak,
  bestStreak: streak,
  lastActiveDay,
})

describe('streakProgress', () => {
  it('runs toward a week first', () => {
    expect(streakProgress(0)).toMatchObject({ passed: null, from: 0, reached: false, toGo: 7, fraction: 0 })
    expect(streakProgress(0).goal.days).toBe(7)
    const p = streakProgress(3)
    expect(p).toMatchObject({ from: 0, reached: false, toGo: 4 })
    expect(p.fraction).toBeCloseTo(3 / 7)
  })

  it('marks the goal day itself, with the stretch full', () => {
    const p = streakProgress(7)
    expect(p).toMatchObject({ from: 0, reached: true, toGo: 0, fraction: 1 })
    expect(p.goal.name).toBe('1 week')
  })

  it('starts the next stretch the day after a goal', () => {
    const p = streakProgress(8)
    expect(p.passed?.name).toBe('1 week')
    expect(p.from).toBe(7)
    expect(p.goal.days).toBe(14)
    expect(p.toGo).toBe(6)
    expect(p.fraction).toBeCloseTo(1 / 7)
  })

  it('climbs week, two weeks, a month and on', () => {
    expect(STREAK_GOALS.map((g) => g.days)).toEqual([7, 14, 30, 60, 100, 180, 365])
    expect(streakProgress(15)).toMatchObject({ from: 14, toGo: 15 })
    expect(streakProgress(30)).toMatchObject({ from: 14, reached: true })
    expect(streakProgress(200)).toMatchObject({ from: 180, toGo: 165 })
  })

  it('keeps going a year at a time past the last goal', () => {
    const p = streakProgress(366)
    expect(p.passed?.name).toBe('1 year')
    expect(p.from).toBe(365)
    expect(p.goal).toMatchObject({ days: 730, name: '2 years', shout: '2 YEARS!' })
    expect(streakProgress(730).reached).toBe(true)
    expect(streakProgress(731)).toMatchObject({ from: 730, passed: { name: '2 years' }, goal: { days: 1095 } })
  })

  it('every goal can be shouted and named', () => {
    for (const g of STREAK_GOALS) {
      expect(g.shout).toMatch(/!$/)
      expect(g.name.length).toBeGreaterThan(0)
      expect(g.prose.length).toBeGreaterThan(0)
    }
  })
})

describe('liveStreak', () => {
  it('is alive when the last counted day is today', () => {
    expect(liveStreak(game(5, '2026-10-06'), '2026-10-06')).toBe(5)
    expect(countedToday(game(5, '2026-10-06'), '2026-10-06')).toBe(true)
  })

  it('is still alive (not yet counted) when it was yesterday', () => {
    expect(liveStreak(game(5, '2026-10-05'), '2026-10-06')).toBe(5)
    expect(countedToday(game(5, '2026-10-05'), '2026-10-06')).toBe(false)
  })

  it('reads 0 after a missed day, though the stored run is unchanged', () => {
    expect(liveStreak(game(5, '2026-10-04'), '2026-10-06')).toBe(0)
  })

  it('handles month boundaries and a brand-new state', () => {
    expect(liveStreak(game(9, '2026-09-30'), '2026-10-01')).toBe(9)
    expect(liveStreak(DEFAULT_GAME_STATE, '2026-10-06')).toBe(0)
  })
})
