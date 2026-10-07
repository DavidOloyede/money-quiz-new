import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { themeTokens } from '../theme'
import { OMER_OUTFITS, OMER_POSES, OMER_VIEWS, omerSvg, OUTFIT_MIN_SIZE, showsOutfit, type OmerOptions } from './omer'

// The design docs' copy (model sheet, SVG exports, Figma script). Node-only, so only the test loads it.
const docs = createRequire(import.meta.url)('../../../docs/design/mascot/omer.cjs') as {
  omer: (opts: OmerOptions) => string
}

/** Well-formed enough for an <img> and SvgXml: one root, every tag closed, nothing left unbalanced. */
function expectWellFormed(svg: string) {
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg).not.toMatch(/undefined|NaN|null/)
  const stack: string[] = []
  for (const [, close, name, selfClose] of svg.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
    if (selfClose) continue
    if (close) expect(stack.pop()).toBe(name)
    else stack.push(name)
  }
  expect(stack).toEqual([])
}

describe('omerSvg', () => {
  it('draws every pose, outfit and view as well-formed SVG', () => {
    for (const pose of OMER_POSES) expectWellFormed(omerSvg({ pose }))
    for (const outfit of OMER_OUTFITS) expectWellFormed(omerSvg({ outfit }))
    for (const view of OMER_VIEWS) expectWellFormed(omerSvg({ view }))
  })

  it('gives each pose and outfit a drawing of its own', () => {
    const all = [...OMER_POSES.map((pose) => omerSvg({ pose })), ...OMER_OUTFITS.map((outfit) => omerSvg({ outfit }))]
    expect(new Set(all).size).toBe(all.length)
  })

  it('sizes the drawing without changing it', () => {
    const svg = omerSvg({ pose: 'wave', size: 96 })
    expect(svg).toContain('width="96" height="96" viewBox="0 0 200 200"')
    expect(svg.replace(/width="96" height="96"/, 'width="200" height="200"')).toBe(omerSvg({ pose: 'wave' }))
  })

  it('falls back to plain Omer in his pose below 64px', () => {
    expect(omerSvg({ outfit: 'coach', pose: 'cheer', size: OUTFIT_MIN_SIZE - 1 })).toBe(omerSvg({ pose: 'cheer', size: 63 }))
    expect(omerSvg({ outfit: 'dreamer', size: 40 })).toBe(omerSvg({ pose: 'idle', size: 40 }))
    expect(omerSvg({ outfit: 'coach', pose: 'cheer', size: OUTFIT_MIN_SIZE })).not.toBe(omerSvg({ pose: 'cheer', size: 64 }))
    expect(showsOutfit('hero', 63)).toBe(false)
    expect(showsOutfit('hero', 64)).toBe(true)
    expect(showsOutfit(undefined, 200)).toBe(false)
  })

  it("lets an outfit's own pose win over the one passed in", () => {
    expect(omerSvg({ outfit: 'detective', pose: 'wave' })).toBe(omerSvg({ outfit: 'detective' }))
  })

  it('takes every color from the palette (no stray hex)', () => {
    const { cream, linen, forest, honey, sky, coral } = themeTokens
    const palette = new Set([cream, '#fff', ...[linen, forest, honey, sky, coral].flatMap((ramp) => Object.values(ramp))])
    const svg = [...OMER_POSES.map((pose) => omerSvg({ pose })), ...OMER_OUTFITS.map((outfit) => omerSvg({ outfit }))].join('')
    for (const hex of new Set(svg.match(/#[0-9a-f]{3,6}\b/gi))) expect(palette).toContain(hex)
  })
})

describe('the design docs draw the same Omer', () => {
  it.each([
    ...OMER_POSES.map((pose) => ({ pose })),
    ...OMER_OUTFITS.map((outfit) => ({ outfit })),
    ...OMER_VIEWS.map((view) => ({ view })),
    { pose: 'jump' as const, size: 160 },
  ])('%o', (opts) => {
    expect(omerSvg(opts)).toBe(docs.omer(opts))
  })
})
