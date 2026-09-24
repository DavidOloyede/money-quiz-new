/**
 * Hover-driven motion for the "How it works" step tiles: the tile's little
 * scene plays while the pointer rests on it (or it has keyboard focus) and
 * settles back when the pointer leaves. Returns the same `rest` / `armed` /
 * `play` phases as useReplayInView, so the CSS is written the same way.
 *
 * Touch screens have no hover, so there the tile falls back to the scroll
 * trigger (plays once it's centred on screen), and a tap replays it. A tap
 * forces one frame of `armed` first so a scene that's already playing starts
 * over instead of doing nothing. Reduced motion is left to the CSS: the
 * phases still change (so a tap can still show what a click reveals), but
 * nothing animates on the way.
 */
import { useEffect, useState, type PointerEvent } from 'react'
import { useReplayInView, type MotionPhase } from './useReplayInView'

export function useHoverPlay<T extends HTMLElement>() {
  const [ref, inView] = useReplayInView<T>()
  const [hovered, setHovered] = useState(false)
  const [forced, setForced] = useState<MotionPhase | null>(null)
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )

  // Scrolled fully away: whatever a tap started is over.
  useEffect(() => {
    if (inView === 'armed') setForced(null)
  }, [inView])

  const replay = () => {
    setForced('armed')
    requestAnimationFrame(() => requestAnimationFrame(() => setForced('play')))
  }

  const phase: MotionPhase = hovered ? 'play' : (forced ?? (canHover ? 'rest' : inView))

  const handlers = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHovered(true)
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHovered(false)
    },
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
    onClick: () => {
      if (!canHover) replay()
    },
  }

  return [ref, phase, handlers] as const
}
