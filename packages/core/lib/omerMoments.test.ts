import { describe, expect, it } from 'vitest'
import { BADGES } from './badges'
import { levelTitle } from './gamification'
import { BADGE_OUTFITS, BUILDER_LEVEL, HERO_LEVEL, omerFor } from './omerMoments'

describe('omerFor', () => {
  it('casts the quiz: the Detective at the start, a cheer or an oops after each pick, the Graduate at the end', () => {
    expect(omerFor({ kind: 'quiz-intro' })).toEqual({ pose: 'thinking', outfit: 'detective' })
    expect(omerFor({ kind: 'answer', right: true })).toEqual({ pose: 'cheer' })
    expect(omerFor({ kind: 'answer', right: false })).toEqual({ pose: 'oops' })
    expect(omerFor({ kind: 'quiz-finished' })).toEqual({ pose: 'cheer', outfit: 'graduate' })
  })

  it('waves at the welcome and naps once the question of the day is done', () => {
    expect(omerFor({ kind: 'welcome' })).toEqual({ pose: 'wave' })
    expect(omerFor({ kind: 'daily-done' })).toEqual({ pose: 'idle', outfit: 'dreamer' })
  })

  it('jumps at a level-up, as the Builder at Wise Builder and the Hero from the top titles on', () => {
    expect(omerFor({ kind: 'level-up', level: 2 })).toEqual({ pose: 'jump' })
    expect(omerFor({ kind: 'level-up', level: 4 })).toEqual({ pose: 'jump' })
    expect(omerFor({ kind: 'level-up', level: 5 })).toEqual({ pose: 'jump', outfit: 'builder' })
    expect(omerFor({ kind: 'level-up', level: 7 })).toEqual({ pose: 'jump' })
    expect(omerFor({ kind: 'level-up', level: 8 })?.outfit).toBe('hero')
    expect(omerFor({ kind: 'level-up', level: 12 })?.outfit).toBe('hero')
  })

  it('ties the level outfits to the titles they celebrate', () => {
    // If the titles are ever reshuffled, these levels need to move with them.
    expect(levelTitle(BUILDER_LEVEL)).toBe('Wise Builder')
    expect(levelTitle(HERO_LEVEL)).toBe('Trusted Steward')
  })

  it("wears a badge's outfit, or stands proud when several badges disagree", () => {
    expect(omerFor({ kind: 'badges', ids: ['debt-slayer'] })).toEqual({ pose: 'proud', outfit: 'hero' })
    expect(omerFor({ kind: 'badges', ids: ['streak-7', 'streak-30'] })).toEqual({ pose: 'proud', outfit: 'coach' })
    expect(omerFor({ kind: 'badges', ids: ['first-import', 'quiz-perfect'] })).toEqual({ pose: 'proud' })
    expect(omerFor({ kind: 'badges', ids: ['some-future-badge'] })).toEqual({ pose: 'proud' })
  })

  it('gives every badge an outfit', () => {
    for (const b of BADGES) expect(BADGE_OUTFITS[b.id], b.id).toBeDefined()
  })

  it('brings the Coach to streak goal days only', () => {
    for (const day of [1, 2, 6, 8, 13, 29]) expect(omerFor({ kind: 'streak', day })).toBeNull()
    for (const day of [7, 14, 30, 365]) expect(omerFor({ kind: 'streak', day })).toEqual({ pose: 'cheer', outfit: 'coach' })
  })
})
