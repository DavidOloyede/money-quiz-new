import { describe, expect, it } from 'vitest'
import { illustration } from '../theme'
import { personShapes, shade, type Shape } from '../lib/people'
import { CAST, castMember, CHEER_CROWD } from './people'

const all = (p: ReturnType<typeof personShapes>): Shape[] => [...p.armLeft, ...p.armRight, ...p.body, ...p.head]

describe('the cast', () => {
  it('leans toward the deepest skin tones: most of the cast is deepest or deep', () => {
    const darkest = CAST.filter((c) => c.skin === 'deepest' || c.skin === 'deep').length
    expect(darkest / CAST.length).toBeGreaterThanOrEqual(0.6)
    expect(CAST.filter((c) => c.skin === 'deepest').length).toBeGreaterThanOrEqual(4)
  })

  it('is still many faces: at least five skin tones and seven hair styles', () => {
    expect(new Set(CAST.map((c) => c.skin)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(CAST.map((c) => c.hair)).size).toBeGreaterThanOrEqual(7)
  })

  it('has unique ids, and the cheering crowd is drawn from the cast', () => {
    expect(new Set(CAST.map((c) => c.id)).size).toBe(CAST.length)
    for (const id of CHEER_CROWD) expect(castMember(id).id).toBe(id)
    expect(() => castMember('nobody')).toThrow()
  })

  it('uses only colours from the theme tokens for skin', () => {
    const skins = new Set(Object.values(illustration.skin))
    for (const c of CAST) {
      const head = personShapes(c).head
      expect(head.some((s) => s.kind === 'ellipse' && s.fill && skins.has(s.fill as never))).toBe(true)
    }
  })
})

describe('personShapes', () => {
  it.each(CAST.map((c) => [c.id, c] as const))('%s draws in every pose', (_id, c) => {
    const smile = personShapes(c, 'smile')
    const cheer = personShapes(c, 'cheer')
    const wave = personShapes(c, 'wave')
    expect(smile.armLeft).toHaveLength(0)
    expect(smile.armRight).toHaveLength(0)
    expect(cheer.armLeft.length).toBeGreaterThan(0)
    expect(cheer.armRight.length).toBeGreaterThan(0)
    expect(wave.armLeft).toHaveLength(0)
    expect(wave.armRight.length).toBeGreaterThan(0)
    for (const s of all(cheer)) expect(s.fill ?? s.stroke).toBeTruthy()
  })

  it('keeps every person inside the 120x140 canvas', () => {
    for (const c of CAST) {
      for (const s of all(personShapes(c, 'cheer'))) {
        if (s.kind === 'circle') {
          expect(s.cx - s.r).toBeGreaterThanOrEqual(0)
          expect(s.cx + s.r).toBeLessThanOrEqual(120)
          expect(s.cy - s.r).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('covers the ears under a hijab', () => {
    const ears = (id: string) => personShapes(castMember(id)).head.filter((s) => s.kind === 'circle' && s.r === 4.5)
    expect(ears('hijab')).toHaveLength(0)
    expect(ears('puffs')).toHaveLength(2)
  })
})

describe('shade', () => {
  it('darkens toward black and keeps the #rrggbb form', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080')
    expect(shade('#000000')).toBe('#000000')
    expect(shade('#3a2117', 0)).toBe('#3a2117')
  })
})
