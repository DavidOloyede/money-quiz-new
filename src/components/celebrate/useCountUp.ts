/**
 * Counts a number up from zero (ease-out) for a reveal like the quiz score.
 * With `ms` 0, or under "reduce motion", it simply returns the target.
 */
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../../lib/sound'

export function useCountUp(target: number, ms: number, delay = 150): number {
  const animate = ms > 0 && !prefersReducedMotion()
  const [value, setValue] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / ms))
      setValue(Math.round((1 - Math.pow(1 - k, 3)) * target))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms, delay, animate])
  return value
}
