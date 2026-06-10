/**
 * Points (XP), levels, and the daily streak. Pure helpers — the store owns the
 * persisted GameState and calls these to update it. Using the app each day
 * keeps the streak alive; quizzes and imports earn extra XP; XP adds up to
 * levels with fun titles.
 */
import type { GameState } from '../types'

export const DEFAULT_GAME_STATE: GameState = {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: '',
  badges: {},
}

/** How many points each action is worth. */
export const XP = {
  /** Opening the app on a new day. */
  dailyCheckIn: 10,
  /** Extra per consecutive day, on top of the check-in (capped). */
  streakBonusPerDay: 2,
  streakBonusCap: 30,
  /** Per correct quiz answer. */
  quizPerCorrect: 10,
  /** Finishing a quiz at all. */
  quizCompletion: 15,
  /** Acing every question. */
  quizPerfectBonus: 25,
  /** Importing a CSV or syncing a bank. */
  import: 25,
} as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar day as YYYY-MM-DD (streaks follow the user's clock, not UTC). */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The day before a YYYY-MM-DD key. */
export function prevDayKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) - 1))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/**
 * Record a day of activity. Idempotent per day: the first visit of the day
 * extends (or restarts) the streak and awards check-in + streak-bonus XP;
 * later visits the same day change nothing.
 */
export function checkIn(state: GameState, day: string = todayKey()): GameState {
  if (state.lastActiveDay === day) return state
  const streak = state.lastActiveDay === prevDayKey(day) ? state.streak + 1 : 1
  const bonus = Math.min(streak * XP.streakBonusPerDay, XP.streakBonusCap)
  return {
    ...state, // keep badges (and future fields) intact
    xp: state.xp + XP.dailyCheckIn + bonus,
    streak,
    bestStreak: Math.max(streak, state.bestStreak),
    lastActiveDay: day,
  }
}

/** XP earned by a finished quiz. */
export function quizXp(correct: number, total: number): number {
  const perfect = total > 0 && correct === total ? XP.quizPerfectBonus : 0
  return correct * XP.quizPerCorrect + XP.quizCompletion + perfect
}

/** Total XP needed to *reach* a level (level 1 = 0, 2 = 100, 3 = 300, 4 = 600…). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export function levelForXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

// Stewardship arc, after Luke 16:10 ("faithful in very little… faithful in
// much") and the parable of the talents (Matthew 25:21).
const TITLES = [
  'Steward in Training',
  'Coin Counter',
  'Faithful With Little',
  'Diligent Planner',
  'Wise Builder',
  'Generous Manager',
  'Faithful With Much',
  'Trusted Steward',
  'Good & Faithful Steward',
]

/** A fun rank name for a level (the last title repeats past the list). */
export function levelTitle(level: number): string {
  return TITLES[Math.min(level, TITLES.length) - 1]
}

export interface LevelProgress {
  level: number
  title: string
  /** XP earned inside the current level. */
  into: number
  /** XP it takes to clear the current level. */
  span: number
  /** 0-100 progress toward the next level. */
  pct: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp)
  const floor = xpForLevel(level)
  const span = xpForLevel(level + 1) - floor
  const into = xp - floor
  return { level, title: levelTitle(level), into, span, pct: Math.min(100, (into / span) * 100) }
}
