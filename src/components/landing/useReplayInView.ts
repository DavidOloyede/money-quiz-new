/**
 * Scroll-driven entrance motion that waits until an element is centred on
 * the screen, and replays on every pass, not just the first. Put the
 * returned ref on the element to watch and `data-motion={phase}` on whatever
 * the CSS keys off (usually the same element):
 *
 * - `rest`  — the finished state. Initial render, no IntersectionObserver,
 *             and reduced motion all stay here, so nothing is ever hidden.
 * - `armed` — the element is fully off screen; snap to the animation's start
 *             pose so the next entrance can play. The start pose must still
 *             show every piece of content (no opacity-0 on anything meant to
 *             be read) because a full-page capture can see it.
 * - `play`  — the element's middle has reached the middle of the screen
 *             (within `reach` of the viewport's height); run the entrance,
 *             ending exactly on the `rest` state.
 *
 * Waiting for the middle, rather than the first edge to peek in, means the
 * moment plays where the visitor is looking, with the whole thing in view.
 * An element taller than the screen can never be centred, so it plays once
 * it covers the middle of the screen. A fast fling can jump straight past the
 * middle between frames, so crossing it counts too. And at the very top or
 * bottom of the page, where something may never reach the middle, being
 * fully on screen is enough. Arming only once the
 * element has fully left means small scroll jiggles don't restart it.
 */
import { useEffect, useRef, useState } from 'react'

export type MotionPhase = 'rest' | 'armed' | 'play'

export function useReplayInView<T extends Element>(reach = 0.12) {
  const ref = useRef<T>(null)
  const [phase, setPhase] = useState<MotionPhase>('rest')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let lastSide = 0
    const check = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const offset = r.top + r.height / 2 - vh / 2
      const side = Math.sign(offset)
      const visible = r.bottom > 0 && r.top < vh
      const tall = r.height > vh * 0.9
      const crossed = lastSide !== 0 && side !== 0 && side !== lastSide
      // Near the very top or bottom of the page some elements can never
      // reach the middle; there, being fully on screen is as close as it gets.
      const pageEnd = window.scrollY <= 0 || window.scrollY + vh >= document.documentElement.scrollHeight - 2
      const whole = r.top >= 0 && r.bottom <= vh
      const centred = tall
        ? r.top < vh / 2 && r.bottom > vh / 2
        : visible && (Math.abs(offset) <= vh * reach || crossed || (pageEnd && whole))
      lastSide = side
      if (centred) setPhase('play')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }

    const offscreen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        lastSide = 0
        setPhase('armed')
      }
    })
    offscreen.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    check()
    return () => {
      offscreen.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reach])

  return [ref, phase] as const
}
