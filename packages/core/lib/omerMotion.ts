/**
 * Omer's moves (the design-system guide's Section 5): every pose and outfit
 * has one signature move, made by moving single parts of the very drawing
 * lib/omer.ts makes (an arm from the shoulder, a prop from the hand, the cape
 * in the wind), so nothing is redrawn and reduce motion simply shows the pose.
 *
 * Plain data and strings, so the website and the phone play the same moves:
 * - OMER_MOVES: each move's keyframes, pivot and timing on Omer's 200-unit
 *   grid. Every cycle starts and ends on the drawn pose (or unseen, for bits
 *   drawn only while he moves: a glint, a spark, the lasso's knot), so a move
 *   can stop after any cycle and he rests exactly as drawn.
 * - omerRig(): the drawing as a tree, the moving parts wrapped in their move.
 *   The web shows it as an inline SVG played with the Web Animations API; the
 *   phone stacks it in layers played by Reanimated.
 *
 * A port of the guide's builder (docs/design/system-guide/motion.cjs): the
 * same parts, pivots and timings, with each back-and-forth re-phased to begin
 * on the pose. In the app a moment plays its move for about five seconds and
 * settles; only breathing and blinking keep going (DESIGN.md: "a moment, not
 * a screensaver").
 */
import { honey, linen } from '../theme'
import { drawOmer, OMER_PARTS, showsOutfit, type OmerLayers, type OmerOptions, type OmerOutfit, type OmerPose } from './omer'

const { ARMS, LEGS, OUTFITS, POSES, INK, star4, limb, cuff, eyes } = OMER_PARTS

/** A CSS-style cubic-bézier: [x1, y1, x2, y2]. */
export type Bezier = readonly [number, number, number, number]

export const EASE = {
  linear: [0, 0, 1, 1],
  in: [0.42, 0, 1, 1],
  out: [0, 0, 0.58, 1],
  inOut: [0.42, 0, 0.58, 1],
  sineIn: [0.12, 0, 0.39, 0],
  sineOut: [0.61, 1, 0.88, 1],
  sineInOut: [0.37, 0, 0.63, 1],
  /** DESIGN.md's reward overshoot. */
  overshoot: [0.34, 1.56, 0.64, 1],
  /** A mallet coming down: slow to start, fast at the end. */
  strike: [0.5, 0, 1, 1],
  cape: [0.45, 0, 0.55, 1],
} as const satisfies Record<string, Bezier>

export interface MoveFrame {
  /** How far through the cycle, 0 to 1. */
  at: number
  /** Translation, in drawing units. */
  x?: number
  y?: number
  /** Degrees. */
  rotate?: number
  sx?: number
  sy?: number
  /** Degrees. */
  skewX?: number
  opacity?: number
  /** Easing from this frame to the next, when it isn't the move's own. */
  ease?: Bezier
}

export interface MoveSpec {
  /** One cycle, in ms. */
  ms: number
  ease: Bezier
  /** The pivot on Omer's 200-unit grid. Parts that spin on their own centre (a sparkle) get theirs from the rig. */
  origin?: readonly [number, number]
  frames: readonly MoveFrame[]
  /** Keeps going for as long as he's on screen (breathing, blinking); everything else settles. */
  ambient?: boolean
  /** Plays once (the sprout growing out of its pot). */
  once?: boolean
  /** Drawn only while he moves (a glint, a spark): unseen at both ends of a cycle, and left out of the still drawing. */
  extra?: boolean
  /** The cape: its outline morphs between CAPE_SHAPES instead of the part moving. */
  morph?: boolean
}

/** About how long a moment's moves play before he settles on his pose. */
export const MOVE_RUN_MS = 5000
/** He pops in first (DESIGN.md's reward overshoot); his moves start after it. */
export const OMER_ENTRANCE_MS = 500

/** A back-and-forth between two angles that passes through the pose at each end of the cycle. */
const swing = (a: number, b: number, key: 'rotate' | 'skewX' = 'rotate'): MoveFrame[] => [
  { at: 0, ease: EASE.out },
  { at: 0.25, [key]: a },
  { at: 0.75, [key]: b, ease: EASE.in },
  { at: 1 },
]

const ORBIT_MS = 800

const MOVES = {
  // ── Poses
  breathe: { ms: 3200, ease: EASE.inOut, origin: [100, 186], ambient: true, frames: [{ at: 0 }, { at: 0.5, sx: 1.02, sy: 0.97 }, { at: 1 }] },
  blink: { ms: 4200, ease: EASE.linear, origin: [100, 112], ambient: true, frames: [{ at: 0 }, { at: 0.93 }, { at: 0.96, sy: 0.1 }, { at: 1 }] },
  sway: { ms: 1800, ease: EASE.inOut, origin: [100, 186], frames: [{ at: 0 }, { at: 0.25, rotate: -1.5 }, { at: 0.75, rotate: 1.5 }, { at: 1 }] },
  'wave-arm': { ms: 900, ease: EASE.inOut, origin: [174, 100], frames: swing(-16, 10) },
  marks: { ms: 900, ease: EASE.inOut, frames: [{ at: 0 }, { at: 0.5, opacity: 0.15 }, { at: 1 }] },
  tap: { ms: 900, ease: EASE.inOut, origin: [112, 150], frames: [{ at: 0 }, { at: 0.25, rotate: -14 }, { at: 0.6 }, { at: 1 }] },
  hop: {
    ms: 1800,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [
      { at: 0 },
      { at: 0.12, y: -16, sx: 0.98, sy: 1.03 },
      { at: 0.24, sx: 1.05, sy: 0.94 },
      { at: 0.36, y: -16, sx: 0.98, sy: 1.03 },
      { at: 0.48, sx: 1.05, sy: 0.94 },
      { at: 0.55 },
      { at: 1 },
    ],
  },
  'hop-shadow': {
    ms: 1800,
    ease: EASE.inOut,
    origin: [100, 191],
    frames: [
      { at: 0 },
      { at: 0.12, sx: 0.72, sy: 0.72, opacity: 0.6 },
      { at: 0.24 },
      { at: 0.36, sx: 0.72, sy: 0.72, opacity: 0.6 },
      { at: 0.48 },
      { at: 1 },
    ],
  },
  'pump-l': { ms: 900, ease: EASE.inOut, origin: [26, 100], frames: swing(8, -6) },
  'pump-r': { ms: 900, ease: EASE.inOut, origin: [174, 100], frames: swing(-8, 6) },
  twinkle: { ms: 1400, ease: EASE.inOut, frames: [{ at: 0 }, { at: 0.5, rotate: 25, sx: 0.6, sy: 0.6 }, { at: 1 }] },
  jump: {
    ms: 1400,
    ease: EASE.inOut,
    origin: [100, 170],
    frames: [
      { at: 0 },
      { at: 0.22, y: 14, sx: 1.08, sy: 0.88 },
      { at: 0.34, y: 12, sx: 1.03, sy: 0.96 },
      { at: 0.58, y: -22, sx: 0.97, sy: 1.04 },
      { at: 0.72, y: -24 },
      { at: 1 },
    ],
  },
  'jump-shadow': {
    ms: 1400,
    ease: EASE.inOut,
    origin: [100, 191],
    frames: [{ at: 0 }, { at: 0.22, sx: 1.5, sy: 1.2 }, { at: 0.34, sx: 1.5, sy: 1.2 }, { at: 0.72, sx: 0.8, sy: 0.8 }, { at: 1 }],
  },
  // The lines under him show while he's in the air (as drawn) and go while he lands.
  'jump-lines': { ms: 1400, ease: EASE.inOut, frames: [{ at: 0 }, { at: 0.12, opacity: 0 }, { at: 0.4, opacity: 0 }, { at: 0.52 }, { at: 1 }] },
  ponder: { ms: 6400, ease: EASE.inOut, origin: [100, 186], frames: swing(-2, 2) },
  chin: { ms: 1600, ease: EASE.inOut, origin: [170, 110], frames: [{ at: 0 }, { at: 0.5, rotate: -6 }, { at: 1 }] },
  // Each bubble rests, fades, then pops back in with a little overshoot.
  bubble: {
    ms: 3200,
    ease: EASE.out,
    frames: [
      { at: 0 },
      { at: 0.58 },
      { at: 0.7, sx: 0.7, sy: 0.7, opacity: 0 },
      { at: 0.8, sx: 0.7, sy: 0.7, opacity: 0 },
      { at: 0.81, sx: 0.01, sy: 0.01, opacity: 0 },
      { at: 0.84, sx: 0.01, sy: 0.01, opacity: 0 },
      { at: 0.94, sx: 1.2, sy: 1.2 },
      { at: 1 },
    ],
  },
  wobble: {
    ms: 2400,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [{ at: 0 }, { at: 0.08, rotate: -5 }, { at: 0.18, rotate: 4 }, { at: 0.27, rotate: -2 }, { at: 0.34 }, { at: 1 }],
  },
  scratch: { ms: 600, ease: EASE.inOut, origin: [28, 98], frames: swing(-4, 5) },
  drop: { ms: 2400, ease: EASE.in, frames: [{ at: 0 }, { at: 0.3 }, { at: 0.74, y: 14, opacity: 0 }, { at: 0.75, y: -6, opacity: 0 }, { at: 1 }] },
  proud: {
    ms: 2400,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [{ at: 0 }, { at: 0.45, y: -3, sx: 1.04, sy: 1.03 }, { at: 0.6, y: -3, sx: 1.04, sy: 1.03 }, { at: 1 }],
  },
  medal: { ms: 2400, ease: EASE.inOut, origin: [130, 138], frames: swing(-7, 7) },
  glint: {
    ms: 2400,
    ease: EASE.inOut,
    extra: true,
    frames: [
      { at: 0, sx: 0.01, sy: 0.01, opacity: 0 },
      { at: 0.4, sx: 0.01, sy: 0.01, opacity: 0 },
      { at: 0.52, sx: 1.2, sy: 1.2, rotate: 20 },
      { at: 0.64, sx: 0.01, sy: 0.01, opacity: 0 },
      { at: 1, sx: 0.01, sy: 0.01, opacity: 0 },
    ],
  },
  'lean-in': { ms: 2600, ease: EASE.inOut, origin: [100, 186], frames: [{ at: 0 }, { at: 0.5, y: -2, rotate: -1 }, { at: 1 }] },
  glow: { ms: 2600, ease: EASE.inOut, origin: [100, 150], frames: [{ at: 0 }, { at: 0.5, sx: 1.35, sy: 1.35, opacity: 0.45 }, { at: 1 }] },
  offer: { ms: 2600, ease: EASE.inOut, frames: [{ at: 0 }, { at: 0.5, y: -3 }, { at: 1 }] },

  // ── Outfits
  fly: { ms: 2400, ease: EASE.inOut, origin: [100, 120], frames: [{ at: 0 }, { at: 0.5, y: -8, rotate: -2 }, { at: 1 }] },
  'fly-shadow': { ms: 2400, ease: EASE.inOut, origin: [100, 191], frames: [{ at: 0 }, { at: 0.5, sx: 0.78, sy: 0.78, opacity: 0.55 }, { at: 1 }] },
  cape: { ms: 900, ease: EASE.cape, morph: true, frames: [{ at: 0 }, { at: 1 }] },
  // The speed lines stream back behind him, fade, and come round again.
  speed: {
    ms: 700,
    ease: EASE.linear,
    frames: [{ at: 0 }, { at: 0.636, x: -14, opacity: 0 }, { at: 0.637, x: 8, opacity: 0 }, { at: 0.937, x: 1.4 }, { at: 1 }],
  },
  lean: { ms: 6000, ease: EASE.inOut, origin: [100, 186], frames: swing(-1.5, 2) },
  search: { ms: 2600, ease: EASE.inOut, origin: [172, 110], frames: [{ at: 0 }, { at: 0.3, rotate: -4 }, { at: 0.65, rotate: 3 }, { at: 1 }] },
  'lens-glint': {
    ms: 2600,
    ease: EASE.inOut,
    origin: [124, 112],
    extra: true,
    frames: [
      { at: 0, rotate: -12, opacity: 0 },
      { at: 0.12, rotate: -12, opacity: 0.5 },
      { at: 0.5, rotate: 28 },
      { at: 0.88, rotate: -12, opacity: 0.5 },
      { at: 1, rotate: -12, opacity: 0 },
    ],
  },
  lift: { ms: 1800, ease: EASE.inOut, origin: [100, 100], frames: [{ at: 0 }, { at: 0.12 }, { at: 0.42, sy: 0.8 }, { at: 0.58, sy: 0.8 }, { at: 0.88 }, { at: 1 }] },
  bar: { ms: 1800, ease: EASE.inOut, frames: [{ at: 0 }, { at: 0.12 }, { at: 0.42, y: 10.4 }, { at: 0.58, y: 10.4 }, { at: 0.88 }, { at: 1 }] },
  'rep-body': {
    ms: 1800,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [{ at: 0 }, { at: 0.12 }, { at: 0.42, sx: 1.025, sy: 0.97 }, { at: 0.58, sx: 1.025, sy: 0.97 }, { at: 0.88 }, { at: 1 }],
  },
  spoon: { ms: 1200, ease: EASE.inOut, origin: [184, 68], frames: swing(-12, 14) },
  toque: { ms: 2400, ease: EASE.inOut, origin: [100, 70], frames: [{ at: 0 }, { at: 0.5, sx: 1.04, sy: 1.07 }, { at: 1 }] },
  bounce: { ms: 800, ease: EASE.inOut, origin: [100, 186], frames: [{ at: 0 }, { at: 0.5, y: -3 }, { at: 1 }] },
  lasso: { ms: 1600, ease: EASE.inOut, origin: [184, 66], frames: swing(-7, 5) },
  loop: {
    ms: ORBIT_MS,
    ease: EASE.inOut,
    origin: [156, 30],
    frames: [{ at: 0, ease: EASE.out }, { at: 0.3, rotate: -5 }, { at: 0.7, rotate: 6, sx: 0.9, ease: EASE.in }, { at: 1 }],
  },
  // The knot runs round the loop (an ellipse: a cosine across, a sine up and
  // down), which is what makes a flat ellipse read as a spinning lasso. It
  // fades in and out once over the lasso's whole run.
  knot: {
    ms: ORBIT_MS * Math.max(1, Math.round(MOVE_RUN_MS / ORBIT_MS)),
    ease: EASE.linear,
    once: true,
    extra: true,
    frames: [{ at: 0, opacity: 0 }, { at: 0.05 }, { at: 0.95 }, { at: 1, opacity: 0 }],
  },
  'orbit-x': { ms: ORBIT_MS, ease: EASE.sineInOut, extra: true, frames: [{ at: 0, x: -30 }, { at: 0.5, x: 30 }, { at: 1, x: -30 }] },
  'orbit-y': {
    ms: ORBIT_MS,
    ease: EASE.sineInOut,
    extra: true,
    frames: [{ at: 0, ease: EASE.sineOut }, { at: 0.25, y: -9 }, { at: 0.75, y: 9, ease: EASE.sineIn }, { at: 1 }],
  },
  whoosh: { ms: 800, ease: EASE.inOut, extra: true, frames: [{ at: 0, x: -4, opacity: 0 }, { at: 0.5, x: 4 }, { at: 1, x: -4, opacity: 0 }] },
  bandana: { ms: 1600, ease: EASE.inOut, origin: [100, 142], frames: swing(-6, 6, 'skewX') },
  mallet: {
    ms: 1800,
    ease: EASE.inOut,
    origin: [182, 76],
    frames: [
      { at: 0 },
      { at: 0.1, rotate: -14, ease: EASE.strike },
      { at: 0.2, rotate: 18 },
      { at: 0.28, rotate: 4, ease: EASE.strike },
      { at: 0.36, rotate: 18 },
      { at: 0.52 },
      { at: 1 },
    ],
  },
  spark: {
    ms: 1800,
    ease: EASE.linear,
    extra: true,
    frames: [
      { at: 0, sx: 0.2, sy: 0.2, opacity: 0 },
      { at: 0.19, sx: 0.2, sy: 0.2, opacity: 0 },
      { at: 0.21, sx: 1.1, sy: 1.1 },
      { at: 0.27, sx: 1.4, sy: 1.4, opacity: 0 },
      { at: 0.35, sx: 0.2, sy: 0.2, opacity: 0 },
      { at: 0.37, sx: 1.1, sy: 1.1 },
      { at: 0.43, sx: 1.4, sy: 1.4, opacity: 0 },
      { at: 1, sx: 1.4, sy: 1.4, opacity: 0 },
    ],
  },
  dip: {
    ms: 1800,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [
      { at: 0 },
      { at: 0.15 },
      { at: 0.2, y: 2, sx: 1.01, sy: 0.985 },
      { at: 0.26 },
      { at: 0.31 },
      { at: 0.36, y: 2, sx: 1.01, sy: 0.985 },
      { at: 0.42 },
      { at: 1 },
    ],
  },
  'sprout-grow': { ms: 1300, ease: EASE.overshoot, origin: [100, 138], once: true, frames: [{ at: 0, sx: 0.1, sy: 0.1 }, { at: 1 }] },
  'sprout-sway': { ms: 4800, ease: EASE.inOut, origin: [100, 138], frames: swing(-4, 4) },
  cap: {
    ms: 3200,
    ease: EASE.inOut,
    origin: [100, 52],
    frames: [
      { at: 0 },
      { at: 0.5 },
      { at: 0.54, y: 3 },
      { at: 0.7, y: -44, rotate: -200 },
      { at: 0.84, rotate: -360 },
      { at: 0.88, y: 2, rotate: -360 },
      { at: 0.92, rotate: -360 },
      { at: 1, rotate: -360 },
    ],
  },
  toss: {
    ms: 3200,
    ease: EASE.inOut,
    origin: [100, 186],
    frames: [{ at: 0 }, { at: 0.5 }, { at: 0.54, sx: 1.04, sy: 0.95 }, { at: 0.58, y: -8 }, { at: 0.62 }, { at: 0.84 }, { at: 0.87, sx: 1.02, sy: 0.98 }, { at: 1 }],
  },
  diploma: { ms: 2000, ease: EASE.inOut, origin: [184, 66], frames: swing(-6, 8) },
  sleep: { ms: 4400, ease: EASE.inOut, origin: [100, 186], ambient: true, frames: [{ at: 0 }, { at: 0.5, sx: 1.03, sy: 0.96 }, { at: 1 }] },
  nightcap: { ms: 4400, ease: EASE.inOut, origin: [100, 70], ambient: true, frames: [{ at: 0 }, { at: 0.5, rotate: 3 }, { at: 1 }] },
  // A Z drifts up and fades, then rises again from below its spot.
  z: {
    ms: 3200,
    ease: EASE.out,
    frames: [
      { at: 0 },
      { at: 0.35, x: -8, y: -12, sx: 1.15, sy: 1.15, opacity: 0 },
      { at: 0.36, x: 10, y: 14, sx: 0.5, sy: 0.5, opacity: 0 },
      { at: 0.6, x: 5.5, y: 7.5, sx: 0.75, sy: 0.75 },
      { at: 1 },
    ],
  },
} satisfies Record<string, MoveSpec>

export type OmerMove = keyof typeof MOVES
export const OMER_MOVES: Readonly<Record<OmerMove, MoveSpec>> = MOVES

/** How many cycles a move plays before he settles; Infinity for breathing and blinking. */
export function moveRuns(move: OmerMove): number {
  const m: MoveSpec = OMER_MOVES[move]
  if (m.ambient) return Infinity
  if (m.once) return 1
  return Math.max(1, Math.round(MOVE_RUN_MS / m.ms))
}

/**
 * The cape's ripple: three outlines with the same commands, so it can morph
 * between them (0 → 1 → 0 → 2 → 0 over a cycle). The first of each is the
 * drawn cape (OUTFITS.hero.back).
 */
export const CAPE_SHAPES = {
  cape: [
    'M156 74C116 60 60 60 26 72C10 54 -16 44 -40 52C-28 64 -32 80 -26 92C-38 104 -34 120 -24 130C-12 120 6 118 18 124C16 106 24 92 42 86Z',
    'M156 74C116 60 60 60 26 72C10 50 -18 38 -46 44C-32 60 -38 78 -32 90C-44 104 -40 122 -32 134C-18 124 4 120 18 124C16 106 24 92 42 86Z',
    'M156 74C116 60 60 60 26 72C10 58 -14 54 -34 60C-24 72 -28 86 -22 96C-32 108 -28 122 -18 128C-8 118 8 118 18 124C16 106 24 92 42 86Z',
  ],
  folds: [
    'M-22 60C-12 74 -10 92 -12 112M0 58C8 72 10 90 6 112',
    'M-27 54C-15 70 -14 90 -18 116M-2 54C6 70 8 90 3 113',
    'M-17 66C-9 80 -7 95 -7 112M2 63C10 77 12 92 8 112',
  ],
} as const
export const CAPE_ORDER = [0, 1, 0, 2, 0] as const
export const CAPE_TIMES = [0, 0.25, 0.5, 0.75, 1] as const

// ── The rig: the drawing as a tree, moving parts wrapped in their move.

/** A part of Omer that moves. */
export interface OmerPart {
  move: OmerMove
  /** Its pivot on the 200-unit grid. */
  origin: readonly [number, number]
  /** Seconds after his entrance; negative starts part-way through a cycle. */
  delay: number
  children: OmerNode[]
}
/** A plain <g …> from the drawing that holds a moving part (so it can't be flattened to markup). */
export interface OmerGroup {
  open: string
  children: OmerNode[]
}
/** SVG markup that doesn't move, a moving part, or a group holding one. */
export type OmerNode = string | OmerPart | OmerGroup

export const isPart = (n: OmerNode): n is OmerPart => typeof n !== 'string' && 'move' in n
export const isGroup = (n: OmerNode): n is OmerGroup => typeof n !== 'string' && 'open' in n

// While building, a move is a marked <g>; parseRig turns the marks into the tree.
const mv = (move: OmerMove, inner: string, o: { origin?: readonly [number, number]; delay?: number } = {}) =>
  `<g data-mv="${move}"${o.origin ? ` data-o="${o.origin[0]} ${o.origin[1]}"` : ''}${o.delay ? ` data-d="${+o.delay.toFixed(2)}"` : ''}>${inner}</g>`

/** Wrap the first copy of `part`. Throws if the drawing changed under it, so a stale move fails the tests. */
function wrap(svg: string, part: string, move: OmerMove, o?: { origin?: readonly [number, number]; delay?: number }) {
  const i = svg.indexOf(part)
  if (i < 0) throw new Error(`omerMotion: nothing to wrap for ${move}`)
  return svg.slice(0, i) + mv(move, part, o) + svg.slice(i + part.length)
}

/** Wrap Omer's body: everything from his body group to the `extra` layer drawn after it. */
function wrapBody(svg: string, extra: string, move: OmerMove) {
  const start = svg.indexOf('<g')
  const tail = '</g>' + extra + '</svg>'
  if (start < 0 || !svg.endsWith(tail)) throw new Error(`omerMotion: no body for ${move}`)
  const end = svg.length - tail.length + 4
  return svg.slice(0, start) + mv(move, svg.slice(start, end)) + svg.slice(end)
}

const shadowOf = (svg: string) => svg.match(/<ellipse cx="100" cy="191"[^>]*\/>/)![0]
/** The top-level, self-closing elements of a layer. */
const els = (s: string): string[] => s.match(/<[a-z]+[^>]*\/>/g) ?? []
/** One path per subpath ("M…M…" drawn as one line becomes one path each, so each can move on its own). */
const subpaths = (el: string) => {
  const [, d] = el.match(/ d="([^"]+)"/)!
  return d.split(/(?=M)/).map((p) => el.replace(` d="${d}"`, ` d="${p}"`))
}

/** The centre of an element's box, for parts that spin on their own centre. Handles our absolute M/L/H/V/Q/C paths. */
export function centreOf(el: string): [number, number] {
  const c = el.match(/cx="([-\d.]+)" cy="([-\d.]+)"/)
  if (c) return [+c[1], +c[2]]
  const d = el.match(/ d="([^"]+)"/)![1]
  const xs: number[] = []
  const ys: number[] = []
  let x = 0
  let y = 0
  for (const [, cmd, args] of d.matchAll(/([MLHVQCZ])([^MLHVQCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []
    if (cmd === 'H') for (const v of n) xs.push((x = v)), ys.push(y)
    else if (cmd === 'V') for (const v of n) xs.push(x), ys.push((y = v))
    else for (let i = 0; i + 1 < n.length; i += 2) xs.push((x = n[i])), ys.push((y = n[i + 1]))
  }
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

const twinkles = (extra: string, step = 0.45) => els(extra).map((e, i) => mv('twinkle', e, { origin: centreOf(e), delay: -i * step })).join('')

type Look = { pose: OmerPose } | { outfit: OmerOutfit }
const draw = (look: Look, layers: OmerLayers = {}) => drawOmer(look, layers)

/** One builder per pose and outfit, each returning the drawing with its moving parts marked. */
const RECIPES: Record<OmerPose | OmerOutfit, () => string> = {
  idle() {
    return wrapBody(wrap(draw({ pose: 'idle' }), eyes('open', 0, 0), 'blink'), '', 'breathe')
  },
  wave() {
    const extra = mv('marks', POSES.wave.extra!)
    let s = draw({ pose: 'wave' }, { extra })
    s = wrap(s, limb(ARMS.wave.R), 'wave-arm')
    s = wrap(s, limb(LEGS.tap.R), 'tap')
    return wrapBody(s, extra, 'sway')
  },
  cheer() {
    const extra = twinkles(POSES.cheer.extra!)
    let s = draw({ pose: 'cheer' }, { extra })
    s = wrap(s, limb(ARMS.cheer.L), 'pump-l')
    s = wrap(s, limb(ARMS.cheer.R), 'pump-r')
    s = wrapBody(s, extra, 'hop')
    return wrap(s, shadowOf(s), 'hop-shadow')
  },
  jump() {
    let s = wrapBody(draw({ pose: 'jump' }), '', 'jump')
    s = wrap(s, s.match(/<path d="M84 176v10[^>]*\/>/)![0], 'jump-lines')
    return wrap(s, shadowOf(s), 'jump-shadow')
  },
  thinking() {
    const extra = els(POSES.thinking.extra!)
      .map((e, i) => mv('bubble', e, { origin: centreOf(e), delay: i * 0.25 }))
      .join('')
    const s = wrap(draw({ pose: 'thinking' }, { extra }), limb(ARMS.thinking.R), 'chin')
    return wrapBody(s, extra, 'ponder')
  },
  oops() {
    const extra = mv('drop', POSES.oops.extra!)
    const s = wrap(draw({ pose: 'oops' }, { extra }), limb(ARMS.oops.L), 'scratch')
    return wrapBody(s, extra, 'wobble')
  },
  proud() {
    const onBody = mv('medal', POSES.proud.onBody!)
    const extra = mv(
      'glint',
      `<path d="${star4(146, 136, 7)}" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,
      { origin: [146, 136] },
    )
    return wrapBody(draw({ pose: 'proud' }, { onBody, extra }), extra, 'proud')
  },
  giving() {
    const [glow, flake] = els(POSES.giving.props!)
    return wrapBody(draw({ pose: 'giving' }, { props: mv('glow', glow) + mv('offer', flake) }), '', 'lean-in')
  },
  hero() {
    const H = OUTFITS.hero
    const extra = els(H.extra!)
      .flatMap(subpaths)
      .map((p, i) => mv('speed', p, { delay: -i * 0.23 }))
      .join('')
    const s = wrapBody(draw({ outfit: 'hero' }, { back: mv('cape', H.back!), extra }), extra, 'fly')
    return wrap(s, shadowOf(s), 'fly-shadow')
  },
  detective() {
    const glint = mv(
      'lens-glint',
      `<path d="M109 107A15 15 0 0 1 118 97" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" stroke-opacity="0.9"/>`,
    )
    let s = draw({ outfit: 'detective' }, { props: mv('search', OUTFITS.detective.props! + glint) })
    s = wrap(s, limb(ARMS.magnify.R), 'search')
    return wrapBody(s, '', 'lean')
  },
  coach() {
    const C = OUTFITS.coach
    let s = draw({ outfit: 'coach' }, { back: mv('bar', C.back!), props: mv('bar', C.props!) })
    // Each arm takes its wristband along.
    for (const k of ['L', 'R'] as const) s = wrap(s, limb(ARMS.lift[k]) + cuff(ARMS.lift[k], C.wrist!), 'lift')
    return wrapBody(s, '', 'rep-body')
  },
  chef() {
    const C = OUTFITS.chef
    const extra = twinkles(C.extra!)
    return wrapBody(draw({ outfit: 'chef' }, { hat: mv('toque', C.hat!), props: mv('spoon', C.props!), extra }), extra, 'breathe')
  },
  wrangler() {
    const W = OUTFITS.wrangler
    const [ropeInk, rope, loopInk, loop] = els(W.props!)
    const knot = mv(
      'knot',
      mv('orbit-x', mv('orbit-y', `<circle cx="156" cy="30" r="4.2" fill="${linen['600']}" stroke="${INK}" stroke-width="2"/>`)),
    )
    const props = mv('lasso', ropeInk + rope + mv('loop', loopInk + loop + knot))
    const extra = mv(
      'whoosh',
      `<path d="M118 15Q156 -2 194 15M126 47Q156 56 186 47" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" fill="none" stroke-opacity="0.45"/>`,
    )
    return wrapBody(draw({ outfit: 'wrangler' }, { props, extra, onBody: mv('bandana', W.onBody!) }), extra, 'bounce')
  },
  builder() {
    const extra = mv(
      'spark',
      `<path d="${star4(214, 40, 8)}" fill="${honey['300']}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
      { origin: [214, 40] },
    )
    return wrapBody(draw({ outfit: 'builder' }, { props: mv('mallet', OUTFITS.builder.props!), extra }), extra, 'dip')
  },
  gardener() {
    const P = OUTFITS.gardener.props!
    const pot = P.indexOf('<rect x="74" y="136"')
    const props = mv('sprout-grow', mv('sprout-sway', P.slice(0, pot), { delay: 1.3 })) + P.slice(pot)
    return wrapBody(draw({ outfit: 'gardener' }, { props }), '', 'breathe')
  },
  graduate() {
    const G = OUTFITS.graduate
    const extra = twinkles(G.extra!)
    return wrapBody(draw({ outfit: 'graduate' }, { hat: mv('cap', G.hat!), props: mv('diploma', G.props!), extra }), extra, 'toss')
  },
  dreamer() {
    const D = OUTFITS.dreamer
    const extra = els(D.extra!)
      .flatMap(subpaths)
      .map((p, i) => mv('z', p, { origin: centreOf(p), delay: -i * 1.6 }))
      .join('')
    return wrapBody(draw({ outfit: 'dreamer' }, { hat: mv('nightcap', D.hat!), extra }), extra, 'sleep')
  },
}

/** Turn the marked markup into the tree; groups with nothing moving inside go back to plain markup. */
function parseRig(inner: string): OmerNode[] {
  const root: OmerNode[] = []
  const stack: OmerNode[][] = [root]
  const add = (n: OmerNode) => {
    const kids = stack[stack.length - 1]
    if (typeof n === 'string' && typeof kids[kids.length - 1] === 'string') kids[kids.length - 1] += n
    else if (n !== '') kids.push(n)
  }
  let last = 0
  for (const m of inner.matchAll(/<g\b[^>]*>|<\/g>/g)) {
    add(inner.slice(last, m.index))
    last = m.index + m[0].length
    if (m[0] === '</g>') {
      stack.pop()
      continue
    }
    const move = m[0].match(/data-mv="([^"]+)"/)?.[1] as OmerMove | undefined
    let node: OmerPart | OmerGroup
    if (move) {
      const o = m[0].match(/data-o="([-\d.]+) ([-\d.]+)"/)
      const d = m[0].match(/data-d="([-\d.]+)"/)
      node = {
        move,
        origin: o ? [+o[1], +o[2]] : (OMER_MOVES[move].origin ?? [100, 100]),
        delay: d ? +d[1] : 0,
        children: [],
      }
    } else node = { open: m[0], children: [] }
    add(node)
    stack.push(node.children)
  }
  add(inner.slice(last))
  return collapse(root)
}

function collapse(nodes: OmerNode[]): OmerNode[] {
  const out: OmerNode[] = []
  for (const n of nodes) {
    let next: OmerNode = n
    if (isPart(n)) next = { ...n, children: collapse(n.children) }
    else if (isGroup(n)) {
      const kids = collapse(n.children)
      next = kids.every((k) => typeof k === 'string') ? n.open + kids.join('') + '</g>' : { ...n, children: kids }
    }
    if (typeof next === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += next
    else out.push(next)
  }
  return out
}

const rigCache = new Map<string, OmerNode[]>()

/**
 * Omer's drawing as a tree with his moving parts wrapped, for the look this
 * pose, outfit and size show (an outfit gives way to its pose below 64px,
 * just like the still drawing). Only the front view moves; any other view
 * is one piece of still markup.
 */
export function omerRig({ pose = 'idle', outfit, view = 'front', size = 200 }: OmerOptions = {}): OmerNode[] {
  const key = view !== 'front' ? `${view}:${pose}:${outfit}` : showsOutfit(outfit, size) ? outfit : pose
  let rig = rigCache.get(key)
  if (!rig) {
    const svg = view !== 'front' ? drawOmer({ pose, outfit, view }) : RECIPES[key as OmerPose | OmerOutfit]()
    rig = parseRig(svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''))
    rigCache.set(key, rig)
  }
  return rig
}

/** The rig flattened back to still markup, the motion-only bits left out: what reduce motion shows. */
export function rigStill(nodes: readonly OmerNode[]): string {
  return nodes
    .map((n) => {
      if (typeof n === 'string') return n
      if (isGroup(n)) return n.open + rigStill(n.children) + '</g>'
      return OMER_MOVES[n.move].extra ? '' : rigStill(n.children)
    })
    .join('')
}

/** Two decimals is plenty on a 200-unit grid, and keeps the markup readable. */
const num = (v: number) => +v.toFixed(2)

/**
 * The rig as inline SVG markup for the web: each moving part a <g data-mv>
 * pivoting on its own point, ready for omerKeyframes. The cape carries its
 * ripple as SMIL <animate> elements that wait to be begun (begin="indefinite"),
 * because a browser can't tween a path's outline from script everywhere.
 */
export function rigMarkup(nodes: readonly OmerNode[]): string {
  return nodes
    .map((n) => {
      if (typeof n === 'string') return n
      if (isGroup(n)) return n.open + rigMarkup(n.children) + '</g>'
      if (n.move === 'cape') return n.children.map((c) => (typeof c === 'string' ? withCapeRipple(c) : rigMarkup([c]))).join('')
      const style = `transform-box:view-box;transform-origin:${num(n.origin[0])}px ${num(n.origin[1])}px`
      return `<g data-mv="${n.move}" data-d="${n.delay}" style="${style}">${rigMarkup(n.children)}</g>`
    })
    .join('')
}

function withCapeRipple(markup: string): string {
  let out = markup
  for (const frames of [CAPE_SHAPES.cape, CAPE_SHAPES.folds]) {
    const el = out.match(new RegExp(`<path d="${frames[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`))?.[0]
    if (!el) throw new Error('omerMotion: the cape changed; update CAPE_SHAPES')
    const m = OMER_MOVES.cape
    const animate = `<animate attributeName="d" begin="indefinite" dur="${m.ms}ms" repeatCount="${moveRuns('cape')}" calcMode="spline" keyTimes="${CAPE_TIMES.join(';')}" keySplines="${Array(CAPE_ORDER.length - 1).fill(m.ease.join(' ')).join(';')}" values="${CAPE_ORDER.map((i) => frames[i]).join(';')}"/>`
    out = out.replace(el, el.slice(0, -2) + '>' + animate + '</path>')
  }
  return out
}

// ── Sampling a move, for players that tween by hand.

const REST = { x: 0, y: 0, rotate: 0, sx: 1, sy: 1, skewX: 0, opacity: 1 }
export type MovePose = typeof REST
type Prop = keyof MovePose
const PROPS = Object.keys(REST) as Prop[]

/** A frame with every property filled in. */
export const fullFrame = (f: MoveFrame): MovePose => ({ ...REST, ...Object.fromEntries(PROPS.filter((p) => f[p] !== undefined).map((p) => [p, f[p]])) })

/** Which properties a move ever changes, so a player only touches those. */
export function propsOf(move: OmerMove): Prop[] {
  const frames = OMER_MOVES[move].frames.map(fullFrame)
  return PROPS.filter((p) => frames.some((f) => f[p] !== REST[p]))
}

/**
 * A move as Web Animations keyframes: the same transform functions in the same
 * order on every frame, so each property tweens on its own, with each
 * stretch's easing on the frame where it starts.
 */
export function omerKeyframes(move: OmerMove): { offset: number; transform?: string; opacity?: number; easing: string }[] {
  const spec = OMER_MOVES[move]
  const props = propsOf(move)
  const moves = props.filter((p) => p !== 'opacity')
  return spec.frames.map((f) => {
    const v = fullFrame(f)
    const transform = [
      moves.includes('x') || moves.includes('y') ? `translate(${num(v.x)}px, ${num(v.y)}px)` : '',
      moves.includes('rotate') ? `rotate(${num(v.rotate)}deg)` : '',
      moves.includes('sx') || moves.includes('sy') ? `scale(${num(v.sx)}, ${num(v.sy)})` : '',
      moves.includes('skewX') ? `skewX(${num(v.skewX)}deg)` : '',
    ]
      .filter(Boolean)
      .join(' ')
    return {
      offset: f.at,
      ...(transform ? { transform } : {}),
      ...(props.includes('opacity') ? { opacity: v.opacity } : {}),
      easing: `cubic-bezier(${(f.ease ?? spec.ease).join(', ')})`,
    }
  })
}
