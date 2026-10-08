/**
 * Milestones: the moments worth a full-screen celebration (a new day on the
 * streak, a level-up, a newly earned badge, a loan confirmed paid off),
 * spotted by comparing two game states (and two sets of paid-off loans).
 * Pure detection plus a hook both apps mount once, near the root, to queue
 * them.
 *
 * The hook measures from the first game state it sees, never from zero, so
 * opening the app, a sync pull or an account switch (each remounts the store)
 * can't fake a celebration for progress that was already there.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, PaidOffDebts } from '../types'
import { BADGES, type BadgeDef } from './badges'
import { levelForXp, levelTitle, prevDayKey, streakDayXp } from './gamification'

/** Answering the question of the day counted a day toward the streak. */
export interface StreakDay {
  kind: 'streak'
  /** The streak before today (0 when it had lapsed or never started). */
  from: number
  /** The streak now, today included. */
  to: number
  /** XP the day earned: the check-in plus the streak bonus. */
  xp: number
}

export interface LevelUp {
  kind: 'level'
  from: number
  to: number
  /** The title that comes with the new level. */
  title: string
}

export interface BadgesEarned {
  kind: 'badges'
  /** Every badge earned in this step, in the order BADGES lists them. */
  badges: BadgeDef[]
}

/** Loans just confirmed paid off: DESIGN.md's biggest party, the only money moment that gets one. */
export interface PaidOff {
  kind: 'paid-off'
  /** How many loans this confirmation paid off (almost always one). */
  count: number
  /** Debt Slayer, when this payoff earned it: it arrives with the party rather than as a second moment after it. */
  badge?: BadgeDef
}

export type Milestone = StreakDay | LevelUp | BadgesEarned | PaidOff

/**
 * What changed between two game states that deserves a celebration. The
 * streak comes first (it's usually what caused the rest: its XP can tip a
 * level, its length can earn a badge), then a level-up; several badges
 * earned together (loading the sample year can award three) arrive as one
 * milestone, not a pile of them.
 */
export function milestonesBetween(prev: GameState, next: GameState): Milestone[] {
  const out: Milestone[] = []
  const day = next.lastActiveDay
  if (day && day !== prev.lastActiveDay) {
    const before = prev.lastActiveDay === prevDayKey(day) ? prev.streak : 0
    out.push({ kind: 'streak', from: before, to: next.streak, xp: streakDayXp(next.streak) })
  }

  const from = levelForXp(prev.xp)
  const to = levelForXp(next.xp)
  if (to > from) out.push({ kind: 'level', from, to, title: levelTitle(to) })

  const fresh = BADGES.filter((b) => next.badges[b.id] && !prev.badges[b.id])
  if (fresh.length > 0) out.push({ kind: 'badges', badges: fresh })
  return out
}

/** Loans confirmed paid off since `prev`. Undoing a confirmation is never a celebration. */
export function paidOffBetween(prev: PaidOffDebts, next: PaidOffDebts): PaidOff | null {
  const count = Object.keys(next).filter((key) => !(key in prev)).length
  return count > 0 ? { kind: 'paid-off', count } : null
}

/**
 * Add newly found milestones to the queue. The Debt Slayer badge folds into
 * the party for the payoff that earned it (the badge is worked out a moment
 * after the payoff, so it usually arrives second).
 */
export function enqueueMilestones(queue: readonly Milestone[], found: readonly Milestone[]): Milestone[] {
  const out = [...queue]
  for (const m of found) {
    const slayer = m.kind === 'badges' ? m.badges.find((b) => b.id === 'debt-slayer') : undefined
    const party = slayer ? out.findIndex((q) => q.kind === 'paid-off' && !q.badge) : -1
    if (m.kind === 'badges' && slayer && party >= 0) {
      out[party] = { ...(out[party] as PaidOff), badge: slayer }
      const rest = m.badges.filter((b) => b !== slayer)
      if (rest.length > 0) out.push({ kind: 'badges', badges: rest })
    } else out.push(m)
  }
  return out
}

/** Stays the same while a queued milestone only gains detail (a folded-in badge), so its wait doesn't restart. */
const keyOf = (m: Milestone) =>
  m.kind === 'badges' ? `badges-${m.badges.map((b) => b.id).join()}` : m.kind === 'paid-off' ? `paid-off-${m.count}` : `${m.kind}-${m.to}`

/** How long a milestone waits, so the moment that caused it (a chime, a fanfare) lands first. */
export const MILESTONE_DELAY_MS = 1400

const NONE_PAID: PaidOffDebts = {}

/**
 * Queue milestones as `game` (and, when given, the paid-off loans) change.
 * `current` is the one to show now (after MILESTONE_DELAY_MS); `dismiss`
 * moves to the next. Mount once per app, inside the StoreProvider.
 */
export function useMilestones(game: GameState, paidOff: PaidOffDebts = NONE_PAID): { current: Milestone | null; dismiss: () => void } {
  const seen = useRef(game)
  const seenPaid = useRef(paidOff)
  const [queue, setQueue] = useState<Milestone[]>([])
  const [ready, setReady] = useState(false)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const found = milestonesBetween(seen.current, game)
    seen.current = game
    if (found.length > 0) setQueue((q) => enqueueMilestones(q, found))
  }, [game])

  useEffect(() => {
    const party = paidOffBetween(seenPaid.current, paidOff)
    seenPaid.current = paidOff
    if (party) setQueue((q) => enqueueMilestones(q, [party]))
  }, [paidOff])

  const head = queue[0] ?? null
  // Keyed by how many have been shown too, so two alike in a row each get their wait.
  const headKey = head ? `${shown}:${keyOf(head)}` : null
  useEffect(() => {
    if (!headKey) return
    setReady(false)
    const t = setTimeout(() => setReady(true), MILESTONE_DELAY_MS)
    return () => clearTimeout(t)
  }, [headKey])

  const dismiss = useCallback(() => {
    setReady(false)
    setShown((n) => n + 1)
    setQueue((q) => q.slice(1))
  }, [])

  return { current: ready ? head : null, dismiss }
}

