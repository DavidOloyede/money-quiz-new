import { describe, expect, it } from 'vitest'
import { OMER_OUTFITS, OMER_POSES, OMER_VIEWS, omerSvg, OUTFIT_MIN_SIZE, type OmerOptions } from './omer'
import {
  CAPE_ORDER,
  CAPE_SHAPES,
  CAPE_TIMES,
  centreOf,
  fullFrame,
  isGroup,
  isPart,
  moveRuns,
  OMER_MOVES,
  omerKeyframes,
  omerRig,
  rigMarkup,
  rigStill,
  type OmerMove,
  type OmerNode,
  type OmerPart,
} from './omerMotion'

const LOOKS: OmerOptions[] = [...OMER_POSES.map((pose) => ({ pose })), ...OMER_OUTFITS.map((outfit) => ({ outfit }))]
const MOVES = Object.keys(OMER_MOVES) as OmerMove[]

/** The still drawing's insides; a line drawn as one path of several subpaths counts the same as one path each. */
const inner = (svg: string) =>
  svg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/<path d="([^"]+)"([^>]*)\/>/g, (el, d: string, rest: string) =>
      d.includes('M', 1) ? d.split(/(?=M)/).map((p) => `<path d="${p}"${rest}/>`).join('') : el,
    )

function parts(nodes: readonly OmerNode[], out: OmerPart[] = []): OmerPart[] {
  for (const n of nodes) {
    if (isPart(n)) out.push(n), parts(n.children, out)
    else if (isGroup(n)) parts(n.children, out)
  }
  return out
}

describe('omerRig', () => {
  it('is the still drawing, part for part, for every pose and outfit', () => {
    for (const look of LOOKS) expect(inner(rigStill(omerRig(look))), JSON.stringify(look)).toBe(inner(omerSvg(look)))
  })

  it('gives every pose and outfit at least one moving part', () => {
    for (const look of LOOKS) expect(parts(omerRig(look)).length, JSON.stringify(look)).toBeGreaterThan(0)
  })

  it("moves the pose under an outfit that's too small to show", () => {
    expect(omerRig({ outfit: 'coach', pose: 'cheer', size: OUTFIT_MIN_SIZE - 1 })).toEqual(omerRig({ pose: 'cheer' }))
    expect(omerRig({ outfit: 'coach', size: OUTFIT_MIN_SIZE })).toEqual(omerRig({ outfit: 'coach' }))
  })

  it('keeps the other views still', () => {
    for (const view of OMER_VIEWS.filter((v) => v !== 'front')) {
      const rig = omerRig({ view })
      expect(parts(rig)).toEqual([])
      expect(rigStill(rig)).toBe(inner(omerSvg({ view })))
    }
  })

  it('never puts a moving part inside a group the drawing transforms (the phone stacks parts in layers)', () => {
    const check = (nodes: readonly OmerNode[], transformed: boolean) => {
      for (const n of nodes) {
        if (isPart(n)) {
          if (transformed) expect(n.move).toBe('cape')
          check(n.children, transformed)
        } else if (isGroup(n)) check(n.children, transformed || n.open.includes('transform='))
      }
    }
    for (const look of LOOKS) check(omerRig(look), false)
  })

  it('pivots everything that turns or scales on a real point', () => {
    for (const look of LOOKS)
      for (const p of parts(omerRig(look))) {
        const turns = OMER_MOVES[p.move].frames.some((f) => f.rotate || f.sx !== undefined || f.sy !== undefined || f.skewX)
        if (turns && !OMER_MOVES[p.move].origin) expect(p.origin, p.move).not.toEqual([100, 100])
      }
  })

  it('spins sparkles, bubbles and Z’s on their own centres', () => {
    expect(parts(omerRig({ pose: 'cheer' })).filter((p) => p.move === 'twinkle').map((p) => p.origin)).toEqual([
      [28, 34],
      [174, 30],
      [100, 18],
    ])
    expect(parts(omerRig({ pose: 'thinking' })).filter((p) => p.move === 'bubble').map((p) => [p.origin, p.delay])).toEqual([
      [[150, 50], 0],
      [[164, 34], 0.25],
      [[184, 16], 0.5],
    ])
    expect(centreOf('<path d="M24 38H38L24 52H38"/>')).toEqual([31, 45])
  })

  it('wraps the moves the design guide gives each look', () => {
    const movesOf = (look: OmerOptions) => [...new Set(parts(omerRig(look)).map((p) => p.move))].sort()
    expect(movesOf({ pose: 'wave' })).toEqual(['marks', 'sway', 'tap', 'wave-arm'])
    expect(movesOf({ outfit: 'coach' })).toEqual(['bar', 'lift', 'rep-body'])
    expect(movesOf({ outfit: 'hero' })).toEqual(['cape', 'fly', 'fly-shadow', 'speed'])
    expect(movesOf({ outfit: 'wrangler' })).toEqual(['bandana', 'bounce', 'knot', 'lasso', 'loop', 'orbit-x', 'orbit-y', 'whoosh'])
  })
})

describe('OMER_MOVES', () => {
  it('starts every cycle on the pose and ends it there (or unseen, for the bits drawn only while he moves)', () => {
    for (const move of MOVES) {
      const spec = OMER_MOVES[move]
      const first = spec.frames[0]
      const last = spec.frames[spec.frames.length - 1]
      expect(first.at, move).toBe(0)
      expect(last.at, move).toBe(1)
      if (spec.extra) {
        // Unseen where it starts, and where each loop joins up (the orbit's own
        // groups sit inside the knot, which fades in once and stays).
        if (!move.startsWith('orbit')) {
          expect(fullFrame(first).opacity, move).toBe(0)
          if (!spec.once) expect(fullFrame(last).opacity, move).toBe(0)
        }
        continue
      }
      const rest = { x: 0, y: 0, rotate: 0, sx: 1, sy: 1, skewX: 0, opacity: 1 }
      const atRest = (f: typeof rest) => ({ ...f, rotate: f.rotate % 360 || 0 })
      expect(atRest(fullFrame(last)), move).toEqual(rest)
      if (!spec.once) expect(atRest(fullFrame(first)), move).toEqual(rest)
    }
  })

  it('keeps its frames in order', () => {
    for (const move of MOVES) {
      const ats = OMER_MOVES[move].frames.map((f) => f.at)
      expect(ats, move).toEqual([...ats].sort((a, b) => a - b))
    }
  })

  it('loops every move for as long as he is on screen, except the entrances', () => {
    const once = MOVES.filter((m) => moveRuns(m) === 1)
    expect(once.sort()).toEqual(['knot', 'sprout-grow'])
    for (const move of MOVES.filter((m) => !once.includes(m))) expect(moveRuns(move), move).toBe(Infinity)
  })
})

describe('the cape', () => {
  it('ripples between outlines with the same commands, starting and ending on the drawn cape', () => {
    const template = (d: string) => d.replace(/-?\d*\.?\d+/g, '#')
    for (const shapes of [CAPE_SHAPES.cape, CAPE_SHAPES.folds]) {
      expect(new Set(shapes.map(template)).size).toBe(1)
      expect(omerSvg({ outfit: 'hero' })).toContain(`d="${shapes[0]}"`)
    }
    expect(CAPE_ORDER[0]).toBe(0)
    expect(CAPE_ORDER[CAPE_ORDER.length - 1]).toBe(0)
    expect(CAPE_TIMES.length).toBe(CAPE_ORDER.length)
  })
})

describe('rigMarkup', () => {
  it('marks each moving part with its move and pivot, and waits to start the cape', () => {
    const svg = rigMarkup(omerRig({ outfit: 'hero' }))
    expect(svg).toContain('data-mv="fly" data-d="0" style="transform-box:view-box;transform-origin:100px 120px"')
    expect(svg.match(/<animate attributeName="d" begin="indefinite"/g)).toHaveLength(2)
    expect(svg).toContain('repeatCount="indefinite"')
    expect(svg).not.toMatch(/undefined|NaN/)
  })
})

describe('omerKeyframes', () => {
  it('writes the same transform functions on every frame, with each stretch’s easing', () => {
    const frames = omerKeyframes('hop')
    expect(frames[0]).toEqual({ offset: 0, transform: 'translate(0px, 0px) scale(1, 1)', easing: 'cubic-bezier(0.42, 0, 0.58, 1)' })
    expect(frames[1].transform).toBe('translate(0px, -16px) scale(0.98, 1.03)')
    expect(omerKeyframes('marks')[1]).toEqual({ offset: 0.5, opacity: 0.15, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' })
    expect(omerKeyframes('mallet')[1].easing).toBe('cubic-bezier(0.5, 0, 1, 1)')
    expect(omerKeyframes('bandana')[1].transform).toBe('skewX(-6deg)')
  })
})
