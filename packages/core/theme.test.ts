/**
 * Locks the WCAG contrast of the text pairs docs/DESIGN.md approves, so a
 * token tweak can't quietly drop a pairing below AA. Dark-mode washes are
 * composited the way the web draws them (a 500 step at 10% over the card).
 */
import { describe, expect, it } from 'vitest'
import { coral, cream, linen, sky } from './theme'

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
/** `fg` at `alpha` over `bg`, as an opaque hex. */
const over = (fg: string, alpha: number, bg: string) =>
  '#' +
  rgb(fg)
    .map((f, i) => Math.round(alpha * f + (1 - alpha) * rgb(bg)[i]).toString(16).padStart(2, '0'))
    .join('')

describe('theme contrast', () => {
  it('coral text passes AA on light surfaces', () => {
    for (const [fg, bg] of [
      [coral['700'], coral['50']],
      [coral['800'], coral['50']],
      [coral['700'], coral['100']],
      [coral['700'], cream],
      [coral['700'], linen['50']],
    ]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('sky text passes AA on light surfaces', () => {
    for (const [fg, bg] of [
      [sky['700'], sky['50']],
      [sky['800'], sky['50']],
      [sky['700'], sky['100']],
      [sky['700'], cream],
      [sky['700'], linen['50']],
    ]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('300 text passes AA on its dark-mode wash', () => {
    for (const ramp of [coral, sky]) {
      for (const card of [linen['900'], linen['950']]) {
        expect(contrast(ramp['300'], over(ramp['500'], 0.1, card))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('white text passes AA on the solid fills DESIGN.md allows', () => {
    expect(contrast('#ffffff', coral['600'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#ffffff', sky['700'])).toBeGreaterThanOrEqual(4.5)
  })

  it('coral icons stay visible (3:1) on the coral wash', () => {
    expect(contrast(coral['500'], coral['50'])).toBeGreaterThanOrEqual(3)
  })
})
