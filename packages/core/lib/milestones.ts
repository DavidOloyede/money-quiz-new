/**
 * Milestones: the big moments worth a full-screen celebration (a level-up or
 * a newly earned badge), spotted by comparing two game states. Pure detection
 * plus a hook both apps mount once, near the root, to queue them.
 *
 * The hook measures from the first game state it sees, never from zero, so
 * opening the app, a sync pull or an account switch (each remounts the store)
 * can't fake a celebration for progress that was already there.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'
import { BADGES, type BadgeDef } from './badges'
import { levelForXp, levelTitle } from './gamification'

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

export type Milestone = LevelUp | BadgesEarned

/**
 * What changed between two game states that deserves a celebration. A
 * level-up comes first; several badges earned together (loading the sample
 * year can award three) arrive as one milestone, not a pile of them.
 */
export function milestonesBetween(prev: GameState, next: GameState): Milestone[] {
  const out: Milestone[] = []
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
