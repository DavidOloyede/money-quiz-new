/**
 * The streak moment (docs/DESIGN.md "Celebration moments"): answering the
 * question of the day, right or wrong. Quicker than a level-up:
 *
 * - a flame ignites and flickers while embers rise, and the day count flips
 *   from yesterday's number to today's;
 * - the day's streak XP pops in;
 * - the way to the next goal fills: one pip per day on the way to a week (and
 *   from one week to two), a bar for the longer stretches after that.
 *
 * It never vanishes unannounced. "Keep going", a tap anywhere or Esc closes
 * it; on an ordinary day a bar under the button also drains over ten seconds
 * and the moment closes when it empties. The day a goal is reached (a week,
 * two weeks, a month…) it's a bigger moment, with a shout, a sunburst and
 * confetti, and it simply waits. Reduce motion shows the finished picture
 * and drops the countdown, so it waits too.
 */
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { useStore } from '@moneyquiz/core/store'
import type { StreakDay } from '@moneyquiz/core/lib/milestones'
import { FLAME_PATHS, FLAME_VIEWBOX, streakProgress } from '@moneyquiz/core/lib/streak'
import { Confetti } from './Confetti'
import { useRestoreFocus } from './useRestoreFocus'


/* A comic starburst behind the goal-day shout (the level-up's, a bit wider). */
const STAR = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2
  const out = i % 2 === 0
  return `${(110 + Math.cos(a) * (out ? 106 : 86)).toFixed(1)},${(44 + Math.sin(a) * (out ? 42 : 30)).toFixed(1)}`
}).join(' ')

/* Embers rising off the flame, each on its own beat and drift. */
const EMBERS = [
  { x: 38, dx: -18, d: 500, s: 7 },
  { x: 58, dx: 14, d: 750, s: 5 },
  { x: 47, dx: -6, d: 1000, s: 6 },
  { x: 64, dx: 20, d: 1300, s: 4 },
  { x: 33, dx: -12, d: 1550, s: 5 },
  { x: 52, dx: 8, d: 1800, s: 6 },
]

export function StreakOverlay({ milestone, onClose }: { milestone: StreakDay; onClose: () => void }) {
  const { game } = useStore()
  const container = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const grad = useId()
  const p = streakProgress(milestone.to)
  const goalDay = p.reached
  useRestoreFocus()

  useEffect(() => {
    ;(button.current ?? container.current)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const caption = goalDay
    ? `${milestone.to} days of showing up. Next stop: ${streakProgress(milestone.to + 1).goal.name}.`
    : milestone.to === 1
      ? game.bestStreak > 1
        ? `A fresh start. Your best run is ${game.bestStreak} days.`
        : 'Day one. Come back tomorrow for day two.'
      : `${p.toGo} more ${p.toGo === 1 ? 'day' : 'days'} to ${p.goal.prose}.`

  return (
    <div
      ref={container}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-title"
      aria-describedby="streak-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden outline-none"
      onClick={onClose}
    >
      <div className="milestone-backdrop absolute inset-0 bg-linear-to-b from-cream/95 via-honey-100/95 to-coral-100/95 backdrop-blur-sm dark:from-linen-950/95 dark:via-honey-950/90 dark:to-coral-950/95" />
      {goalDay && <Confetti count={44} className="absolute inset-0" delay={500} />}

      <div className="relative flex max-h-full w-full max-w-sm flex-col items-center overflow-y-auto px-4 py-6 text-center">
        {/* The stage: glow, embers and the flame (plus the shout on a goal day) */}
        <div className={`relative w-64 shrink-0 ${goalDay ? 'h-56' : 'h-40'}`}>
          {goalDay && (
            <>
              <div className="milestone-rays absolute bottom-[-10%] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 translate-y-1/4 rounded-full" />
              <div className="milestone-burst absolute top-0 left-1/2 z-10 h-[88px] w-[220px] -translate-x-1/2">
                <svg viewBox="0 0 220 88" className="absolute inset-0 h-full w-full" aria-hidden>
                  <polygon points={STAR} className="fill-honey-200 stroke-linen-900" strokeWidth="2.5" strokeLinejoin="round" />
                </svg>
                <span className="relative flex h-full items-center justify-center font-rounded text-[24px] font-black tracking-wide text-coral-700 [paint-order:stroke] [-webkit-text-stroke:5px_var(--color-cream)]">
                  {p.goal.shout}
                </span>
              </div>
            </>
          )}
          <div className="absolute bottom-0 left-1/2 h-36 w-28 -translate-x-1/2">
            <div className="streak-glow absolute inset-x-[-30%] bottom-[-8%] top-[20%] rounded-full bg-honey-300/60 blur-2xl dark:bg-coral-400/30" />
            {EMBERS.map((e, i) => (
              <span
                key={i}
                aria-hidden
                className={`streak-ember absolute rounded-full ${i % 2 ? 'bg-coral-400' : 'bg-honey-400'}`}
                style={{ left: `${e.x}%`, bottom: '42%', width: e.s, height: e.s, '--dx': `${e.dx}px`, '--d': `${e.d}ms` } as CSSProperties}
              />
            ))}
            <svg viewBox={FLAME_VIEWBOX} className="streak-flame absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={`${grad}-outer`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--color-honey-500)" />
                  <stop offset="0.55" stopColor="var(--color-coral-500)" />
                  <stop offset="1" stopColor="var(--color-coral-600)" />
                </linearGradient>
              </defs>
              <path d={FLAME_PATHS.outer} fill={`url(#${grad}-outer)`} className="streak-flicker stroke-coral-800/60" strokeWidth="1.5" strokeLinejoin="round" />
              <path d={FLAME_PATHS.middle} className="streak-flicker-2 fill-honey-400" />
              <path d={FLAME_PATHS.core} className="streak-flicker-3 fill-honey-100" />
            </svg>
          </div>
        </div>

        {/* The count: yesterday's number flips to today's */}
        <div className="mt-3 inline-grid h-[4.5rem] place-items-center [perspective:400px]">
          {milestone.from > 0 && (
            <span className="streak-old col-start-1 row-start-1 font-rounded text-7xl leading-none font-black text-linen-400 tabular-nums dark:text-linen-500">
              {milestone.from}
            </span>
          )}
          <span className="streak-new col-start-1 row-start-1 font-rounded text-7xl leading-none font-black text-coral-600 tabular-nums dark:text-coral-400">
            {milestone.to}
          </span>
        </div>
        <h2 id="streak-title" className="mt-1 font-rounded text-sm font-extrabold tracking-[0.2em] text-honey-700 uppercase dark:text-honey-300">
          <span className="sr-only">{milestone.to}-</span>day streak
        </h2>
        <span
          className="chip-pop mt-3 rounded-full bg-honey-400 px-3 py-1 font-rounded text-sm font-black text-linen-900 shadow-[0_2px_0_var(--color-honey-600)]"
          style={{ animationDelay: '1050ms' }}
        >
          +{milestone.xp} XP
        </span>

        <GoalTrack to={milestone.to} />

        <p id="streak-desc" className="milestone-rise mt-3 max-w-xs text-sm text-linen-700 dark:text-linen-200" style={{ '--d': '1500ms' } as CSSProperties}>
          {caption}
        </p>

        <button
          ref={button}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-reward milestone-rise mt-5 h-12 w-48 shrink-0 text-base"
          style={{ '--d': '1900ms' } as CSSProperties}
        >
          Keep going
        </button>
        {!goalDay && (
          // The countdown: the moment closes when this empties (the CSS
          // animation's end is the timer, so what you see is what happens).
          <div className="streak-countdown-track milestone-rise mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-linen-300/60 dark:bg-linen-700" style={{ '--d': '1900ms' } as CSSProperties} aria-hidden>
            <div
              className="streak-countdown h-full w-full rounded-full bg-honey-400"
              onAnimationEnd={(e) => {
                if (e.animationName === 'countdown-drain') onClose()
              }}
            />
          </div>
        )}
        <p className="milestone-rise mt-3 text-xs text-linen-500 dark:text-linen-400" style={{ '--d': '1800ms' } as CSSProperties}>
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}

/**
 * The way to the next goal. A stretch of a week or less gets one pip per day,
 * today's popping in; a longer one gets a bar that fills from yesterday to today.
 */
function GoalTrack({ to }: { to: number }) {
  const p = streakProgress(to)
  const span = p.goal.days - p.from
  const label = (
    <div className="mt-1.5 flex w-full justify-between font-rounded text-[11px] font-extrabold tracking-wide text-linen-500 uppercase dark:text-linen-400">
      <span>{p.passed ? `${p.passed.name} ✓` : 'Day 1'}</span>
      <span className={p.reached ? 'text-coral-700 dark:text-coral-300' : ''}>{p.goal.name}</span>
    </div>
  )

  if (span <= 7) {
    return (
      <div className="milestone-rise mt-5 w-full max-w-[18rem]" style={{ '--d': '700ms' } as CSSProperties} aria-hidden>
        <div className="flex justify-between gap-1.5">
          {Array.from({ length: span }, (_, i) => {
            const day = p.from + i + 1
            const done = day <= to
            const today = day === to
            const goal = day === p.goal.days
            return (
              <span
                key={day}
                className={`grid aspect-square flex-1 place-items-center rounded-full border-2 font-rounded text-xs font-black tabular-nums ${
                  done
                    ? 'border-coral-500 bg-linear-to-b from-honey-400 to-coral-500 text-cream shadow-[0_2px_0_var(--color-coral-700)]'
                    : goal
                      ? 'border-honey-400 bg-honey-50 text-honey-700 dark:bg-honey-500/10 dark:text-honey-300'
                      : 'border-dashed border-linen-300 text-linen-400 dark:border-linen-600 dark:text-linen-500'
                } ${today ? 'streak-pip-new' : ''}`}
              >
                {done ? (
                  <svg viewBox={FLAME_VIEWBOX} className="h-[55%] w-[55%]">
                    <path d={FLAME_PATHS.outer} className="fill-cream" />
                  </svg>
                ) : goal ? (
                  '★'
                ) : (
                  day
                )}
              </span>
            )
          })}
        </div>
        {label}
      </div>
    )
  }

  // Yesterday's place on the bar, so today's step is the part that fills.
  const before = streakProgress(to - 1)
  const fromPct = before.goal.days === p.goal.days ? before.fraction * 100 : 0
  return (
    <div className="milestone-rise mt-5 w-full max-w-[18rem]" style={{ '--d': '700ms' } as CSSProperties} aria-hidden>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-linen-200 dark:bg-linen-700">
        <div
          className="streak-bar-fill relative h-full rounded-full bg-linear-to-r from-honey-400 to-coral-500"
          style={{ width: `${p.fraction * 100}%`, '--from': `${fromPct}%` } as CSSProperties}
        >
          <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/35" />
        </div>
      </div>
      {label}
    </div>
  )
}
