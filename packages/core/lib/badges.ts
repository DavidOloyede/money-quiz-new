/**
 * Badges — one-time achievements stamped into GameState.badges (id -> ISO
 * date earned). Earned from real behavior: faithfulness (streaks), knowing
 * your money (quizzes), generosity, and debt freedom. Deliberately *not* XP:
 * giving should never be farmed for points.
 */
import type { GameState, QuizResult, Transaction } from '../types'
import { shiftMonth } from './analysis'
import { monthlyGiving, TITHE_BENCHMARK_PCT } from './giving'

export interface BadgeDef {
  id: string
  label: string
  emoji: string
  /** How to earn it — shown as the hint on locked badges. */
  description: string
  /** Short scripture tie-in (WEB / public-domain wording). */
  verse?: string
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-import',
    label: 'First Steps',
    emoji: '📥',
    description: 'Bring your first transactions into the app.',
    verse: '“The plans of the diligent surely lead to profit.” — Proverbs 21:5',
  },
  {
    id: 'streak-7',
    label: 'Week of Diligence',
    emoji: '🔥',
    description: 'Check in 7 days in a row.',
  },
  {
    id: 'streak-30',
    label: 'Month of Faithfulness',
    emoji: '🗓️',
    description: 'Check in 30 days in a row.',
    verse: '“He who is faithful in a very little is faithful also in much.” — Luke 16:10',
  },
  {
    id: 'quiz-perfect',
    label: 'Know Your Flock',
    emoji: '🎯',
    description: 'Score 100% on a quiz.',
    verse: '“Know well the state of your flocks.” — Proverbs 27:23',
  },
  {
    id: 'cheerful-giver',
    label: 'Cheerful Giver',
    emoji: '💝',
    description: 'Give in three consecutive months.',
    verse: '“God loves a cheerful giver.” — 2 Corinthians 9:7',
  },
  {
    id: 'first-fruits',
    label: 'First Fruits',
    emoji: '🌾',
    description: `Give ${TITHE_BENCHMARK_PCT}% or more of a month's income.`,
    verse: '“Honor the Lord with your wealth, with the firstfruits of all your increase.” — Proverbs 3:9',
  },
  {
    id: 'debt-slayer',
    label: 'Debt Slayer',
    emoji: '⚔️',
    description: 'Confirm a loan paid off.',
    verse: '“The borrower is servant to the lender.” — Proverbs 22:7',
  },
]

export function badgeDef(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id)
}

export interface BadgeInputs {
  transactions: Transaction[]
  quizHistory: QuizResult[]
  /** Any import source exists (sample data counts — keeps the demo friendly). */
  hasImported: boolean
  /** How many debts the user has confirmed paid off. */
  paidOffCount: number
}

/** True when giving happened in 3 consecutive calendar months. */
function hasConsecutiveGivingMonths(transactions: Transaction[], run = 3): boolean {
  const months = new Set(monthlyGiving(transactions).filter((m) => m.total > 0).map((m) => m.monthKey))
  for (const m of months) {
    let ok = true
    for (let back = 1; back < run; back++) {
      if (!months.has(shiftMonth(m, back))) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

/** True when any single month's giving reached the tithe benchmark. */
function hasFirstFruitsMonth(transactions: Transaction[]): boolean {
  return monthlyGiving(transactions).some((m) => m.pct !== null && m.pct >= TITHE_BENCHMARK_PCT)
}

/** Ids whose conditions are satisfied right now (streaks read from `game`). */
export function earnedBadgeIds(game: GameState, inputs: BadgeInputs): string[] {
  const out: string[] = []
  if (inputs.hasImported) out.push('first-import')
  if (game.bestStreak >= 7) out.push('streak-7')
  if (game.bestStreak >= 30) out.push('streak-30')
  if (inputs.quizHistory.some((q) => q.total > 0 && q.correct === q.total)) out.push('quiz-perfect')
  if (hasConsecutiveGivingMonths(inputs.transactions)) out.push('cheerful-giver')
  if (hasFirstFruitsMonth(inputs.transactions)) out.push('first-fruits')
  if (inputs.paidOffCount > 0) out.push('debt-slayer')
  return out
}

/**
 * Stamp any newly earned badges into the state. Pure and idempotent: returns
 * `game` UNCHANGED (same reference) when there's nothing new, so it's safe in
 * StrictMode-doubled updaters and effects. Badges are never un-awarded.
 */
export function awardBadges(game: GameState, inputs: BadgeInputs, now: Date = new Date()): GameState {
  const fresh = earnedBadgeIds(game, inputs).filter((id) => !game.badges[id])
  if (fresh.length === 0) return game
  const badges = { ...game.badges }
  const stamp = now.toISOString()
  for (const id of fresh) badges[id] = stamp
  return { ...game, badges }
}
