import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import {
  checkIn,
  DEFAULT_GAME_STATE,
  levelForXp,
  levelProgress,
  levelTitle,
  prevDayKey,
  quizXp,
  XP,
  xpForLevel,
} from './gamification'

const base: GameState = { ...DEFAULT_GAME_STATE }

describe('checkIn', () => {
  it('is idempotent within a day (returns the same reference)', () => {
    const first = checkIn(base, '2026-06-09')
    expect(checkIn(first, '2026-06-09')).toBe(first)
  })

  it('starts a streak at 1 and awards check-in + bonus XP', () => {
    const s = checkIn(base, '2026-06-09')
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(1)
    expect(s.xp).toBe(XP.dailyCheckIn + 1 * XP.streakBonusPerDay)
  })

  it('extends the streak on consecutive days', () => {
    const day1 = checkIn(base, '2026-06-09')
    const day2 = checkIn(day1, '2026-06-10')
    expect(day2.streak).toBe(2)
    expect(day2.xp - day1.xp).toBe(XP.dailyCheckIn + 2 * XP.streakBonusPerDay)
  })

  it('resets the streak after a gap but keeps bestStreak', () => {
    const long: GameState = { ...base, streak: 9, bestStreak: 9, lastActiveDay: '2026-06-01' }
    const s = checkIn(long, '2026-06-09')
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(9)
  })

  it('caps the streak bonus', () => {
    const long: GameState = { ...base, streak: 99, bestStreak: 99, lastActiveDay: '2026-06-08' }
    const s = checkIn(long, '2026-06-09')
    expect(s.xp).toBe(XP.dailyCheckIn + XP.streakBonusCap)
  })

  it('preserves badges through a check-in (regression: object spread)', () => {
    const withBadge: GameState = { ...base, badges: { 'first-import': '2026-06-01' } }
    const s = checkIn(withBadge, '2026-06-09')
    expect(s.badges).toEqual({ 'first-import': '2026-06-01' })
  })
})

describe('prevDayKey', () => {
  it('handles month and year boundaries', () => {
    expect(prevDayKey('2026-06-01')).toBe('2026-05-31')
    expect(prevDayKey('2026-01-01')).toBe('2025-12-31')
    expect(prevDayKey('2026-03-01')).toBe('2026-02-28')
    expect(prevDayKey('2024-03-01')).toBe('2024-02-29') // leap year
  })
})

describe('quizXp', () => {
  it('awards per-correct plus completion', () => {
    expect(quizXp(3, 10)).toBe(3 * XP.quizPerCorrect + XP.quizCompletion)
  })
  it('adds the perfect bonus only on a clean sweep', () => {
    expect(quizXp(10, 10)).toBe(10 * XP.quizPerCorrect + XP.quizCompletion + XP.quizPerfectBonus)
    expect(quizXp(0, 0)).toBe(XP.quizCompletion)
  })
})

describe('levels', () => {
  it('maps XP to levels at the documented thresholds', () => {
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(300)).toBe(3)
  })

  it('clamps titles past the end of the list', () => {
    expect(levelTitle(1)).toBe('Steward in Training')
    expect(levelTitle(9)).toBe('Good & Faithful Steward')
    expect(levelTitle(50)).toBe('Good & Faithful Steward')
  })

  it('reports progress inside the current level', () => {
    const p = levelProgress(150) // level 2 spans 100..300
    expect(p.level).toBe(2)
    expect(p.into).toBe(50)
    expect(p.span).toBe(200)
    expect(p.pct).toBe(25)
  })
})
