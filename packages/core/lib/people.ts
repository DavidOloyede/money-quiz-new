/**
 * The illustrated people, as plain shapes (circles, ellipses, paths) rather
 * than SVG markup, so the web (DOM <svg>) and the phone (react-native-svg)
 * each draw the very same characters with a few lines of mapping. One style
 * for everyone: bold clean outlines, flat colour, white-rimmed eyes that read
 * on every skin tone, rosy cheeks and a big smile, the same family as Omer.
 *
 * Everything sits on a 120×140 canvas: head and shoulders, with arms that
 * come up for a cheer. Shapes come back in four parts (left arm, right arm,
 * body, head) so a renderer can animate a wave or a nod without knowing the
 * drawing.
 */
import { coral, cream, illustration, linen, type HairColor, type SkinTone } from '../theme'

export const PERSON_VIEWBOX = { width: 120, height: 140 } as const

export type HairStyle =
  | 'afro'
  | 'puffs'
  | 'fade'
  | 'locs'
  | 'braids'
  | 'curly'
  | 'bob'
  | 'bun'
  | 'short'
  | 'headwrap'
  | 'hijab'

export interface PersonSpec {
  id: string
  skin: SkinTone
  hair: HairStyle
  /** A hair token, or for a headwrap or hijab the fabric's colour. */
  hairColor: HairColor | { fabric: string }
  /** Top colour (from the brand ramps). */
  outfit: string
  /** Collar, hair tie and fabric-pattern colour. */
  accent: string
  beard?: boolean
  glasses?: boolean
}

/** smile: head and shoulders. cheer: both arms up, mouth open. wave: one arm up. */
export type Pose = 'smile' | 'cheer' | 'wave'

interface Paint {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

export type Shape =
  | ({ kind: 'circle'; cx: number; cy: number; r: number } & Paint)
  | ({ kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Paint)
  | ({ kind: 'path'; d: string } & Paint)

export interface PersonParts {
  armLeft: Shape[]
  armRight: Shape[]
  body: Shape[]
  head: Shape[]
}

const INK = linen['900']
const LINE = 2.2

/** Darken a #rrggbb colour toward black (shadows, folds, the neck). */
export function shade(hex: string, amount = 0.18): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) * (1 - amount))
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

const circle = (cx: number, cy: number, r: number, p: Paint): Shape => ({ kind: 'circle', cx, cy, r, ...p })
const ellipse = (cx: number, cy: number, rx: number, ry: number, p: Paint): Shape => ({
  kind: 'ellipse',
  cx,
  cy,
  rx,
  ry,
  ...p,
})
const path = (d: string, p: Paint): Shape => ({ kind: 'path', d, ...p })
const outlined = (fill: string, width = LINE): Paint => ({ fill, stroke: INK, strokeWidth: width })

/** The hairline cap most styles share: covers the crown, leaves the face. */
const CAP = 'M38.6 58 C37.5 40 47 32.5 60 32.5 C73 32.5 82.5 40 81.4 58 C79 48.5 72 43.5 60 43.5 C48 43.5 41 48.5 38.6 58 Z'
const SHORT_CAP = 'M39.2 53 C38.5 39 47.5 32.5 60 32.5 C72.5 32.5 81.5 39 80.8 53 C78 45.5 71 42 60 42 C49 42 42 45.5 39.2 53 Z'

/** A raised arm, sleeve and outline drawn as two round-capped strokes, plus the hand. */
function arm(side: -1 | 1, outfit: string, skin: string): Shape[] {
  const x = (v: number) => 60 + side * v
  const d = `M${x(30)} 104 Q${x(45)} 90 ${x(47)} 62`
  return [
    path(d, { stroke: INK, strokeWidth: 15 }),
    path(d, { stroke: outfit, strokeWidth: 10.6 }),
    circle(x(47.5), 57.5, 7.5, outlined(skin)),
  ]
}

function hairShapes(spec: PersonSpec, color: string): { back: Shape[]; front: Shape[] } {
  const fill = outlined(color)
  const flat = { fill: color }
  switch (spec.hair) {
    case 'afro':
      return {
        back: [circle(60, 47, 31, fill)],
        front: [path('M38.6 60 C38 44 47 38.5 60 38.5 C73 38.5 82 44 81.4 60 C79 51 72 46.5 60 46.5 C48 46.5 41 51 38.6 60 Z', flat)],
      }
    case 'puffs':
      return {
        back: [circle(37, 33, 12.5, fill), circle(83, 33, 12.5, fill)],
        front: [
          path(SHORT_CAP, fill),
          path('M60 33 L60 41.5', { stroke: shade(color, 0.4), strokeWidth: 1.6 }),
          circle(44.5, 38.5, 2.6, outlined(spec.accent, 1.2)),
          circle(75.5, 38.5, 2.6, outlined(spec.accent, 1.2)),
        ],
      }
    case 'fade':
      return {
        back: [],
        front: [
          path(SHORT_CAP, fill),
          path('M50 35.5 Q46 39.5 45 44.5', { stroke: shade(color, 0.5), strokeWidth: 1.4 }),
        ],
      }
    case 'locs': {
      const locs = [
        [34, 108],
        [40.5, 102],
        [79.5, 102],
        [86, 108],
      ].map(([x, end]) =>
        path(`M${x - 3.4} 46 L${x - 3.4} ${end - 3.4} A3.4 3.4 0 0 0 ${x + 3.4} ${end - 3.4} L${x + 3.4} 46 Z`, outlined(color, 1.6)),
      )
      return {
        back: locs,
        front: [path(CAP, fill), path('M78.5 92 L85 92', { stroke: spec.accent, strokeWidth: 3 })],
      }
    }
    case 'braids': {
      const braids = [35, 40.5, 79.5, 85].map((x, i) => {
        const end = i === 0 || i === 3 ? 106 : 100
        return path(`M${x - 2.6} 46 L${x - 2.6} ${end - 2.6} A2.6 2.6 0 0 0 ${x + 2.6} ${end - 2.6} L${x + 2.6} 46 Z`, outlined(color, 1.4))
      })
      return {
        back: [circle(60, 26, 10.5, fill), ...braids],
        front: [path(CAP, fill), path('M54 27 Q60 31 66 27', { stroke: spec.accent, strokeWidth: 2.6 })],
      }
    }
    case 'curly': {
      const curls: [number, number, number][] = [
        [40, 41, 10],
        [50, 33, 11],
        [62, 31, 11],
        [73, 35, 10.5],
        [81, 44, 10],
        [36.5, 53, 8],
        [83.5, 55, 8],
      ]
      return { back: curls.map(([x, y, r]) => circle(x, y, r, fill)), front: [path(CAP, flat)] }
    }
    case 'bob':
      return {
        back: [path('M36 52 C36 34 47 28 60 28 C73 28 84 34 84 52 L85 81 C85 86 81 88 76.5 86.5 L43.5 86.5 C39 88 35 86 35 81 Z', fill)],
        front: [
          path('M38.6 60 C37.5 40 47 32.5 60 32.5 C73 32.5 82.5 40 81.4 60 C80 52 78 46.5 73 43.5 C65 49 51 49 43.5 45 C41 49.5 39.5 54.5 38.6 60 Z', fill),
        ],
      }
    case 'bun':
      return { back: [circle(60, 30.5, 9.5, fill)], front: [path(CAP, fill)] }
    case 'short':
      return {
        back: [],
        front: [
          path('M39 56 C38 38 48 31 61 31 C74 31 83 38 81 56 C79 46.5 74 41.5 67 40 C60 44 50 45 42.5 44 C40.5 48 39.4 52 39 56 Z', fill),
        ],
      }
    case 'headwrap': {
      const fold = { stroke: shade(color, 0.3), strokeWidth: 1.8 }
      return {
        back: [circle(83, 27, 7.5, fill)],
        front: [
          path('M35 58 C30 36 40 17.5 60 17 C80 17.5 92 34 85 58 C80 46.5 71 41.5 60 41.5 C49 41.5 40 46.5 35 58 Z', fill),
          path('M46 22.5 C53 30 66 30 75 22', fold),
          path('M41.5 32.5 C51 38.5 69 38.5 79 31.5', fold),
          ...[
            [52, 25],
            [64, 26.5],
            [45, 39],
            [74, 38],
            [58, 34],
          ].map(([x, y]) => circle(x, y, 1.6, { fill: spec.accent })),
        ],
      }
    }
    case 'hijab':
      return {
        back: [
          path('M31.5 60 C31.5 33 45 25.5 60 25.5 C75 25.5 88.5 33 88.5 60 C88.5 75 91 89 101 101 C89 113.5 31 113.5 19 101 C29 89 31.5 75 31.5 60 Z', fill),
        ],
        front: [path(CAP, { fill: shade(color, 0.22) })],
      }
  }
}

/** The four parts of one person in a pose, in draw order: arms, body, head. */
export function personShapes(spec: PersonSpec, pose: Pose = 'smile'): PersonParts {
  const skin = illustration.skin[spec.skin]
  const hairColor = typeof spec.hairColor === 'string' ? illustration.hair[spec.hairColor] : spec.hairColor.fabric
  const covered = spec.hair === 'hijab' || spec.hair === 'headwrap'
  const browColor = covered ? INK : hairColor
  const hair = hairShapes(spec, hairColor)

  const armLeft = pose === 'cheer' ? arm(-1, spec.outfit, skin) : []
  const armRight = pose === 'cheer' || pose === 'wave' ? arm(1, spec.outfit, skin) : []

  const body: Shape[] = [
    path('M14 140 C14 110 32 92 60 92 C88 92 106 110 106 140 Z', outlined(spec.outfit)),
    path('M51 74 L51 92 Q60 101 69 92 L69 74 Z', outlined(shade(skin, 0.16))),
    path('M48.5 93.5 Q60 106 71.5 93.5', { stroke: spec.accent, strokeWidth: 3.4 }),
  ]

  const eye = (x: number): Shape[] => [
    ellipse(x, 61, 3.5, 4, outlined(cream, 1.2)),
    circle(x + 0.3, 61.7, 2.6, { fill: INK }),
    circle(x + 1.2, 60.4, 0.9, { fill: cream }),
  ]

  const mouth: Shape[] =
    pose === 'smile'
      ? [path('M53.5 69 Q60 76.5 66.5 69 Q60 71.2 53.5 69 Z', outlined(cream, 1.4))]
      : [
          path('M52.5 68.5 Q60 80 67.5 68.5 Z', outlined(INK, 1.4)),
          path('M53.8 69.2 Q60 71.6 66.2 69.2 L65.6 70.6 Q60 72.8 54.4 70.6 Z', { fill: cream }),
          ellipse(60, 72.6, 3.4, 1.5, { fill: coral['400'] }),
        ]

  const head: Shape[] = [
    ...hair.back,
    ...(covered ? [] : [circle(39.5, 61, 4.5, outlined(skin)), circle(80.5, 61, 4.5, outlined(skin))]),
    ellipse(60, 58, 21, 23.5, outlined(skin)),
    ...hair.front,
    path('M47.5 54.5 Q52 52 56 54', { stroke: browColor, strokeWidth: 2 }),
    path('M64 54 Q68 52 72.5 54.5', { stroke: browColor, strokeWidth: 2 }),
    ...eye(52),
    ...eye(68),
    ellipse(46.5, 68, 3.8, 2.4, { fill: coral['400'], opacity: 0.45 }),
    ellipse(73.5, 68, 3.8, 2.4, { fill: coral['400'], opacity: 0.45 }),
    ...(spec.beard
      ? [
          path('M39.5 60 C39 78 48 88 60 88 C72 88 81 78 80.5 60 C78 70 74 76.5 68 78 C64 75 56 75 52 78 C46 76.5 42 70 39.5 60 Z', outlined(hairColor, 1.6)),
          path('M51.5 68 Q56 65 60 67 Q64 65 68.5 68 Q64 69.2 60 68.2 Q56 69.2 51.5 68 Z', { fill: hairColor }),
        ]
      : []),
    ...mouth,
    ...(spec.glasses
      ? [
          circle(52, 61, 6.4, { fill: cream, opacity: 0.18 }),
          circle(68, 61, 6.4, { fill: cream, opacity: 0.18 }),
          circle(52, 61, 6.4, { stroke: INK, strokeWidth: 1.8 }),
          circle(68, 61, 6.4, { stroke: INK, strokeWidth: 1.8 }),
          path('M58.4 60.4 Q60 59 61.6 60.4', { stroke: INK, strokeWidth: 1.8 }),
          path('M45.6 60 L40 58.6 M74.4 60 L80 58.6', { stroke: INK, strokeWidth: 1.8 }),
        ]
      : []),
  ]

  return { armLeft, armRight, body, head }
}
