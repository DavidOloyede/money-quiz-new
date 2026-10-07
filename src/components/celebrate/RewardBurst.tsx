/**
 * The right-answer payoff (docs/DESIGN.md): a handful of manna flakes burst
 * out of the answer and "+10 XP" floats up. Sits inside a `relative` parent
 * and plays once when it mounts; reduce motion hides it.
 */
import type { CSSProperties } from 'react'

/* Up and outward, a little uneven, so it reads as a scatter rather than a fan. */
const FLAKES = [
  { x: -46, y: -30, s: 11, d: 0 },
  { x: -18, y: -46, s: 9, d: 40 },
  { x: 14, y: -50, s: 12, d: 20 },
  { x: 40, y: -32, s: 10, d: 60 },
  { x: -32, y: -8, s: 8, d: 90 },
  { x: 30, y: -8, s: 9, d: 110 },
  { x: 2, y: -26, s: 7, d: 140 },
]

export function RewardBurst({ xp, className = 'right-7 top-1/2' }: { xp?: number; className?: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute h-0 w-0 ${className}`}>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className={`flake-burst absolute rounded-full ring-2 ring-honey-500/40 ${i % 3 === 0 ? 'bg-honey-300' : 'bg-honey-400'}`}
          style={
            {
              left: -f.s / 2,
              top: -f.s / 2,
              width: f.s,
              height: f.s,
              '--bx': `${f.x}px`,
              '--by': `${f.y}px`,
              '--d': `${f.d}ms`,
            } as CSSProperties
          }
        />
      ))}
      {xp ? (
        <span className="xp-float absolute -top-7 -left-12 rounded-full bg-honey-400 px-2.5 py-0.5 font-rounded text-sm font-black whitespace-nowrap text-linen-900 shadow-[0_2px_0_var(--color-honey-600)]">
          +{xp} XP
        </span>
      ) : null}
    </span>
  )
}
