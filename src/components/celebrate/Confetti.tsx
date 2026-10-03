/**
 * Confetti in the brand's five colours (honey, forest, cream, sky, coral).
 * "fall" rains from the top of its box; "pop" bursts out from its centre and
 * tumbles down. Pieces are placed by a fixed pseudo-random sequence, not
 * Math.random, so a render is pure and the same every time. Hidden entirely
 * under "reduce motion" (celebrate.css).
 */
import type { CSSProperties } from 'react'

const COLORS = [
  'bg-honey-400',
  'bg-forest-500',
  'bg-cream ring-1 ring-honey-400',
  'bg-sky-400',
  'bg-coral-400',
  'bg-honey-300',
  'bg-forest-300',
]
const SHAPES = ['rounded-[2px]', 'rounded-full', 'rounded-[1px]']

/** A repeatable 0–1 "random" number for piece i (classic shader hash). */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function Confetti({
  count = 40,
  mode = 'fall',
  className = '',
  delay = 0,
}: {
  count?: number
  mode?: 'fall' | 'pop'
  className?: string
  /** ms before the first piece moves. */
  delay?: number
}) {
  return (
    <div aria-hidden className={`pointer-events-none overflow-visible ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const w = 6 + Math.round(rand(i, 1) * 6)
        const tall = rand(i, 2) > 0.5
        const style =
          mode === 'fall'
            ? {
                left: `${rand(i, 3) * 100}%`,
                top: 0,
                '--drift': `${Math.round((rand(i, 4) - 0.5) * 160)}px`,
                '--spin': `${Math.round((rand(i, 5) - 0.5) * 1080)}deg`,
                '--dur': `${(2.2 + rand(i, 6) * 1.6).toFixed(2)}s`,
                '--d': `${delay + Math.round(rand(i, 7) * 900)}ms`,
              }
            : {
                left: '50%',
                top: '50%',
                '--bx': `${Math.round(Math.cos(rand(i, 3) * Math.PI * 2) * (90 + rand(i, 4) * 170))}px`,
                '--by': `${Math.round(-60 - rand(i, 5) * 170)}px`,
                '--spin': `${Math.round((rand(i, 6) - 0.5) * 900)}deg`,
                '--dur': `${(1.3 + rand(i, 7) * 0.9).toFixed(2)}s`,
                '--d': `${delay + Math.round(rand(i, 8) * 160)}ms`,
              }
        return (
          <span
            key={i}
            className={`absolute ${mode === 'fall' ? 'confetti-fall' : 'confetti-pop'} ${COLORS[i % COLORS.length]} ${SHAPES[i % SHAPES.length]}`}
            style={{ ...style, width: w, height: tall ? w * 1.6 : w } as CSSProperties}
          />
        )
      })}
    </div>
  )
}
