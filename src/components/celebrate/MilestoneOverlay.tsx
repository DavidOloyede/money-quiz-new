/**
 * The milestone moment (docs/DESIGN.md: "Level up or new badge: Omer jumps
 * and glows; the new title or badge flips in with a shine"), the one
 * celebration allowed to be big:
 *
 * - LEVEL UP: a slow sunburst turns behind Omer as he jumps, glowing, with
 *   manna falling into his rim; "LEVEL UP!" lands in a comic burst, the
 *   level number flips from old to new, and the new title flips in with a
 *   shine. He's the Builder at Wise Builder and the Hero from the top titles
 *   on (core lib/omerMoments).
 * - NEW BADGE: the badge medals spin in and shine, with Omer beside them,
 *   proud or in the badge's own outfit.
 *
 * Either way a row of sparkles cheers in a wave and confetti falls.
 * Tapping anywhere (or Esc, or the button) closes it, so it never blocks the
 * next thing; reduce motion shows the finished picture. (The day's streak has
 * its own, quicker moment: StreakOverlay.)
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { levelTitle, xpForLevel } from '@moneyquiz/core/lib/gamification'
import type { BadgesEarned, LevelUp } from '@moneyquiz/core/lib/milestones'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { Omer } from '../Omer'
import { Confetti } from './Confetti'
import { useRestoreFocus } from './useRestoreFocus'

/* A comic starburst behind the shout: 16 points around an ellipse. */
const STAR = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2
  const out = i % 2 === 0
  const rx = out ? 92 : 74
  const ry = out ? 42 : 30
  return `${(96 + Math.cos(a) * rx).toFixed(1)},${(44 + Math.sin(a) * ry).toFixed(1)}`
}).join(' ')

/* Flakes falling into Omer's rim, each on its own beat. */
const FLAKES = [
  { x: 42, s: 12, d: 300 },
  { x: 52, s: 10, d: 620 },
  { x: 47, s: 13, d: 900 },
  { x: 57, s: 9, d: 1150 },
]

/* The cheering row: four-point sparkles in the brand colors, biggest in the middle. */
const SPARKLE = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z'
const SPARKLES = [
  { size: 26, fill: 'fill-sky-400' },
  { size: 34, fill: 'fill-forest-400' },
  { size: 46, fill: 'fill-honey-400' },
  { size: 34, fill: 'fill-coral-400' },
  { size: 26, fill: 'fill-honey-300' },
]

/* Omer and the medals share one row, so both shrink as the medals multiply
   (the sample data earns three at once) and the row still fits a phone. */
const OMER_BESIDE: Record<number, number> = { 1: 120, 2: 104, 3: 88 }
const MEDAL_SIZE: Record<number, string> = {
  1: 'h-24 w-24 text-5xl sm:h-28 sm:w-28',
  2: 'h-22 w-22 text-4xl',
  3: 'h-18 w-18 text-3xl',
}

type BigMilestone = LevelUp | BadgesEarned

export function MilestoneOverlay({ milestone, onClose }: { milestone: BigMilestone; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const clip = useId()
  useRestoreFocus()
  useEffect(() => {
    button.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const level = milestone.kind === 'level'
  const medals = level ? [] : milestone.badges.slice(0, 3)
  const shout = level ? 'LEVEL UP!' : milestone.badges.length > 1 ? 'NEW BADGES!' : 'NEW BADGE!'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
      aria-describedby="milestone-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      <div className="milestone-backdrop absolute inset-0 bg-linear-to-b from-cream/95 via-honey-100/95 to-sky-100/95 backdrop-blur-sm dark:from-linen-950/95 dark:via-honey-950/90 dark:to-sky-950/95" />
      <Confetti count={52} className="absolute inset-0" delay={350} />

      <div className="relative flex max-h-full w-full max-w-md flex-col items-center overflow-x-hidden overflow-y-auto px-4 py-6 text-center">
        {/* The stage: sunburst, shout, and Omer (beside the medals for a badge). */}
        <div className="relative h-56 w-72 shrink-0 sm:h-64 sm:w-80">
          <div className="milestone-rays absolute top-[58%] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <div className="absolute top-[58%] left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-honey-300/50 blur-2xl dark:bg-honey-400/25" />

          <div className="milestone-burst absolute top-0 left-1/2 z-10 h-[88px] w-[192px] -translate-x-1/2">
            <svg viewBox="0 0 192 88" className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <pattern id={`${clip}-dots`} width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="3.5" cy="3.5" r="1.3" className="fill-honey-400" />
                </pattern>
              </defs>
              <polygon points={STAR} className="fill-honey-200 stroke-linen-900" strokeWidth="2.5" strokeLinejoin="round" />
              <polygon points={STAR} fill={`url(#${clip}-dots)`} opacity="0.55" />
            </svg>
            <span className="relative flex h-full items-center justify-center font-rounded text-[25px] font-black tracking-wide text-forest-700 [paint-order:stroke] [-webkit-text-stroke:5px_var(--color-cream)]">
              {shout}
            </span>
          </div>

          {level ? (
            <div className="absolute bottom-0 left-1/2 h-36 w-36 -translate-x-1/2 sm:h-40 sm:w-40">
              {FLAKES.map((f, i) => (
                <span
                  key={i}
                  className="milestone-flake absolute top-[16%] z-10 rounded-full bg-honey-400 ring-2 ring-honey-500/40"
                  style={{ left: `${f.x}%`, width: f.s, height: f.s, '--d': `${f.d}ms` } as CSSProperties}
                />
              ))}
              <div className="milestone-bowl absolute inset-0">
                <Omer {...omerFor({ kind: 'level-up', level: milestone.to })} size={160} className="h-full w-full" />
              </div>
            </div>
          ) : (
            <div className={`absolute bottom-2 left-1/2 flex w-max -translate-x-1/2 items-end justify-center ${medals.length > 2 ? 'gap-2' : 'gap-3'}`}>
              <Omer {...omerFor({ kind: 'badges', ids: milestone.badges.map((b) => b.id) })} size={OMER_BESIDE[medals.length]} />
              {medals.map((b, i) => (
                <div
                  key={b.id}
                  className={`milestone-medal relative mb-2 grid place-items-center overflow-hidden rounded-full border-4 border-honey-400 bg-linear-to-b from-honey-100 to-honey-300 shadow-[0_5px_0_var(--color-honey-600)] ${MEDAL_SIZE[medals.length]}`}
                  style={{ '--d': `${300 + i * 180}ms` } as CSSProperties}
                >
                  <span aria-hidden>{b.emoji}</span>
                  <span
                    className="milestone-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/80 to-transparent"
                    style={{ '--shine-at': `${1300 + i * 180}ms` } as CSSProperties}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {level ? <LevelText milestone={milestone} /> : <BadgeText milestone={milestone} />}

        <div className="mt-5 flex h-14 items-center justify-center gap-3" aria-hidden>
          {SPARKLES.map((s, i) => (
            <span key={i} className="wave-hop block" style={{ '--d': `${950 + i * 110}ms` } as CSSProperties}>
              <span className="sparkle-in block" style={{ '--d': `${950 + i * 110}ms` } as CSSProperties}>
                <svg
                  viewBox="-2 -2 28 28"
                  width={s.size}
                  height={s.size}
                  className="sparkle-twinkle block overflow-visible"
                  style={{ '--d': `${950 + i * 110}ms` } as CSSProperties}
                >
                  <path d={SPARKLE} className={`${s.fill} stroke-linen-900`} strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
          ))}
        </div>

        <button
          ref={button}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-reward milestone-rise mt-5 h-12 shrink-0 px-8 text-base"
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

function LevelText({ milestone }: { milestone: LevelUp }) {
  const next = milestone.to + 1
  return (
    <>
      <div className="mt-2 flex items-center gap-2 font-rounded text-sm font-extrabold tracking-[0.2em] text-honey-700 uppercase dark:text-honey-300">
        Level
        <span className="inline-grid h-9 min-w-10 place-items-center [perspective:400px]">
          <span className="milestone-old col-start-1 row-start-1 text-xl tabular-nums text-linen-500">{milestone.from}</span>
          <span className="milestone-new col-start-1 row-start-1 rounded-xl bg-forest-600 px-2.5 py-0.5 text-xl tabular-nums tracking-normal text-white shadow-[0_3px_0_var(--color-forest-800)]">
            {milestone.to}
          </span>
        </span>
      </div>
      <div className="milestone-card relative mt-3 overflow-hidden rounded-2xl border-2 border-honey-400 bg-cream px-6 py-3 shadow-[0_4px_0_var(--color-honey-500)] dark:bg-linen-900">
        <span className="milestone-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/25" />
        <h2 id="milestone-title" className="font-rounded text-2xl font-black text-linen-900 dark:text-linen-50">
          {milestone.title}
        </h2>
      </div>
      <p
        id="milestone-desc"
        className="milestone-rise mt-3 max-w-xs text-sm text-linen-600 dark:text-linen-300"
        style={{ '--d': '1700ms' } as CSSProperties}
      >
        You reached level {milestone.to}. Next up: <span className="font-semibold">{levelTitle(next)}</span> at{' '}
        <span className="tabular-nums">{xpForLevel(next).toLocaleString()}</span> XP.
      </p>
    </>
  )
}

function BadgeText({ milestone }: { milestone: BadgesEarned }) {
  const [first] = milestone.badges
  const one = milestone.badges.length === 1
  return (
    <>
      <div className="milestone-card relative mt-4 overflow-hidden rounded-2xl border-2 border-honey-400 bg-cream px-6 py-3 shadow-[0_4px_0_var(--color-honey-500)] dark:bg-linen-900">
        <h2 id="milestone-title" className="font-rounded text-2xl font-black text-linen-900 dark:text-linen-50">
          {one ? first.label : `${milestone.badges.length} new badges`}
        </h2>
      </div>
      <p
        id="milestone-desc"
        className="milestone-rise mt-3 max-w-xs text-sm text-linen-600 dark:text-linen-300"
        style={{ '--d': '1600ms' } as CSSProperties}
      >
        {one ? first.description : milestone.badges.map((b) => b.label).join(' · ')}
      </p>
      {one && first.verse && (
        <p
          className="milestone-rise mt-2 max-w-xs font-display text-sm italic font-soft text-linen-500 dark:text-linen-400"
          style={{ '--d': '1750ms' } as CSSProperties}
        >
          {first.verse}
        </p>
      )}
    </>
  )
}
