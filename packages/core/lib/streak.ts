/**
 * The daily streak's shape: whether it's still alive today, how far it is to
 * the next goal (a week, then two weeks, a month…), and the flame both apps
 * draw for the streak moment. Pure helpers. The streak itself lives in
 * GameState; the store counts a day (gamification's checkIn) when the person
 * answers the question of the day, right or wrong. Quiz answers don't count.
 */
import type { GameState } from '../types'
import { prevDayKey, todayKey } from './gamification'

export interface StreakGoal {
  days: number
  /** For a bar's end label: "1 week". */
  name: string
  /** For a sentence: "4 more days to a full week". */
  prose: string
  /** The goal-day shout: "ONE WEEK!". */
  shout: string
}

/**
 * The goals a streak climbs through: a week first, then two weeks or a
 * month, and on. Past the last one, each further year is the next goal.
 */
export const STREAK_GOALS: readonly StreakGoal[] = [
  { days: 7, name: '1 week', prose: 'a full week', shout: 'ONE WEEK!' },
  { days: 14, name: '2 weeks', prose: 'two weeks', shout: 'TWO WEEKS!' },
  { days: 30, name: '1 month', prose: 'a full month', shout: 'ONE MONTH!' },
  { days: 60, name: '2 months', prose: 'two months', shout: 'TWO MONTHS!' },
  { days: 100, name: '100 days', prose: '100 days', shout: '100 DAYS!' },
  { days: 180, name: '6 months', prose: 'six months', shout: 'SIX MONTHS!' },
  { days: 365, name: '1 year', prose: 'a full year', shout: 'ONE YEAR!' },
]

function yearGoal(years: number): StreakGoal {
  return { days: 365 * years, name: `${years} years`, prose: `${years} years`, shout: `${years} YEARS!` }
}

/** The smallest goal at or above `days`. */
function goalAtOrAbove(days: number): StreakGoal {
  return STREAK_GOALS.find((g) => g.days >= days) ?? yearGoal(Math.max(2, Math.ceil(days / 365)))
}

/** The goal just below `goal` (none below the first week). */
function goalBefore(goal: StreakGoal): StreakGoal | null {
  const i = STREAK_GOALS.indexOf(goal)
  if (i === 0) return null
  if (i > 0) return STREAK_GOALS[i - 1]
  const years = goal.days / 365 - 1
  return years === 1 ? STREAK_GOALS[STREAK_GOALS.length - 1] : yearGoal(years)
}

export interface StreakProgress {
  /** The last goal already passed (null before the first week). */
  passed: StreakGoal | null
  /** Where this stretch starts: the passed goal's days, or 0. */
  from: number
  /** The goal this stretch runs to; on a goal day, the one just reached. */
  goal: StreakGoal
  /** True on the very day a goal is reached. */
  reached: boolean
  /** Days still to go (0 on a goal day). */
  toGo: number
  /** 0–1 along this stretch. */
  fraction: number
}

/**
 * Where a streak stands between goals. Day 3 is 3/7 of the way to a week;
 * day 7 has reached it; day 8 starts the stretch from a week to two weeks.
 */
export function streakProgress(streak: number): StreakProgress {
  const days = Math.max(0, Math.floor(streak))
  const goal = goalAtOrAbove(Math.max(1, days))
  const passed = goalBefore(goal)
  const from = passed?.days ?? 0
  return {
    passed,
    from,
    goal,
    reached: days === goal.days,
    toGo: goal.days - days,
    fraction: Math.min(1, Math.max(0, (days - from) / (goal.days - from))),
  }
}

/**
 * The streak as it stands today. It stays alive while the last counted day
 * is today or yesterday; after a missed day it reads 0 until the next answer
 * restarts it at 1 (the stored number only changes when a day is counted).
 */
export function liveStreak(game: GameState, day: string = todayKey()): number {
  return game.lastActiveDay === day || game.lastActiveDay === prevDayKey(day) ? game.streak : 0
}

/** Whether today already counts toward the streak (an answer was given today). */
export function countedToday(game: GameState, day: string = todayKey()): boolean {
  return game.lastActiveDay === day
}

/**
 * The flame of the streak moment, as three nested paths in a 64×80 box
 * (outer, middle, core), so the web and the phone draw the very same one.
 * Colors come from the palette at the call site: coral, honey, cream.
 */
export const FLAME_VIEWBOX = '0 0 64 80'
export const FLAME_PATHS = {
  outer:
    'M32 2C40 16 56 26 56 48C56 66 45 78 32 78C19 78 8 66 8 50C8 40 13 32 19 26C19 34 22 39 27 41C24 28 26 14 32 2Z',
  middle:
    'M32 24C37 33 46 40 46 53C46 65 40 72 32 72C24 72 18 65 18 55C18 48 22 43 26 40C26 46 28 49 31 50C29 41 29 32 32 24Z',
  core: 'M32 44C35 50 40 54 40 61C40 67 36 71 32 71C28 71 24 67 24 62C24 56 29 52 32 44Z',
} as const
