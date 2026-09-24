/**
 * The landing page's first screen: the promise, the one button, and a picture
 * of the moment the app is built around — manna falling from the logo beside
 * a phone mid-quiz, just answered right. Per docs/design/landing/bar.md the
 * hero says one thing: no nav, no feature list, a single CTA.
 */
import type { CSSProperties } from 'react'
import type { LandingActions } from './Landing'
import { CtaPair } from './CtaPair'
import { MannaHands } from './MannaHands'
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
        {onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex h-11 items-center rounded-xl bg-forest-600/[0.06] px-4 font-sans font-semibold text-forest-700 underline decoration-forest-700/30 underline-offset-4 transition-colors duration-150 hover:bg-forest-600/12 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 dark:bg-forest-300/[0.07] dark:text-forest-300 dark:decoration-forest-300/40 dark:hover:bg-forest-300/12 dark:hover:decoration-forest-300"
          >
            Sign in
          </button>
        )}
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
 * Manna, in stage pixels: flakes slip out from under the logo tile and fade
 * into the open hands in Omer's spot, all one way, each on its own slow clock
 * so they never fall in step. Starting below the tile (never over the glyph)
 * keeps them reading as manna leaving the logo rather than as features.
 */
const FLAKES: { x: number; size: number; dur: number; delay: number; tone: string }[] = [
  { x: 8, size: 13, dur: 5, delay: -1.2, tone: 'bg-honey-400' },
  { x: 44, size: 11, dur: 5.5, delay: -3.6, tone: 'bg-honey-300' },
  { x: 76, size: 14, dur: 4.5, delay: -2.3, tone: 'bg-honey-400' },
  { x: 26, size: 10, dur: 6, delay: -4.8, tone: 'bg-honey-300' },
  { x: 62, size: 12, dur: 5, delay: -0.2, tone: 'bg-honey-300' },
]

/**
 * One object on a fixed 480×600 stage, scaled whole on smaller screens so it
 * keeps its shape at every width. The phone is the centre; the logo sits
 * flat and square beside its top, as the brand mark it is (a tilt or sticker
 * shadow makes the glyph read as a character); manna falls past the tile into the open hands
 * (later Omer) on the ground beside the phone's base.
 */
function HeroVisual() {
  return (
    <div
      role="img"
      aria-label="Manna falling past the Manna Money logo beside a phone showing a quiz question, “Which category did you spend the most on in August?”, answered correctly with Dining out for plus 10 XP."
      className="relative mx-auto h-[288px] w-[230px] sm:h-[390px] sm:w-[312px] xl:h-[648px] xl:w-[518px]"
    >
      <div className="absolute top-0 left-0 h-[600px] w-[480px] origin-top-left scale-[0.48] sm:scale-[0.65] xl:scale-[1.08]">
        {/* The ground the whole unit stands on. */}
        <div className="absolute bottom-0 left-[4px] h-[28px] w-[470px] rounded-[50%] bg-forest-900/10 blur-md dark:bg-linen-950/80" />

        <div className="absolute top-[226px] left-[32px] h-[300px] w-[110px] overflow-hidden">
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
                  '--fall': '290px',
                  '--drift': `${Math.round(f.size / 3)}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/*
         * Omer stands here, on the ground beside the phone's base where the
         * manna falls. The mascot (a honey-gold manna bowl, see "Omer, the
         * mascot" in docs/DESIGN.md) replaces this wrapper's contents when his
         * art arrives; until then open hands receive the flakes, so the unit
         * is complete either way.
         */}
        <div data-slot="omer" className="absolute bottom-0 left-[-54px] h-[264px] w-[270px]">
          <MannaHands className="h-full w-full" />
        </div>

        <QuizPhone className="absolute top-0 right-0" />

        <div className="absolute top-[56px] left-[10px] h-[170px] w-[170px]">
          <MannaLogo className="hero-logo h-full w-full" />
        </div>
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
