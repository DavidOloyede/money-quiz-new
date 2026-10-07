/**
 * Plays the five celebration sounds (packages/core/lib/sounds.ts, rendered
 * to public/sounds/ by `npm run gen:sounds`). Web Audio rather than <audio>
 * elements, so a chime lands on the tap with no lag and two sounds can
 * overlap.
 *
 * Quiet by design (docs/DESIGN.md "Sound"): it only plays when the person's
 * Sounds setting is on, never under "reduce motion" (ROADMAP.md), and
 * browsers keep it silent until the person has interacted with the page,
 * which suits a level-up on page load. Nothing is created at import time, so
 * importing this file is free.
 *
 * Web-only (Web Audio, fetch of a public path), so it lives in src/lib.
 */
import { useCallback } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { SOUND_IDS, type SoundId } from '@moneyquiz/core/lib/sounds'

/** Sits under the device's normal volume, on top of files already mastered quiet. */
const VOLUME = 0.8

let ctx: AudioContext | null = null
const files = new Map<SoundId, Promise<ArrayBuffer>>()
const buffers = new Map<SoundId, Promise<AudioBuffer>>()

function fetchFile(id: SoundId): Promise<ArrayBuffer> {
  let p = files.get(id)
  if (!p) {
    p = fetch(`/sounds/${id}.wav`).then((r) => {
      if (!r.ok) throw new Error(`sound ${id}: ${r.status}`)
      return r.arrayBuffer()
    })
    p.catch(() => files.delete(id))
    files.set(id, p)
  }
  return p
}

/** Fetch the files ahead of time (no audio context needed), so the first chime isn't late. */
export function preloadSounds(ids: SoundId[] = SOUND_IDS): void {
  if (typeof fetch === 'undefined') return
  for (const id of ids) void fetchFile(id).catch(() => {})
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function buffer(c: AudioContext, id: SoundId): Promise<AudioBuffer> {
  let p = buffers.get(id)
  if (!p) {
    // decodeAudioData detaches its input, so decode a copy and keep the file reusable.
    p = fetchFile(id).then((data) => c.decodeAudioData(data.slice(0)))
    p.catch(() => buffers.delete(id))
    buffers.set(id, p)
  }
  return p
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Play one sound now, regardless of the setting (callers check it; see useSound). */
export function playSound(id: SoundId): void {
  if (prefersReducedMotion()) return
  const c = context()
  if (!c) return
  buffer(c, id)
    .then((buf) => {
      const src = c.createBufferSource()
      src.buffer = buf
      const gain = c.createGain()
      gain.gain.value = VOLUME
      src.connect(gain).connect(c.destination)
      src.start()
    })
    .catch(() => {})
}

/** A `play(id)` that respects the person's Sounds setting. */
export function useSound(): (id: SoundId) => void {
  const { sound } = useStore()
  return useCallback((id: SoundId) => (sound ? playSound(id) : undefined), [sound])
}
