/**
 * The bottom of the signed-out landing page: five short answers for the
 * cautious first-timer, then the finale on its own dawn band. The finale is
 * one centred column sized to fit a 900px screen: the promise restated, the
 * same CTA pair as the hero, and right under it the payoff, a phone showing
 * the quiz finished with open hands at its base catching the manna. The FAQ
 * comes first so the CTAs close the page, as they open it
 * (docs/design/landing/bar.md #5).
 */
import type { CSSProperties, ReactNode } from 'react'
import type { LandingActions } from './Landing'
import { CtaPair } from './CtaPair'
import { MannaHands } from './MannaHands'
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
  const [ref, phase] = useReplayInView<HTMLDivElement>(0.3)
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
        ref={ref}
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
          <FinishedStage />
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
 * The rewards fanning out from the finished quiz, hugging the phone's top
 * half. [left, top, size, depth, piece]: "back" pieces sit behind the phone,
 * "front" pieces overlap its edge. Confetti is forest and cream; the medal is
 * the one honey reward mark outside the screen, so honey stays scarce.
 * Particles (confetti, sparkle) are skipped under reduced motion.
 */
type Piece = 'medal' | 'check' | 'sparkle' | 'strip-forest' | 'strip-cream'
const REWARDS: [number, number, number, 'back' | 'front', Piece][] = [
  [176, 0, 28, 'back', 'strip-forest'],
  [352, 2, 26, 'back', 'strip-cream'],
  [398, 118, 26, 'back', 'strip-forest'],
  [110, 74, 24, 'back', 'strip-cream'],
  [120, 150, 46, 'front', 'check'],
  [334, 20, 64, 'front', 'medal'],
  [390, 196, 24, 'front', 'sparkle'],
]
const PARTICLES = new Set<Piece>(['sparkle', 'strip-forest', 'strip-cream'])
const PHONE_CENTER = { x: 260, y: 180 }

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
    default: {
      const tone = {
        'strip-forest': 'bg-forest-400 -rotate-[22deg]',
        'strip-cream': 'bg-cream ring-1 ring-linen-300 rotate-[30deg] dark:ring-linen-500',
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
        depth === 'back' ? 'opacity-85' : 'drop-shadow-md'
      }`}
      style={
        {
          left,
          top,
          '--fx': `${Math.round((PHONE_CENTER.x - left - size / 2) * 0.6)}px`,
          '--fy': `${Math.round((PHONE_CENTER.y - top - size / 2) * 0.6)}px`,
          '--d': `${i * 45}ms`,
        } as CSSProperties
      }
    >
      <RewardPiece piece={piece} size={size} />
    </span>
  ))
}

/**
 * The finale's single container, on a fixed 520×460 stage scaled whole on
 * smaller screens so it keeps its shape. One silhouette on one patch of
 * ground: the phone in the middle, rewards around its top, and the open
 * hands in front of its base catching the manna.
 */
function FinishedStage() {
  return (
    <div
      role="img"
      aria-label="A phone showing a finished quiz, 4 of 5 right and plus 50 XP, with confetti and a gold medal around it, and open hands in front of it catching falling manna."
      className="relative mt-4 h-[285px] w-[322px] sm:h-[345px] sm:w-[390px] xl:h-[460px] xl:w-[520px]"
    >
      <div className="absolute top-0 left-0 h-[460px] w-[520px] origin-top-left scale-[0.62] sm:scale-75 xl:scale-100">
        {/* Morning light behind the phone; fades out well inside the stage, so it never shows an edge. */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,var(--color-cream),transparent)] dark:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-sky-700)_45%,transparent),transparent)]" />
        <div className="absolute bottom-[4px] left-[70px] h-[26px] w-[380px] rounded-[50%] bg-forest-900/15 blur-md dark:bg-linen-950/80" />

        <Rewards depth="back" />
        <FinishedPhone />

        {/*
         * Omer's spot: the mascot (a honey-gold manna bowl, see "Omer, the
         * mascot" in docs/DESIGN.md) will stand here in front of the phone's
         * base, catching the manna. Until his art exists, open hands do.
         */}
        <div data-slot="omer" className="absolute bottom-0 left-[110px] h-[294px] w-[300px]">
          <MannaHands className="h-full w-full" />
        </div>

        <Rewards depth="front" />
      </div>
    </div>
  )
}

const RING = 2 * Math.PI * 44

/**
 * The quiz-finished screen from DESIGN.md's celebration table: the score
 * counted up, the XP earned. Everything that matters sits in the top half,
 * above the hands. A generic frame with a browser address bar, because today
 * the app lives in the phone's browser, not an app store.
 */
function FinishedPhone() {
  return (
    <div
      aria-hidden
      className="absolute top-[12px] left-[150px] h-[410px] w-[220px] rounded-[36px] bg-linen-900 p-[8px] shadow-2xl shadow-linen-900/40 ring-1 ring-linen-700 dark:bg-linen-950 dark:ring-linen-600"
    >
      <div className="flex h-full flex-col items-center overflow-hidden rounded-[29px] bg-cream text-center dark:bg-linen-900">
        <span className="mt-3 h-[16px] w-[110px] shrink-0 rounded-full bg-linen-100 dark:bg-linen-800" />

        <div className="mt-4 font-rounded text-[10px] font-bold tracking-wide text-linen-500 uppercase dark:text-linen-400">
          Quiz complete
        </div>

        <div className="relative mt-2 h-[104px] w-[104px]">
          <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90">
            <circle
              cx="52"
              cy="52"
              r="44"
              className="fill-none stroke-linen-200 dark:stroke-linen-700"
              strokeWidth="10"
            />
            <circle
              cx="52"
              cy="52"
              r="44"
              className="final-ring fill-none stroke-forest-500"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING}
              style={{ '--ring': RING, '--ring-to': RING * 0.2 } as CSSProperties}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-rounded text-[36px] leading-none font-black text-forest-700 tabular-nums dark:text-forest-300">
              <span className="final-score" />
              <span className="text-[16px] text-linen-500 dark:text-linen-400">/5</span>
            </span>
          </div>
        </div>

        {/* Verdict and reward on one line, clear of the hands below. */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-rounded text-[20px] font-black text-linen-900 dark:text-linen-100">
            Nice work!
          </span>
          <span className="rounded-full bg-honey-400 px-2 py-0.5 font-rounded text-[12px] font-black text-linen-900">
            +50 XP
          </span>
        </div>
      </div>
    </div>
  )
}
