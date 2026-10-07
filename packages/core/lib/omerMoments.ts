/**
 * Which Omer shows up at which moment (docs/DESIGN.md "Omer at the
 * moments"), in one place so the website and the phone cast him the same
 * way. Each answer is a pose, plus an outfit when the moment has one; the
 * pose is what he does at sizes too small for a costume.
 *
 * Earned outfits (the Builder, the Coach, the Gardener, the Hero) first
 * appear at the moment that earns them: a badge, a level, the first streak
 * goal (day 7 is also the Week of Diligence badge). Omer never appears on the
 * money screens; nothing here is asked for by them.
 */
import type { OmerOutfit, OmerPose } from './omer'
import { streakProgress } from './streak'

export interface OmerLook {
  pose: OmerPose
  outfit?: OmerOutfit
}

export type OmerMoment =
  /** The phone's welcome screen, or the quiz before there's any data. */
  | { kind: 'welcome' }
  | { kind: 'quiz-intro' }
  /** Just after a pick in the quiz. */
  | { kind: 'answer'; right: boolean }
  | { kind: 'quiz-finished' }
  | { kind: 'level-up'; level: number }
  | { kind: 'badges'; ids: readonly string[] }
  /** The streak moment, with today's day count. */
  | { kind: 'streak'; day: number }
  /** The question of the day, answered: "Come back tomorrow". */
  | { kind: 'daily-done' }

/** The outfit each badge's moment wears (DESIGN.md's wardrobe table). */
export const BADGE_OUTFITS: Readonly<Record<string, OmerOutfit>> = {
  'first-import': 'builder',
  'streak-7': 'coach',
  'streak-30': 'coach',
  'quiz-perfect': 'wrangler',
  'cheerful-giver': 'gardener',
  'first-fruits': 'gardener',
  'debt-slayer': 'hero',
}

/** Level 5's title is Wise Builder; the top titles start at level 8 (Trusted Steward). */
export const BUILDER_LEVEL = 5
export const HERO_LEVEL = 8

/** Omer for a moment, or null when the moment goes without him. */
export function omerFor(moment: OmerMoment): OmerLook | null {
  switch (moment.kind) {
    case 'welcome':
      return { pose: 'wave' }
    case 'quiz-intro':
      return { pose: 'thinking', outfit: 'detective' }
    case 'answer':
      return { pose: moment.right ? 'cheer' : 'oops' }
    case 'quiz-finished':
      return { pose: 'cheer', outfit: 'graduate' }
    case 'level-up':
      // Every level brings a new title, so the title alone doesn't pick an
      // outfit; only Wise Builder and the top levels dress up.
      if (moment.level >= HERO_LEVEL) return { pose: 'jump', outfit: 'hero' }
      if (moment.level === BUILDER_LEVEL) return { pose: 'jump', outfit: 'builder' }
      return { pose: 'jump' }
    case 'badges': {
      // One outfit at a time: several badges with different outfits get the proud pose instead.
      const outfits = new Set(moment.ids.map((id) => BADGE_OUTFITS[id]))
      const [only] = outfits
      return outfits.size === 1 && only ? { pose: 'proud', outfit: only } : { pose: 'proud' }
    }
    case 'streak':
      // Only goal days (a week, two weeks, a month…) bring the Coach; an
      // ordinary day stays the quick, flame-only moment. Every goal is at
      // least a week, so he has always been earned by then.
      return streakProgress(moment.day).reached ? { pose: 'cheer', outfit: 'coach' } : null
    case 'daily-done':
      return { pose: 'idle', outfit: 'dreamer' }
  }
}
