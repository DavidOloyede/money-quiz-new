/**
 * The milestone moment (docs/DESIGN.md: "Level up or new badge: the bowl
 * fills and glows; the new title or badge flips in with a shine"), the one
 * celebration allowed to be big:
 *
 * - LEVEL UP: a slow sunburst turns behind the bowl as it fills with manna
 *   and glows, "LEVEL UP!" lands in a comic burst, the level number flips
 *   from old to new, and the new title flips in with a shine.
 * - NEW BADGE: the badge medals spin in and shine instead of the bowl.
 *
 * Either way a row of sparkles cheers in a wave and confetti falls.
 * Tapping anywhere (or Esc, or the button) closes it, so it never blocks the
 * next thing; reduce motion shows the finished picture. (The day's streak has
 * its own, quicker moment: StreakOverlay.)
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { levelTitle, xpForLevel } from '@moneyquiz/core/lib/gamification'
import type { BadgesEarned, LevelUp } from '@moneyquiz/core/lib/milestones'
import { Confetti } from './Confetti'
import { useRestoreFocus } from './useRestoreFocus'

const BOWL = 'M3 7c0 26.5 20.5 45 47 45s47-18.5 47-45Z'

/* A comic starburst behind the shout: 16 points around an ellipse. */
const STAR = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2
  const out = i % 2 === 0
  const rx = out ? 92 : 74
  const ry = out ? 42 : 30
  return `${(96 + Math.cos(a) * rx).toFixed(1)},${(44 + Math.sin(a) * ry).toFixed(1)}`
}).join(' ')

/* Flakes falling into the bowl, each on its own beat. */
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

      <div className="relative flex max-h-full w-full max-w-md flex-col items-center overflow-y-auto px-4 py-6 text-center">
        {/* The stage: sunburst, shout, and the bowl (or the medals). */}
        <div className="relative h-48 w-72 shrink-0 sm:h-56 sm:w-80">
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
            <div className="absolute bottom-0 left-1/2 h-32 w-48 -translate-x-1/2 sm:h-36 sm:w-56">
              {FLAKES.map((f, i) => (
                <span
                  key={i}
                  className="milestone-flake absolute top-0 rounded-full bg-honey-400 ring-2 ring-honey-500/40"
                  style={{ left: `${f.x}%`, width: f.s, height: f.s, '--d': `${f.d}ms` } as CSSProperties}
                />
              ))}
              <svg viewBox="0 -6 100 70" className="milestone-bowl absolute inset-x-0 bottom-0 h-[78%] w-full overflow-visible" aria-hidden>
                <defs>
                  <clipPath id={`${clip}-bowl`}>
                    <path d={BOWL} />
                  </clipPath>
                </defs>
                <path d={BOWL} className="fill-cream dark:fill-linen-900" />
                <g clipPath={`url(#${clip}-bowl)`}>
                  <g className="milestone-fill" style={{ '--fill-from': '44px' } as CSSProperties}>
                    <rect x="0" y="14" width="100" height="44" className="fill-honey-300" />
                    <path d="M0 16 Q12.5 10 25 16 T50 16 T75 16 T100 16 V21 H0 Z" className="fill-honey-200" />
                    {[18, 34, 52, 68, 82].map((x, i) => (
                      <circle key={x} cx={x} cy={24 + (i % 2) * 7} r="2.4" className="fill-honey-400" />
                    ))}
                  </g>
                </g>
                <path d={BOWL} fill="none" strokeWidth="3" strokeLinejoin="round" className="stroke-honey-500 dark:stroke-honey-400" />
                <path d="M28 59h44" strokeWidth="3" strokeLinecap="round" className="stroke-honey-500 dark:stroke-honey-400" />
                <g className="chip-pop" style={{ animationDelay: '1450ms' }}>
                  <ellipse cx="44" cy="5.5" rx="4.2" ry="3.2" className="fill-honey-300 stroke-honey-600" strokeWidth="0.8" />
                  <ellipse cx="56" cy="5.5" rx="4" ry="3" className="fill-honey-300 stroke-honey-600" strokeWidth="0.8" />
                  <ellipse cx="50" cy="3.2" rx="4.4" ry="3.3" className="fill-honey-400 stroke-honey-600" strokeWidth="0.8" />
                </g>
              </svg>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-3">
              {milestone.badges.slice(0, 3).map((b, i) => (
                <div
                  key={b.id}
                  className="milestone-medal relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-honey-400 bg-linear-to-b from-honey-100 to-honey-300 text-5xl shadow-[0_5px_0_var(--color-honey-600)] sm:h-28 sm:w-28"
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
