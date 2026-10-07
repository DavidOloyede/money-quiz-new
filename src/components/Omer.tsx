/**
 * Omer on the website (docs/DESIGN.md "Omer, the mascot"): core's drawing
 * (lib/omer.ts) shown as an <img>, the same element the commissioned art will
 * use, so swapping it in later won't touch a single call site. Below 64px an
 * outfit gives way to plain Omer in his `pose`.
 *
 * He pops in, then moves to suit the pose: a slow breath at rest, hops for a
 * cheer or a jump, a wobble for "oops". Reduce motion keeps him still
 * (celebrate.css). Decorative unless given a `label`. The drawing is a data:
 * URL, so a Content-Security-Policy, if one is ever added, needs `img-src data:`.
 */
import { useMemo } from 'react'
import { omerSvg, type OmerOutfit, type OmerPose } from '@moneyquiz/core/lib/omer'

export type OmerMotion = 'breathe' | 'hop' | 'wobble' | 'none' | 'still'

interface Props {
  pose?: OmerPose
  outfit?: OmerOutfit
  /** Width and height in px. */
  size?: number
  /** Defaults to what suits the pose; 'none' only pops in; 'still' doesn't move at all (static mockups). */
  motion?: OmerMotion
  /** Alt text when he carries meaning; leave unset when he's decoration. */
  label?: string
  className?: string
}

function motionFor(pose: OmerPose): OmerMotion {
  if (pose === 'cheer' || pose === 'jump') return 'hop'
  if (pose === 'oops') return 'wobble'
  return 'breathe'
}

export function Omer({ pose = 'idle', outfit, size = 120, motion, label, className = '' }: Props) {
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(omerSvg({ pose, outfit, size }))}`,
    [pose, outfit, size],
  )
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`omer omer-${motion ?? motionFor(pose)} pointer-events-none shrink-0 select-none ${className}`}
    />
  )
}
