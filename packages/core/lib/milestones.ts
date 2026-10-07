/**
 * Milestones: the moments worth a full-screen celebration (a new day on the
 * streak, a level-up, a newly earned badge), spotted by comparing two game
 * states. Pure detection plus a hook both apps mount once, near the root, to
 * queue them.
 *
 * The hook measures from the first game state it sees, never from zero, so
 * opening the app, a sync pull or an account switch (each remounts the store)
 * can't fake a celebration for progress that was already there.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'
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

export type Milestone = StreakDay | LevelUp | BadgesEarned

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

/** How long a milestone waits, so the moment that caused it (a chime, a fanfare) lands first. */
export const MILESTONE_DELAY_MS = 1400

/**
 * Queue milestones as `game` changes. `current` is the one to show now (after
 * MILESTONE_DELAY_MS); `dismiss` moves to the next. Mount once per app, inside
 * the StoreProvider.
 */
export function useMilestones(game: GameState): { current: Milestone | null; dismiss: () => void } {
  const seen = useRef(game)
  const [queue, setQueue] = useState<Milestone[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const found = milestonesBetween(seen.current, game)
    seen.current = game
    if (found.length > 0) setQueue((q) => [...q, ...found])
  }, [game])

  const head = queue[0] ?? null
  useEffect(() => {
    if (!head) return
    setReady(false)
    const t = setTimeout(() => setReady(true), MILESTONE_DELAY_MS)
    return () => clearTimeout(t)
  }, [head])

  const dismiss = useCallback(() => {
    setReady(false)
    setQueue((q) => q.slice(1))
  }, [])

  return { current: ready ? head : null, dismiss }
}
