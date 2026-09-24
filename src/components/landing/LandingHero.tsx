/**
 * The landing page's first screen: the promise, the one button, and a picture
 * of the moment the app is built around — manna falling from morning clouds
 * into a bowl beside a phone mid-quiz, just answered right. Per docs/design/landing/bar.md the
 * hero says one thing: no nav, no feature list, a single CTA. The top bar
 * holds only the logo, a sun/moon theme switch and Sign in.
 */
import type { CSSProperties } from 'react'
import type { LandingActions } from './Landing'
import { CtaPair } from './CtaPair'
import { ThemeSwitch } from './ThemeSwitch'
import { MannaBowl } from './MannaBowl'
import { useReplayInView } from './useReplayInView'
import { BODY, COLUMN, DISPLAY } from './styles'
import { CheckIcon, MannaLogo } from '../icons'
import './hero.css'

/** Just wide enough for the two-line headline beside a visual that outweighs it. */
const HERO_COLUMN = `${COLUMN} lg:max-w-[1160px]`

export function LandingHero(actions: LandingActions) {
  const { onSignIn } = actions
  // Replays the quiz moment on every scroll back to the top, not just once.
  const [ref, phase] = useReplayInView<HTMLElement>()
  return (
    <section
      ref={ref}
      id="landing-hero"
      data-motion={phase}
      className="relative isolate flex flex-col bg-linear-to-b from-cream via-honey-100 via-60% to-sky-100 px-4 pb-16 sm:px-6 lg:min-h-svh lg:pb-24 dark:from-linen-950 dark:via-honey-950/50 dark:to-sky-950"
    >
      {/* Melts the dawn into the page so the next section has no hard seam. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-12 bg-linear-to-b from-transparent to-linen-50 dark:to-linen-950"
      />

      <header className={`${HERO_COLUMN} flex h-16 items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <MannaLogo className="h-9 w-9" />
          <span className="font-rounded text-xl font-extrabold tracking-tight text-forest-700 dark:text-forest-300">
            Manna Money
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitch />
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex h-11 items-center rounded-xl bg-forest-600/[0.06] px-4 font-sans font-semibold text-forest-700 underline decoration-forest-700/30 underline-offset-4 transition-colors duration-150 hover:bg-forest-600/12 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 dark:bg-forest-300/[0.07] dark:text-forest-300 dark:decoration-forest-300/40 dark:hover:bg-forest-300/12 dark:hover:decoration-forest-300"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <div
        className={`${HERO_COLUMN} grid flex-1 items-center gap-5 pt-1 lg:grid-cols-[auto_minmax(610px,1fr)] lg:gap-8 lg:pt-0`}
      >
        <HeroVisual />

        <div className="mx-auto max-w-[640px] text-center lg:mx-0 lg:text-left">
          <h1 className={`${DISPLAY} text-linen-900 dark:text-linen-50`}>
            {/* One sentence per line reads as the two halves of the promise. */}
            <span className="block">Enough for today.</span>{' '}
            <span className="block">A plan for tomorrow.</span>
          </h1>
          <p className={`${BODY} mx-auto mt-4 max-w-[520px] lg:mx-0 lg:mt-6`}>
            Manna Money turns your real transactions into 2-minute questions, simple budgets and
            small wins worth celebrating. Free and private.
          </p>
          <CtaPair {...actions} className="mt-7 lg:mt-10" />
        </div>
      </div>
    </section>
  )
}

/*
 * Manna, in stage pixels: flakes slip out from under the clouds and fall into
 * the bowl, all one way, each on its own slow clock so they never fall in
 * step. The bowl is drawn in front, so each flake disappears into it.
 */
const FLAKES: { x: number; size: number; dur: number; delay: number; tone: string }[] = [
  { x: 18, size: 13, dur: 5, delay: -1.2, tone: 'bg-honey-400' },
  { x: 54, size: 11, dur: 5.5, delay: -3.6, tone: 'bg-honey-300' },
  { x: 92, size: 14, dur: 4.5, delay: -2.3, tone: 'bg-honey-400' },
  { x: 36, size: 10, dur: 6, delay: -4.8, tone: 'bg-honey-300' },
  { x: 74, size: 12, dur: 5, delay: -0.2, tone: 'bg-honey-300' },
  { x: 106, size: 9, dur: 6.5, delay: -5.6, tone: 'bg-honey-200' },
]

/* The sun's eight rays; the clouds, drawn on top, hide the lower ones. */
const SUN = { cx: 130, cy: 16, r: 22 }
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4
  const [c, sn] = [Math.cos(a), Math.sin(a)]
  return {
    x1: SUN.cx + c * (SUN.r + 7),
    y1: SUN.cy + sn * (SUN.r + 7),
    x2: SUN.cx + c * (SUN.r + 15),
    y2: SUN.cy + sn * (SUN.r + 15),
  }
})

/**
 * Two soft morning clouds with a bright little sun peeking out behind them
 * (the ⛅ idea); the manna comes from under the clouds.
 */
function Clouds({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 -20 240 150" aria-hidden>
      <g className="stroke-honey-400 dark:stroke-honey-300/80" strokeWidth="4" strokeLinecap="round">
        {RAYS.map((r, i) => (
          <line key={i} {...r} />
        ))}
      </g>
      <circle {...SUN} className="fill-honey-300 stroke-honey-400 dark:fill-honey-300/90 dark:stroke-honey-400/80" strokeWidth="2" />
      <g className="fill-sky-100 dark:fill-sky-950">
        <circle cx="170" cy="50" r="26" />
        <circle cx="198" cy="60" r="20" />
        <circle cx="146" cy="62" r="18" />
        <rect x="146" y="58" width="52" height="22" rx="11" />
      </g>
      <g className="fill-cream dark:fill-sky-800">
        <circle cx="70" cy="70" r="34" />
        <circle cx="112" cy="58" r="40" />
        <circle cx="152" cy="80" r="26" />
        <circle cx="38" cy="88" r="22" />
        <rect x="38" y="84" width="140" height="26" rx="13" />
      </g>
    </svg>
  )
}

/**
 * One object on a fixed 480×600 stage, scaled whole on smaller screens so it
 * keeps its shape at every width. The phone is the centre; beside its top,
 * morning clouds (a little sun behind them) let manna fall into the logo's own bowl on the ground by the
 * phone's base (where Omer will later stand, once his art exists).
 */
function HeroVisual() {
  return (
    <div
      role="img"
      aria-label="Manna falling from morning clouds into a bowl, beside a phone showing a quiz question, “Which category did you spend the most on in August?”, answered correctly with Dining out for plus 10 XP."
      className="relative mx-auto h-[288px] w-[230px] sm:h-[390px] sm:w-[312px] xl:h-[648px] xl:w-[518px]"
    >
      <div className="absolute top-0 left-0 h-[600px] w-[480px] origin-top-left scale-[0.48] sm:scale-[0.65] xl:scale-[1.08]">
        {/* The ground the whole unit stands on. */}
        <div className="absolute bottom-0 left-[20px] h-[28px] w-[460px] rounded-[50%] bg-forest-900/10 blur-md dark:bg-linen-950/80" />

        <div className="absolute top-[150px] left-[40px] h-[380px] w-[130px] overflow-hidden">
          {FLAKES.map((f, i) => (
            <span
              key={i}
              className={`hero-flake absolute top-0 rounded-full ${f.tone} ring-2 ring-honey-500/50 dark:ring-honey-300/30`}
              style={
                {
                  left: f.x,
                  width: f.size,
                  height: f.size,
                  '--dur': `${f.dur}s`,
                  '--delay': `${f.delay}s`,
                  '--fall': '370px',
                  '--drift': `${Math.round(f.size / 3)}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <Clouds className="absolute top-[18px] left-[-20px] h-[168px] w-[270px] drop-shadow-sm" />

        <QuizPhone className="absolute top-0 right-0" />

        {/*
         * Omer's spot: when his art arrives (a honey-gold manna bowl, see
         * "Omer, the mascot" in docs/DESIGN.md), he takes the bowl's place.
         */}
        <MannaBowl className="absolute bottom-[8px] left-[20px] h-[109px] w-[170px]" />
      </div>
    </div>
  )
}

const OPTIONS = ['Groceries', 'Dining out', 'Gas & fuel']
const CORRECT = 1

/**
 * A simplified slice of the quiz screen at the instant a right answer lands:
 * the question, three answers, and the payoff. No buttons, so nothing in the
 * picture competes with the page's one real CTA.
 */
function QuizPhone({ className }: { className: string }) {
  return (
    <div
      className={`${className} h-[580px] w-[290px] rounded-[48px] bg-linen-900 p-[10px] shadow-2xl shadow-linen-900/40 ring-1 ring-linen-700 dark:bg-linen-950 dark:ring-linen-600`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[38px] bg-cream dark:bg-linen-900">
        <div className="flex h-11 shrink-0 items-center px-7 pt-1 text-[13px] font-semibold text-linen-900 tabular-nums dark:text-linen-100">
          9:41
          <span className="absolute top-2.5 left-1/2 h-[26px] w-[86px] -translate-x-1/2 rounded-full bg-linen-900 dark:bg-linen-950" />
        </div>

        <div className="px-6 pt-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-linen-200 dark:bg-linen-700">
            <div className="h-full w-3/5 rounded-full bg-forest-500" />
          </div>
        </div>

        <div className="px-6 pt-7">
          <div className="font-rounded text-[22px] leading-snug font-extrabold text-linen-900 dark:text-linen-100">
            Which category did you spend the most on in August?
          </div>

          <div className="mt-6 space-y-3">
            {OPTIONS.map((opt, i) =>
              i === CORRECT ? (
                <div
                  key={opt}
                  className="hero-pop flex items-center justify-between rounded-2xl border-2 border-forest-500 bg-forest-50 px-4 py-3 font-rounded text-[17px] font-bold text-forest-800 dark:bg-forest-500/15 dark:text-forest-300"
                >
                  {opt}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                </div>
              ) : (
                <div
                  key={opt}
                  className="rounded-2xl border-2 border-linen-200 px-4 py-3 font-rounded text-[17px] font-semibold text-linen-500 dark:border-linen-700 dark:text-linen-400"
                >
                  {opt}
                </div>
              ),
            )}
          </div>
        </div>

        {/* One payoff beat: the verdict and the reward arrive together. */}
        <div className="hero-panel mt-auto bg-forest-50 px-6 pt-5 pb-8 dark:bg-forest-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-rounded text-[24px] font-black text-forest-700 dark:text-forest-300">
              <CheckIcon className="h-6 w-6" />
              Correct!
            </div>
            <span className="hero-xp rounded-full bg-honey-400 px-3 py-1 font-rounded text-[16px] font-black text-linen-900">
              +10 XP
            </span>
          </div>
          <div className="mt-1.5 text-[14px] text-forest-800 dark:text-forest-200">
            Dining out, <span className="font-semibold tabular-nums">$412</span> in August.
          </div>
        </div>
      </div>
    </div>
  )
}
