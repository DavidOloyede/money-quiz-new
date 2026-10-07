import { describe, expect, it } from 'vitest'
import { encodeWav, renderSound, SOUND_IDS, SOUND_RECIPES } from './sounds'

const RATE = 22050

describe('celebration sounds (docs/DESIGN.md "Sound")', () => {
  it('has exactly the five sounds DESIGN.md allows', () => {
    expect(SOUND_IDS).toEqual(['chime', 'soft', 'drop', 'sparkle', 'fanfare'])
  })

  it.each(SOUND_IDS)('%s is short: under 1s, the fanfare under 2s', (id) => {
    const seconds = renderSound(id, RATE).length / RATE
    expect(seconds).toBeLessThanOrEqual(id === 'fanfare' ? 2 : 1)
  })

  it.each(SOUND_IDS)('%s is quiet: peaks at or under half of full scale', (id) => {
    const samples = renderSound(id, RATE)
    const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThanOrEqual(0.5 + 1e-6)
    expect(peak).toBeCloseTo(SOUND_RECIPES[id].peak, 5)
  })

  it.each(SOUND_IDS)('%s starts and ends in silence (no clicks)', (id) => {
    const samples = renderSound(id, RATE)
    expect(Math.abs(samples[0])).toBeLessThan(0.02)
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001)
  })
})

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header and data', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), RATE)
    const view = new DataView(wav.buffer)
    const text = (at: number) => String.fromCharCode(...wav.slice(at, at + 4))
    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(RATE)
    expect(view.getUint32(40, true)).toBe(8)
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 0x7fff))
    expect(view.getInt16(50, true)).toBe(0x7fff)
  })
})
