/**
 * The debt-paid-off party (docs/DESIGN.md: "Debt paid off: the biggest party,
 * Omer in a cape and a comic PAID OFF! burst"), the design guide's 5.2: the
 * Hero swoops in and flies through a dawn sky while clouds drift, wind
 * streams and manna tumbles past, "PAID OFF!" lands in a comic burst and
 * confetti pops out of it. It plays when a loan is confirmed paid off; the
 * first one also brings the Debt Slayer badge here rather than in a second
 * moment after. The one money moment that celebrates, because the person
 * confirmed it themselves.
 *
 * Tapping anywhere (or Esc, or the button) closes it; reduce motion shows the
 * sky still, the Hero on his pose, and no particles.
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import type { PaidOff } from '@moneyquiz/core/lib/milestones'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { Omer } from '../Omer'
import { Confetti } from './Confetti'
import { useRestoreFocus } from './useRestoreFocus'

/* A wide comic burst: 18 points around an ellipse. */
const BURST = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2
  const out = i % 2 === 0
  return `${(130 + Math.cos(a) * (out ? 124 : 96)).toFixed(1)},${(56 + Math.sin(a) * (out ? 54 : 38)).toFixed(1)}`
}).join(' ')

/* Clouds at three speeds, all drifting right to left: [top %, scale, seconds per crossing, start offset, resting x]. */
const CLOUDS = [
  [16, 1.25, 26, 0, '78vw'],
  [62, 0.8, 34, -9, '54vw'],
  [34, 1, 30, -17, '22vw'],
  [7, 0.65, 40, -26, '-4vw'],
  [76, 1.1, 24, -5, '70vw'],
] as const
/* Wind streaks and manna, kept to the sky the Hero flies through (not behind the words), placed by a fixed sequence so a render is the same every time. */
const WIND = [
  [10, 2.3, -0.7, 77],
  [17, 2.2, -0.5, 93],
  [24, 1.8, -1.5, 129],
  [31, 2, -0.7, 102],
  [38, 2, -0.6, 127],
  [44, 2.2, -0.1, 92],
  [21, 2, -1.4, 116],
] as const
const FLAKES = [
  [14, 6.5, -6.7, 7],
  [22, 6.6, -6.9, 8],
  [30, 7.6, -6.8, 9],
  [36, 8.2, -4.8, 11],
  [42, 8.5, -6.1, 12],
  [9, 6.9, -6, 9],
] as const

const CLOUD = 'M20 50C8 50 4 38 14 33C11 20 28 13 37 22C41 8 64 5 72 20C84 12 102 20 98 34C110 35 112 50 98 50Z'
const CLOUD_SHADE = 'M14 44C30 48 80 49 104 44C104 48 102 50 98 50H20C16 50 14 48 14 44Z'

export function PaidOffOverlay({ milestone, onClose }: { milestone: PaidOff; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const dots = useId()
  useRestoreFocus()
  useEffect(() => {
    button.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const many = milestone.count > 1
  const { badge } = milestone

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paidoff-title"
      aria-describedby="paidoff-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      {/* The dawn sky, the world the Hero flies through. */}
      <div aria-hidden className="milestone-backdrop absolute inset-0 overflow-hidden bg-linear-to-b from-sky-200 to-honey-100 dark:from-sky-950 dark:to-linen-900">
        <div className="absolute top-[8%] right-[9%] aspect-square w-[22%] max-w-40 rounded-full bg-[radial-gradient(circle,var(--color-honey-50)_0_45%,transparent_70%)] dark:bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-honey-400)_22%,transparent)_0_45%,transparent_70%)]" />
        {CLOUDS.map(([top, scale, dur, d, x], i) => (
          <svg
            key={i}
            viewBox="0 0 120 56"
            className="paidoff-cloud absolute left-0"
            style={{ top: `${top}%`, width: 120 * scale, '--dur': `${dur}s`, '--d': `${d}s`, '--x': x } as CSSProperties}
          >
            <path d={CLOUD} className="fill-cream dark:fill-sky-800" />
            <path d={CLOUD_SHADE} className="fill-sky-100 dark:fill-sky-900" />
          </svg>
        ))}
        {WIND.map(([top, dur, d, w], i) => (
          <svg
            key={i}
            viewBox="0 0 140 14"
            className="paidoff-wind absolute left-0 overflow-visible"
            style={{ top: `${top}%`, width: w, '--dur': `${dur}s`, '--d': `${d}s` } as CSSProperties}
          >
            <path d="M2 7H112C124 7 130 2 126 -1" className="stroke-white dark:stroke-sky-300" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        ))}
        {FLAKES.map(([top, dur, d, size], i) => (
          <span
            key={i}
            className="paidoff-flake absolute left-0 rounded-full bg-honey-300 ring-[1.5px] ring-honey-600 ring-inset"
            style={{ top: `${top}%`, width: size, height: size / 1.4, '--dur': `${dur}s`, '--d': `${d}s` } as CSSProperties}
          />
        ))}
      </div>
      <Confetti count={46} className="absolute inset-0" delay={500} />

      <div className="relative flex max-h-full w-full max-w-md flex-col items-center overflow-x-hidden overflow-y-auto px-4 py-6 text-center">
        {/* The stage: the Hero in flight, the burst landing below him. */}
        <div className="relative h-64 w-80 shrink-0">
          <div className="paidoff-flight absolute top-0 left-6 h-52 w-52">
            <div className="paidoff-swoop h-full w-full">
              <Omer {...omerFor({ kind: 'badges', ids: ['debt-slayer'] })} size={208} className="h-full w-full" />
            </div>
          </div>
          <div className="milestone-burst absolute right-0 bottom-0 z-10 h-[112px] w-[260px]" style={{ animationDelay: '350ms' }}>
            <svg viewBox="0 0 260 112" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                <pattern id={`${dots}-dots`} width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="3.5" cy="3.5" r="1.3" className="fill-honey-400" />
                </pattern>
              </defs>
              <polygon points={BURST} className="fill-honey-200 stroke-linen-900" strokeWidth="3" strokeLinejoin="round" />
              <polygon points={BURST} fill={`url(#${dots}-dots)`} opacity="0.55" />
            </svg>
            <span className="relative flex h-full items-center justify-center font-rounded text-[34px] font-black tracking-wide text-forest-700 [paint-order:stroke] [-webkit-text-stroke:6px_var(--color-cream)]">
              PAID OFF!
            </span>
          </div>
          {/* From the burst's centre, outside its own pop-in so the pieces aren't scaled with it. */}
          <Confetti mode="pop" count={40} delay={600} className="absolute right-[130px] bottom-[56px] z-20 h-0 w-0" />
        </div>

        <div className="milestone-card relative mt-4 overflow-hidden rounded-2xl border-2 border-honey-400 bg-cream px-6 py-3 shadow-[0_4px_0_var(--color-honey-500)] dark:bg-linen-900">
          <span className="milestone-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/25" />
          <h2 id="paidoff-title" className="font-rounded text-2xl font-black text-linen-900 dark:text-linen-50">
            {many ? `${milestone.count} loans paid in full` : 'Paid in full'}
          </h2>
        </div>
        <p
          id="paidoff-desc"
          className="milestone-rise mt-3 max-w-xs text-sm text-linen-600 dark:text-linen-300"
          style={{ '--d': '1600ms' } as CSSProperties}
        >
          {many ? 'Those loans are' : 'That loan is'} done for good. What used to go to {many ? 'them' : 'it'} is yours to plan
          with now.
        </p>
        {badge && (
          <div className="milestone-rise mt-3 flex max-w-xs flex-col items-center gap-1" style={{ '--d': '1750ms' } as CSSProperties}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-honey-100 px-3 py-1 font-rounded text-sm font-extrabold text-honey-700 dark:bg-honey-500/15 dark:text-honey-300">
              <span aria-hidden>{badge.emoji}</span> {badge.label} badge
            </span>
            {badge.verse && <span className="font-display text-sm italic font-soft text-linen-500 dark:text-linen-400">{badge.verse}</span>}
          </div>
        )}

        <button
          ref={button}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-reward milestone-rise mt-6 h-12 shrink-0 px-8 text-base"
          style={{ '--d': '1900ms' } as CSSProperties}
        >
          Keep going
        </button>
        <p className="milestone-rise mt-2 text-xs text-linen-500 dark:text-linen-400" style={{ '--d': '2100ms' } as CSSProperties}>
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}
