/**
 * Plays the five celebration sounds on the phone: the very same WAVs the web
 * plays (rendered from packages/core/lib/sounds.ts by `npm run gen:sounds`).
 *
 * docs/DESIGN.md "Sound": quiet, short, only at the game moments, and always
 * mutable (the per-device Sounds setting in the store). On iPhone it respects
 * the silent switch (`playsInSilentMode: false` — expo-audio defaults to
 * true) and mixes with whatever the person is listening to rather than
 * stopping it. Like the web, it stays quiet under "reduce motion".
 */
import { useCallback } from 'react'
import { AccessibilityInfo } from 'react-native'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { useStore } from '@moneyquiz/core'
import { SOUND_IDS, type SoundId } from '@moneyquiz/core/lib/sounds'

const SOURCES: Record<SoundId, number> = {
  chime: require('../../assets/sounds/chime.wav'),
  soft: require('../../assets/sounds/soft.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  sparkle: require('../../assets/sounds/sparkle.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
}

/** Under the phone's normal volume, on top of files already mastered quiet. */
const VOLUME = 0.8

const players = new Map<SoundId, AudioPlayer>()
let ready = false
let reduceMotion = false

function ensureReady(): void {
  if (ready) return
  ready = true
  void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {})
  void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
    reduceMotion = on
  })
  AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
    reduceMotion = on
  })
}

function player(id: SoundId): AudioPlayer {
  let p = players.get(id)
  if (!p) {
    p = createAudioPlayer(SOURCES[id])
    p.volume = VOLUME
    players.set(id, p)
  }
  return p
}

/** Load the players ahead of time so the first chime isn't late. */
export function preloadSounds(ids: SoundId[] = SOUND_IDS): void {
  ensureReady()
  for (const id of ids) player(id)
}

/** Play one sound now, regardless of the setting (callers check it; see useSound). */
export function playSound(id: SoundId): void {
  ensureReady()
  if (reduceMotion) return
  const p = player(id)
  p.seekTo(0)
    .then(() => p.play())
    .catch(() => {})
}

/** A `play(id)` that respects the person's Sounds setting. */
export function useSound(): (id: SoundId) => void {
  const { sound } = useStore()
  return useCallback((id: SoundId) => (sound ? playSound(id) : undefined), [sound])
}
