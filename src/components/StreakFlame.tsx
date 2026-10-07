/**
 * The small streak flame (docs/DESIGN.md), drawn instead of the 🔥 emoji so
 * it looks the same on every device: coral with a honey core once today has
 * counted, faded and grey until then. `grow` flickers it up when the streak
 * has just grown. Sized in em, so it sits in a line of text at any size.
 */
import { FLAME_ICON_PATHS, FLAME_ICON_VIEWBOX } from '@moneyquiz/core/lib/streak'

export function StreakFlame({ lit = true, grow = false, className = '' }: { lit?: boolean; grow?: boolean; className?: string }) {
  return (
    <svg
      viewBox={FLAME_ICON_VIEWBOX}
      aria-hidden
      className={`inline-block h-[1.3em] w-[0.9em] shrink-0 align-[-0.3em] ${grow ? 'flame-grow' : lit ? '' : 'opacity-50 grayscale'} ${className}`}
    >
      <path d={FLAME_ICON_PATHS.body} className="fill-coral-400 stroke-coral-700" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={FLAME_ICON_PATHS.core} className="fill-honey-300" />
    </svg>
  )
}
