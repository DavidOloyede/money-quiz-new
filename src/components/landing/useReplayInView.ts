/**
 * Scroll-driven entrance motion that plays when a section reaches the middle
 * of the screen, and replays on every pass, not just the first. Put the
 * returned ref on the element to watch and `data-motion={phase}` on whatever
 * the CSS keys off (usually the same element):
 *
 * - `rest`  — the finished state. Initial render, no IntersectionObserver,
 *             and reduced motion all stay here, so nothing is ever hidden.
 * - `armed` — the element is fully off screen; snap to the animation's start
 *             pose so the next entrance can play. The start pose must still
 *             show every piece of content (no opacity-0 on anything meant to
 *             be read) because a full-page capture can see it.
 * - `play`  — the element has reached the middle band of the viewport (the
 *             centre `band` fraction of its height); run the entrance, ending
 *             exactly on the `rest` state.
 *
 * Playing only in the middle band means the moment happens where the visitor
 * is looking, not the instant an edge peeks in. Arming only once the element
 * has fully left means small scroll jiggles don't restart it, but scrolling
 * away and back always does.
 */
import { useEffect, useRef, useState } from 'react'

export type MotionPhase = 'rest' | 'armed' | 'play'

export function useReplayInView<T extends Element>(band = 0.3) {
  const ref = useRef<T>(null)
  const [phase, setPhase] = useState<MotionPhase>('rest')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const inset = `-${Math.round(((1 - band) / 2) * 100)}%`
    const middle = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPhase('play')
      },
      { rootMargin: `${inset} 0px ${inset} 0px` },
    )
    const offscreen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPhase('armed')
    })
    middle.observe(el)
    offscreen.observe(el)
    return () => {
      middle.disconnect()
      offscreen.disconnect()
    }
  }, [band])

  return [ref, phase] as const
}
