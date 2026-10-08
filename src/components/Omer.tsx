/**
 * Omer on the website (docs/DESIGN.md "Omer, the mascot"): core's drawing
 * (lib/omer.ts). Below 64px an outfit gives way to plain Omer in his `pose`.
 *
 * He pops in, then plays his pose's or outfit's own move from the design
 * guide (core lib/omerMotion.ts): the wave rocks from the shoulder, the Coach
 * does reps, the Hero's cape ripples. His move loops for as long as he's on
 * screen. While he moves he's an inline <svg> whose parts are played with the
 * Web Animations API from the same keyframes the phone uses (the cape's
 * outline is SMIL, begun once he has popped in). Still (`motion="still"`, or
 * reduce motion) he's an <img> of the drawing, the element the commissioned
 * art will replace.
 *
 * In dark mode a faint cream rim keeps his ink outline from vanishing into a
 * dark card. Decorative unless given a `label`. The still drawing is a data:
 * URL, so a Content-Security-Policy, if one is ever added, needs `img-src data:`.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { omerSvg, type OmerOutfit, type OmerPose } from '@moneyquiz/core/lib/omer'
import {
  moveRuns,
  OMER_ENTRANCE_MS,
  OMER_MOVES,
  omerKeyframes,
  omerRig,
  rigMarkup,
  type OmerMove,
} from '@moneyquiz/core/lib/omerMotion'

/** 'move' (the default) plays his move; 'none' only pops him in; 'still' doesn't move at all (static mockups). */
export type OmerMotion = 'move' | 'none' | 'still'

interface Props {
  pose?: OmerPose
  outfit?: OmerOutfit
  /** Width and height in px. */
  size?: number
  motion?: OmerMotion
  /** Alt text when he carries meaning; leave unset when he's decoration. */
  label?: string
  className?: string
}

const REDUCE = '(prefers-reduced-motion: reduce)'
const subscribe = (change: () => void) => {
  const query = window.matchMedia?.(REDUCE)
  query?.addEventListener('change', change)
  return () => query?.removeEventListener('change', change)
}
const reduced = () => !!window.matchMedia?.(REDUCE).matches

const LOOK = 'omer pointer-events-none shrink-0 select-none dark:drop-shadow-[0_0_1.5px_var(--color-linen-300)]'

export function Omer({ pose = 'idle', outfit, size = 120, motion = 'move', label, className = '' }: Props) {
  const reduce = useSyncExternalStore(subscribe, reduced, () => false)
  const moving = motion === 'move' && !reduce
  const ref = useRef<SVGSVGElement>(null)
  const markup = useMemo(() => (moving ? rigMarkup(omerRig({ pose, outfit, size })) : ''), [moving, pose, outfit, size])
  const src = useMemo(
    () => (moving ? '' : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(omerSvg({ pose, outfit, size }))}`),
    [moving, pose, outfit, size],
  )

  useEffect(() => {
    const svg = ref.current
    if (!svg || !markup) return
    const played = Array.from(svg.querySelectorAll<SVGGElement>('[data-mv]'), (part) => {
      const move = part.dataset.mv as OmerMove
      return part.animate(omerKeyframes(move), {
        duration: OMER_MOVES[move].ms,
        iterations: moveRuns(move),
        delay: OMER_ENTRANCE_MS + Number(part.dataset.d) * 1000,
        fill: 'both',
      })
    })
    const cape = setTimeout(() => svg.querySelectorAll('animate').forEach((a) => a.beginElement()), OMER_ENTRANCE_MS)
    return () => {
      clearTimeout(cape)
      for (const a of played) a.cancel()
    }
  }, [markup])

  if (!moving)
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        draggable={false}
        className={`${LOOK} ${motion === 'none' ? 'omer-in' : ''} ${className}`}
      />
    )
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      overflow="visible"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={`${LOOK} omer-in ${className}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
