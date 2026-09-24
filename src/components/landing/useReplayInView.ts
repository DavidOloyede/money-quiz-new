/**
 * Scroll-driven entrance motion that replays on every pass, not just the
 * first. Put the returned ref and `data-motion={phase}` on a section, then
 * key CSS off it:
 *
 * - `rest`  — the finished state. Initial render, no IntersectionObserver,
 *             and reduced motion all stay here, so nothing is ever hidden.
 * - `armed` — the section is fully off screen; snap to the animation's start
 *             pose so the next entrance can play. The start pose must still
 *             show every piece of content (no opacity-0 on anything meant to
 *             be read) because a full-page capture can see it.
 * - `play`  — at least `threshold` of the section is visible; run the
 *             entrance, ending exactly on the `rest` state.
 *
 * Arming only once the section has fully left means small scroll jiggles
 * don't restart it, but scrolling away and back always does.
 */
import { useEffect, useRef, useState } from 'react'

export type MotionPhase = 'rest' | 'armed' | 'play'

export function useReplayInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null)
  const [phase, setPhase] = useState<MotionPhase>('rest')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= threshold) setPhase('play')
        else if (!entry.isIntersecting) setPhase('armed')
      },
      { threshold: [0, threshold] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return [ref, phase] as const
}
