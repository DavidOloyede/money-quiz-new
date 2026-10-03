/**
 * The cast of illustrated people who appear across the app: the landing's
 * "Small wins, every morning" row, the crowd cheering a level-up, and the
 * phone's welcome. They're illustrations of the kind of small win the app is
 * built around, never named testimonials or quotes.
 *
 * The cast is many households and many faces, and it leans deliberately
 * toward the deepest skin tones; people.test.ts holds that balance so a later
 * edit can't quietly undo it. Colours come from the brand ramps and the
 * illustration tokens in theme.ts, so the people sit inside the palette.
 */
import type { PersonSpec } from '../lib/people'
import { coral, cream, forest, honey, sky } from '../theme'

export interface CastMember extends PersonSpec {
  /** The small win shown beside them on the landing. */
  win: string
  emoji: string
}

export const CAST: CastMember[] = [
  {
    id: 'puffs',
    skin: 'deepest',
    hair: 'puffs',
    hairColor: 'black',
    outfit: forest['500'],
    accent: honey['300'],
    win: '12-day streak',
    emoji: '🔥',
  },
  {
    id: 'fade',
    skin: 'deepest',
    hair: 'fade',
    hairColor: 'black',
    beard: true,
    outfit: sky['500'],
    accent: cream,
    win: 'Paid off the car',
    emoji: '🎉',
  },
  {
    id: 'elder',
    skin: 'deep',
    hair: 'bun',
    hairColor: 'silver',
    glasses: true,
    outfit: coral['400'],
    accent: honey['200'],
    win: 'Gave 10% this month',
    emoji: '💝',
  },
  {
    id: 'headwrap',
    skin: 'deepest',
    hair: 'headwrap',
    hairColor: { fabric: honey['400'] },
    outfit: forest['600'],
    accent: coral['500'],
    win: 'Budget on track',
    emoji: '✅',
  },
  {
    id: 'locs',
    skin: 'deep',
    hair: 'locs',
    hairColor: 'black',
    outfit: honey['400'],
    accent: forest['500'],
    win: 'Level 5 · Wise Builder',
    emoji: '⭐',
  },
  {
    id: 'braids',
    skin: 'deepest',
    hair: 'braids',
    hairColor: 'black',
    outfit: coral['500'],
    accent: honey['300'],
    win: 'Quiz: 5 out of 5',
    emoji: '🎯',
  },
  {
    id: 'hijab',
    skin: 'rich',
    hair: 'hijab',
    hairColor: { fabric: sky['600'] },
    outfit: sky['300'],
    accent: honey['300'],
    win: 'First budget set',
    emoji: '🌱',
  },
  {
    id: 'curly',
    skin: 'brown',
    hair: 'curly',
    hairColor: 'darkBrown',
    outfit: honey['500'],
    accent: forest['300'],
    win: 'Saved $40 on dining',
    emoji: '🍽️',
  },
  {
    id: 'bob',
    skin: 'golden',
    hair: 'bob',
    hairColor: 'black',
    outfit: forest['400'],
    accent: cream,
    win: 'Spotted a forgotten subscription',
    emoji: '🔍',
  },
  {
    id: 'short',
    skin: 'light',
    hair: 'short',
    hairColor: 'auburn',
    glasses: true,
    outfit: sky['400'],
    accent: honey['300'],
    win: 'Week of Diligence badge',
    emoji: '🏅',
  },
]

/** The cast by id, for scenes that pick particular people. */
export function castMember(id: string): CastMember {
  const m = CAST.find((c) => c.id === id)
  if (!m) throw new Error(`No cast member "${id}"`)
  return m
}

/** The five who cheer a level-up, front and centre first. */
export const CHEER_CROWD = ['locs', 'puffs', 'fade', 'headwrap', 'braids'] as const
