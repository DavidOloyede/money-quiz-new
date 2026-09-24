/**
 * The bottom of the signed-out landing page: five short answers for the
 * cautious first-timer, then the finale on its own dawn band. The finale is
 * one centred column sized to fit a 900px screen: the promise restated, the
 * same CTA pair as the hero, and right under it the payoff, a phone showing
 * the quiz finished with confetti bursting around it and manna falling into
 * the bowl at its foot. The FAQ
 * comes first so the CTAs close the page, as they open it
 * (docs/design/landing/bar.md #5).
 */
import type { CSSProperties, ReactNode } from 'react'
import type { LandingActions } from './Landing'
import { CtaPair } from './CtaPair'
import { MannaBowl } from './MannaBowl'
import { useReplayInView } from './useReplayInView'
import { MannaLogo } from '../icons'
import { BODY, COLUMN, DISPLAY, HEADING, SECTION } from './styles'
import './final.css'

/*
 * The FAQ heading keeps HEADING's size but drops a weight and a shade, so it
 * clearly ranks below the closing DISPLAY headline instead of competing.
 */
const QUIET_HEADING = HEADING.replace('font-extrabold', 'font-bold').replace(
  'text-linen-900 dark:text-linen-50',
  'text-linen-500 dark:text-linen-400',
)

/* Quiet text links: no fill or pill, but still a full 44px tap target. */
const QUIET_LINK =
  'inline-flex h-11 items-center px-2 font-sans font-medium text-linen-600 underline decoration-linen-400/60 underline-offset-4 transition-colors duration-150 hover:text-forest-700 hover:decoration-forest-700 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-forest-600 dark:text-linen-300 dark:decoration-linen-500 dark:hover:text-forest-300 dark:hover:decoration-forest-300'

const Lead = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-linen-900 dark:text-linen-100">{children}</strong>
)

/* One or two lines each: the answer a skimmer needs, led by the verdict. */
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'Is my data safe?',
    a: (
      <>
        <Lead>Yes.</Lead> It’s yours, in your own account. Bank links use Plaid, so we never see your login.
      </>
    ),
  },
  {
    q: 'Do I have to connect a bank?',
    a: (
      <>
        <Lead>No.</Lead> Upload a CSV from your bank’s website instead.
      </>
    ),
  },
  {
    q: 'Is it free?',
    a: (
      <>
        <Lead>Yes.</Lead> No card needed, nothing locked away.
      </>
    ),
  },
  {
    q: 'Who is it for?',
    a: (
      <>
        <Lead>Anyone starting to budget</Lead> or wanting to steward money with more intention, from any faith
        or none.
      </>
    ),
  },
  {
    q: 'Is there a phone app?',
    a: (
      <>
        <Lead>Not yet.</Lead> The iPhone app isn’t out, but the website works in any phone’s browser.
      </>
    ),
  },
]

export function LandingFinal(actions: LandingActions) {
  const { onImport, onSignIn } = actions
  const [ref, phase] = useReplayInView<HTMLDivElement>()
  return (
    <section id="landing-final">
      <div className={`${SECTION} pb-20 lg:pb-20`}>
        <div className={COLUMN}>
          <div className="mx-auto max-w-[800px]">
            <h2 className={`${QUIET_HEADING} text-center`}>Before you try it</h2>
            <dl className="mt-8 divide-y divide-linen-200 border-y border-linen-200 sm:mt-10 dark:divide-linen-800 dark:border-linen-800">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="grid gap-1 py-4 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-rounded text-[17px] leading-[1.6] font-bold text-forest-700 sm:text-lg dark:text-forest-300">
                    {q}
                  </dt>
                  <dd className={BODY}>{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/*
       * The finale's own full-bleed band: it opens on the page colour (no
       * seam) and turns to dawn within its top padding, so it reads as a
       * new scene. Dark mode is the same story before sunrise: night blue
       * warming toward the bottom.
       */}
      <div
        data-motion={phase}
        className="final-scene relative isolate overflow-hidden bg-[linear-gradient(to_bottom,var(--color-linen-50),var(--color-honey-100)_5rem,var(--color-sky-100)_68%,var(--color-sky-200))] dark:bg-[linear-gradient(to_bottom,var(--color-linen-950),var(--color-sky-950)_5rem,var(--color-sky-900)_72%,var(--color-honey-950))]"
      >
        <div className="flex flex-col items-center px-4 pt-20 text-center sm:px-6">
          <h2 className={`${DISPLAY} max-w-[21ch] text-forest-700 dark:text-forest-300`}>
            Enough for today, and a plan for what’s next.
          </h2>
          <CtaPair {...actions} className="mt-8 items-center" />
          <button type="button" onClick={onImport} className={`${QUIET_LINK} mt-1.5 text-base`}>
            Or import your own CSV
          </button>
          {/* Watch the phone itself: the band is taller than a screen, so its
              celebration should fire when the phone, not the headline, is centred. */}
          <div ref={ref}>
            <FinishedStage />
          </div>
        </div>

        <footer className="px-4 pb-4 sm:px-6">
          <div
            className={`${COLUMN} flex items-center justify-between gap-4 border-t border-sky-300/60 pt-2 text-sm dark:border-sky-800`}
          >
            <span className="flex items-center gap-2 font-rounded font-extrabold text-linen-900 dark:text-linen-100">
              <MannaLogo className="h-6 w-6" />
              Manna Money
            </span>
            {onSignIn && (
              <button type="button" onClick={onSignIn} className={`${QUIET_LINK} -mr-2 text-sm`}>
                Sign in
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  )
}

/*
 * Manna in stage pixels: a short stream falling into the bowl at the phone's
 * foot. One direction, each flake on its own slow clock.
 */
const FLAKES = [
  { x: 14, size: 10, dur: 4.5, delay: -1.1, tone: 'bg-honey-300' },
  { x: 40, size: 8, dur: 5.5, delay: -3.4, tone: 'bg-honey-200' },
  { x: 26, size: 11, dur: 5, delay: -2.2, tone: 'bg-honey-400' },
  { x: 54, size: 9, dur: 6, delay: -4.6, tone: 'bg-honey-300' },
]

/*
 * The rewards that burst out of the finished quiz, gathered around the
 * phone. [left, top, size, depth, piece]: "back" pieces sit behind the phone,
 * smaller and softer; "front" pieces overlap it. Confetti stays in DESIGN.md's
 * honey, forest and cream; honey is only the medal and one strip, so it stays
 * the scarce reward colour. Particles are skipped under reduced motion.
 */
type Piece = 'medal' | 'check' | 'sparkle' | 'strip-forest' | 'strip-cream' | 'strip-honey' | 'dot-forest'
const REWARDS: [number, number, number, 'back' | 'front', Piece][] = [
  [104, 10, 30, 'back', 'strip-forest'],
  [420, 128, 26, 'back', 'strip-cream'],
  [446, 396, 24, 'back', 'strip-honey'],
  [52, 104, 18, 'back', 'dot-forest'],
  [414, 250, 30, 'front', 'sparkle'],
  [82, 178, 56, 'front', 'check'],
  [340, -6, 70, 'front', 'medal'],
  [398, 336, 32, 'front', 'strip-cream'],
]
const PARTICLES = new Set<Piece>(['sparkle', 'strip-forest', 'strip-cream', 'strip-honey', 'dot-forest'])
const PHONE_CENTER = { x: 260, y: 254 }

function RewardPiece({ piece, size }: { piece: Piece; size: number }) {
  switch (piece) {
    case 'medal':
      return (
        <span
          className="grid rotate-12 place-items-center rounded-full border-4 border-honey-200 bg-honey-400 text-honey-800 dark:border-honey-300"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor">
            <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
          </svg>
        </span>
      )
    case 'check':
      return (
        <span
          className="grid -rotate-6 place-items-center rounded-full bg-forest-500 text-white"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-1/2 w-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      )
    case 'sparkle':
      return (
        <svg viewBox="0 0 24 24" className="fill-forest-400" style={{ width: size, height: size }}>
          <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" />
        </svg>
      )
    case 'dot-forest':
      return <span className="block rounded-full bg-forest-300" style={{ width: size, height: size }} />
    default: {
      const tone = {
        'strip-forest': 'bg-forest-400 -rotate-[22deg]',
        'strip-cream': 'bg-cream ring-1 ring-linen-300 rotate-[28deg] dark:ring-linen-500',
        'strip-honey': 'bg-honey-300 rotate-[62deg]',
      }[piece]
      return <span className={`block rounded-[4px] ${tone}`} style={{ width: size * 0.45, height: size }} />
    }
  }
}

function Rewards({ depth }: { depth: 'back' | 'front' }) {
  return REWARDS.filter((r) => r[3] === depth).map(([left, top, size, , piece], i) => (
    <span
      key={`${piece}-${left}`}
      className={`final-burst absolute ${PARTICLES.has(piece) ? 'final-particle' : ''} ${
        depth === 'back' ? 'opacity-80 blur-[0.5px]' : 'drop-shadow-md'
      }`}
      style={
        {
          left,
          top,
          '--fx': `${Math.round((PHONE_CENTER.x - left - size / 2) * 0.7)}px`,
          '--fy': `${Math.round((PHONE_CENTER.y - top - size / 2) * 0.7)}px`,
          '--d': `${i * 50}ms`,
        } as CSSProperties
      }
    >
      <RewardPiece piece={piece} size={size} />
    </span>
  ))
}

/**
 * The closing picture, on a fixed 520×520 stage scaled whole on smaller
 * screens (like the hero's) so it keeps its shape at every width: the
 * finished-quiz phone in the middle, rewards bursting around it, and the
 * bowl in front of its foot catching the day's manna.
 */
function FinishedStage() {
  return (
    <div
      role="img"
      aria-label="A phone showing a finished quiz, 4 of 5 right and plus 50 XP, with confetti and a gold medal around it and manna falling into a bowl at its foot."
      className="relative mt-4 h-[322px] w-[322px] sm:h-[390px] sm:w-[390px] xl:h-[520px] xl:w-[520px]"
    >
      <div className="absolute top-0 left-0 h-[520px] w-[520px] origin-top-left scale-[0.62] sm:scale-75 xl:scale-100">
        {/* Morning light behind the phone; fades out well inside the stage, so it never shows an edge. */}
        <div className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,var(--color-cream),transparent)] dark:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-sky-700)_45%,transparent),transparent)]" />
        <div className="absolute bottom-[2px] left-[40px] h-[28px] w-[440px] rounded-[50%] bg-forest-900/15 blur-md dark:bg-linen-950/80" />

        <Rewards depth="back" />

        <div className="absolute top-[250px] left-[74px] h-[190px] w-[70px] overflow-hidden">
          {FLAKES.map((f) => (
            <span
              key={f.x}
              className={`final-flake absolute top-0 rounded-full ${f.tone}`}
              style={
                {
                  left: f.x,
                  width: f.size,
                  height: f.size,
                  '--dur': `${f.dur}s`,
                  '--delay': `${f.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <FinishedPhone />

        {/*
         * The same bowl as the hero, in front of the phone's foot where the
         * manna lands. Omer's spot: when his art arrives (a honey-gold manna
         * bowl, see "Omer, the mascot" in docs/DESIGN.md), he takes its place.
         */}
        <MannaBowl className="absolute bottom-[8px] left-[34px] h-[100px] w-[156px] drop-shadow-md" />

        <Rewards depth="front" />
      </div>
    </div>
  )
}

const RING = 2 * Math.PI * 52

/**
 * The quiz-finished screen from DESIGN.md's celebration table, kept to one
 * of each thing: the score counted up, the verdict, the XP and streak earned,
 * the level it feeds, and the way on. A generic frame with a browser address
 * bar, because today the app lives in the phone's browser, not an app store.
 */
function FinishedPhone() {
  return (
    <div
      aria-hidden
      className="absolute top-[14px] left-[140px] h-[480px] w-[240px] rounded-[40px] bg-linen-900 p-[9px] shadow-2xl shadow-linen-900/40 ring-1 ring-linen-700 dark:bg-linen-950 dark:ring-linen-600"
    >
      <div className="flex h-full flex-col items-center overflow-hidden rounded-[32px] bg-cream px-5 pb-5 text-center dark:bg-linen-900">
        <span className="mt-3 h-[16px] w-[120px] shrink-0 rounded-full bg-linen-100 dark:bg-linen-800" />

        <div className="mt-6 font-rounded text-[10px] font-bold tracking-wide text-linen-500 uppercase dark:text-linen-400">
          Quiz complete
        </div>

        <div className="relative mt-4 h-[136px] w-[136px]">
          <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90">
            <circle
              cx="62"
              cy="62"
              r="52"
              className="fill-none stroke-linen-200 dark:stroke-linen-700"
              strokeWidth="11"
            />
            <circle
              cx="62"
              cy="62"
              r="52"
              className="final-ring fill-none stroke-forest-500"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={RING}
              style={{ '--ring': RING, '--ring-to': RING * 0.2 } as CSSProperties}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-rounded text-[46px] leading-none font-black text-forest-700 tabular-nums dark:text-forest-300">
              <span className="final-score" />
              <span className="text-[18px] text-linen-500 dark:text-linen-400">/5</span>
            </span>
          </div>
        </div>

        <div className="mt-5 font-rounded text-[24px] font-black text-linen-900 dark:text-linen-100">Nice work!</div>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-honey-400 px-2.5 py-1 font-rounded text-[13px] font-black text-linen-900">
            +50 XP
          </span>
          <span className="rounded-full bg-honey-50 px-2.5 py-1 font-rounded text-[12px] font-bold text-honey-700 dark:bg-honey-500/15 dark:text-honey-300">
            3-day streak
          </span>
        </div>

        {/* Progress toward the next level (levels and titles from core's gamification). */}
        <div className="mt-auto w-full text-left">
          <div className="font-rounded text-[12px] font-bold text-linen-700 dark:text-linen-200">
            Level 3 · Faithful With Little
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-linen-200 dark:bg-linen-700">
            <div className="h-full w-[70%] rounded-full bg-honey-400" />
          </div>
        </div>

        <div className="mt-4 flex h-10 w-full shrink-0 items-center justify-center rounded-xl bg-forest-600 font-rounded text-[13px] font-extrabold text-white">
          Continue
        </div>
      </div>
    </div>
  )
}
