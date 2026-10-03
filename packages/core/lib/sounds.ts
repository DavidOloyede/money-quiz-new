/**
 * The five celebration sounds from docs/DESIGN.md, written as tiny synthesis
 * recipes instead of downloaded files: pure math, so the web and the phone
 * play the very same sounds and there's no licence to track. `npm run
 * gen:sounds` (scripts/gen-sounds.mjs) renders them to WAV for both apps;
 * nothing here touches an audio API.
 *
 * DESIGN.md's rules are locked by sounds.test.ts: each sound is short (under
 * 1s; the fanfare may run to 2s) and quiet (it sits under the device's normal
 * volume rather than on top of it).
 */

export type SoundId = 'chime' | 'soft' | 'drop' | 'sparkle' | 'fanfare'

export const SOUND_IDS: SoundId[] = ['chime', 'soft', 'drop', 'sparkle', 'fanfare']

interface Tone {
  /** Start, seconds from the sound's beginning. */
  at: number
  /** Pitch in Hz; `to` glides there over the tone's life. */
  hz: number
  to?: number
  /** How long the tone rings (the decay's time constant scales with it). */
  ring: number
  /** Relative loudness within the sound, 0–1. */
  gain: number
  /** Overtones as [multiple, relative gain]; a bell has a few, a soft tone none. */
  partials?: [number, number][]
  /** Attack in seconds; a softer start for the low tone. */
  attack?: number
}

interface Recipe {
  /** Total length in seconds (the tail fades to silence inside it). */
  length: number
  /** Final peak level, 0–1 of full scale. */
  peak: number
  tones: Tone[]
}

const BELL: [number, number][] = [
  [2, 0.22],
  [3, 0.06],
]

/** Note frequencies used below (equal temperament, A4 = 440). */
const N = {
  E3: 164.81,
  G3: 196.0,
  G4: 392.0,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
} as const

export const SOUND_RECIPES: Record<SoundId, Recipe> = {
  // Right answer: a bright rising two-note chime.
  chime: {
    length: 0.7,
    peak: 0.42,
    tones: [
      { at: 0, hz: N.C6, ring: 0.35, gain: 0.8, partials: BELL },
      { at: 0.085, hz: N.E6, ring: 0.5, gain: 1, partials: BELL },
    ],
  },
  // Not quite: a soft, low, slightly falling tone. Never a buzzer.
  soft: {
    length: 0.55,
    peak: 0.3,
    tones: [{ at: 0, hz: N.G3, to: N.E3, ring: 0.32, gain: 1, attack: 0.03, partials: [[2, 0.12]] }],
  },
  // Streak / a gentler quiz finish: one round drop.
  drop: {
    length: 0.32,
    peak: 0.36,
    tones: [{ at: 0, hz: 880, to: 330, ring: 0.09, gain: 1, attack: 0.004 }],
  },
  // Level up / new badge: a quick upward sparkle that settles on a chord.
  sparkle: {
    length: 0.95,
    peak: 0.4,
    tones: [
      { at: 0, hz: N.C6, ring: 0.3, gain: 0.55, partials: BELL },
      { at: 0.05, hz: N.E6, ring: 0.3, gain: 0.55, partials: BELL },
      { at: 0.1, hz: N.G6, ring: 0.32, gain: 0.6, partials: BELL },
      { at: 0.15, hz: N.C7, ring: 0.42, gain: 0.65, partials: BELL },
      { at: 0.2, hz: N.E6, ring: 0.45, gain: 0.35 },
      { at: 0.2, hz: N.G6, ring: 0.45, gain: 0.3 },
    ],
  },
  // Quiz finished: a short, warm pickup into a held major chord.
  fanfare: {
    length: 1.7,
    peak: 0.42,
    tones: [
      { at: 0, hz: N.G4, ring: 0.14, gain: 0.6, partials: [[2, 0.3], [3, 0.1]] },
      { at: 0.12, hz: N.C5, ring: 0.14, gain: 0.65, partials: [[2, 0.3], [3, 0.1]] },
      { at: 0.24, hz: N.E5, ring: 0.14, gain: 0.7, partials: [[2, 0.3], [3, 0.1]] },
      { at: 0.38, hz: N.G5, ring: 0.5, gain: 0.85, partials: [[2, 0.3], [3, 0.1]] },
      { at: 0.38, hz: N.E5, ring: 0.5, gain: 0.5, partials: [[2, 0.2]] },
      { at: 0.38, hz: N.C5, ring: 0.5, gain: 0.5, partials: [[2, 0.2]] },
      { at: 0.38, hz: N.C6, ring: 0.35, gain: 0.25, partials: BELL },
    ],
  },
}

/** Fades the final 30ms to zero so no sound ends on a click. */
const TAIL = 0.03

/** Render one sound to mono samples in [-1, 1]. */
export function renderSound(id: SoundId, sampleRate = 22050): Float32Array {
  const recipe = SOUND_RECIPES[id]
  const total = Math.round(recipe.length * sampleRate)
  const out = new Float32Array(total)

  for (const tone of recipe.tones) {
    const start = Math.round(tone.at * sampleRate)
    const attack = tone.attack ?? 0.005
    const partials: [number, number][] = [[1, 1], ...(tone.partials ?? [])]
    let phase = partials.map(() => 0)
    for (let i = start; i < total; i++) {
      const t = (i - start) / sampleRate
      const hz = tone.to ? tone.hz + (tone.to - tone.hz) * Math.min(1, t / (tone.ring * 2)) : tone.hz
      const env = Math.min(1, t / attack) * Math.exp(-t / tone.ring)
      let v = 0
      phase = phase.map((p, k) => {
        const [mult, g] = partials[k]
        // Overtones die away faster than the fundamental, as a real bell's do.
        v += Math.sin(p) * g * Math.exp((-t * (mult - 1)) / tone.ring)
        return p + (2 * Math.PI * hz * mult) / sampleRate
      })
      out[i] += v * env * tone.gain
    }
  }

  const tail = Math.round(TAIL * sampleRate)
  for (let i = 0; i < tail; i++) out[total - 1 - i] *= i / tail

  let max = 0
  for (const v of out) max = Math.max(max, Math.abs(v))
  if (max > 0) for (let i = 0; i < total; i++) out[i] *= recipe.peak / max
  return out
}

/** Encode mono samples as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  ascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(v * 0x7fff), true)
  }
  return bytes
}
