/**
 * The bottom of the signed-out landing page: short, always-visible answers
 * for the cautious first-timer, then the closing scene. That scene mirrors the
 * hero (text and the same button on one side, a phone on the other): where
 * the hero's phone is mid-quiz, this one shows the quiz finished, with the
 * rewards bursting out around it and manna falling to Omer's spot at its
 * base. The FAQ comes first so the button is the last thing on the page
 * (docs/design/landing/bar.md #5).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { LandingActions } from './Landing'
import { PressButton } from './PressButton'
import { CheckIcon, MannaLogo } from '../icons'
import { BODY, COLUMN, DISPLAY, HEADING, SECTION } from './styles'
import './final.css'

const LINK =
  'inline-flex h-11 items-center rounded-xl px-4 font-sans font-semibold text-forest-700 underline decoration-forest-700/30 underline-offset-4 transition-colors duration-150 hover:bg-forest-600/10 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 dark:text-forest-300 dark:decoration-forest-300/40 dark:hover:bg-forest-300/10 dark:hover:decoration-forest-300'

/* Kept to ~100 characters each so an answer is 2–3 lines on a phone. */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is it free?',
    a: 'Yes. No card to enter, nothing locked away. If paid extras ever come, we’ll say so plainly first.',
  },
  {
    q: 'Do I have to connect my bank?',
    a: 'No. Use the sample data or a CSV from your bank’s website. Connecting a bank is optional, with an account.',
  },
  {
    q: 'Where does my data live?',
    a: 'In this browser, on this device. Sign in to sync, and a copy is also kept in your account on our server.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Everything works without one. An account adds sync across devices and the optional bank link.',
  },
  {
    q: 'Is this only for Christians?',
    a: 'Not at all. The idea comes from manna, enough for each day. Scripture stays in a few quiet places.',
  },
  {
    q: 'Is there a phone app?',
    a: 'Not in the app stores yet. Manna Money works in any phone’s web browser, iPhone or Android.',
  },
]

type Anim = 'rest' | 'armed' | 'in'

/**
 * The finished-quiz burst plays once, when the scene scrolls into view. It
 * starts at rest (everything in place) so reduced motion, a missing
 * IntersectionObserver or a failed script all still show the finished moment.
 */
function useRevealOnce() {
  const ref = useRef<HTMLDivElement>(null)
  const [anim, setAnim] = useState<Anim>('rest')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setAnim('armed')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnim('in')
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, anim }
}

export function LandingFinal({ onTrySample, onImport, onSignIn }: LandingActions) {
  const { ref, anim } = useRevealOnce()
  return (
    <section id="landing-final">
      <div className={SECTION}>
        <div className={COLUMN}>
          <h2 className={`${HEADING} text-center`}>Before you try it</h2>
          <dl className="mx-auto mt-10 grid max-w-[900px] gap-x-14 gap-y-7 sm:mt-14 md:grid-cols-2 md:gap-y-10">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-rounded text-[17px] leading-[1.4] font-bold text-linen-900 sm:text-lg dark:text-linen-100">
                  {q}
                </dt>
                <dd className={`${BODY} mt-1`}>{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Starts on the page colour exactly, so there's no seam in either theme. */}
      <div
        ref={ref}
        data-anim={anim}
        className="final-scene relative isolate flex min-h-svh flex-col overflow-hidden bg-linear-to-b from-linen-50 via-honey-50 to-sky-200/80 dark:from-linen-950 dark:via-sky-950 dark:to-honey-950/60"
      >
        <div className="flex flex-1 items-center px-4 pt-10 pb-10 sm:px-6 lg:pt-16">
          <div
            className={`${COLUMN} grid items-center gap-6 lg:max-w-[1100px] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12`}
          >
            <FinishedStage />
            <div className="text-center lg:order-first lg:text-left">
              <h2 className={`${DISPLAY} mx-auto max-w-[14ch] text-linen-900 lg:mx-0 dark:text-linen-50`}>
                Enough for today, and a plan for what’s next.
              </h2>
              <PressButton className="mt-8 lg:mt-10" onClick={onTrySample}>
                Try it with sample data
              </PressButton>
              <div className="mt-2 lg:-ml-4">
                <button type="button" onClick={onImport} className={`${LINK} text-base`}>
                  Or import your own CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="px-4 pb-5 sm:px-6">
          <div
            className={`${COLUMN} flex items-center justify-between gap-4 border-t border-sky-300/60 pt-3 text-sm lg:max-w-[1100px] dark:border-sky-800`}
          >
            <span className="flex items-center gap-2 font-rounded font-extrabold text-linen-900 dark:text-linen-100">
              <MannaLogo className="h-6 w-6" />
              Manna Money
            </span>
            {onSignIn && (
              <button type="button" onClick={onSignIn} className={`${LINK} -mr-4 text-sm`}>
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
 * Manna in stage pixels: a short stream from under the small logo down to the
 * ground at Omer's spot. One direction, each flake on its own slow clock.
 */
const FLAKES = [
  { x: 30, size: 10, dur: 6.5, delay: -1.1, tone: 'bg-honey-300' },
  { x: 58, size: 8, dur: 7.5, delay: -4.6, tone: 'bg-honey-200' },
  { x: 44, size: 11, dur: 7, delay: -2.9, tone: 'bg-honey-400' },
  { x: 72, size: 9, dur: 8, delay: -6.2, tone: 'bg-honey-300' },
]

/*
 * The rewards that burst out of the finished quiz, gathered within ~250px of
 * the phone. [left, top, size, depth, piece]: "back" pieces sit behind the
 * phone, smaller and softer; "front" pieces overlap it. Honey is only the
 * medal and one confetti strip, so it stays the scarce reward colour.
 */
type Piece =
  'medal' | 'check' | 'sparkle' | 'strip-forest' | 'strip-sky' | 'strip-cream' | 'strip-honey' | 'dot-sky'
const REWARDS: [number, number, number, 'back' | 'front', Piece][] = [
  [212, 0, 30, 'back', 'strip-forest'],
  [494, 140, 26, 'back', 'strip-sky'],
  [500, 430, 24, 'back', 'strip-honey'],
  [40, 318, 18, 'back', 'dot-sky'],
  [14, 116, 30, 'front', 'sparkle'],
  [22, 206, 54, 'front', 'check'],
  [438, 8, 70, 'front', 'medal'],
  [486, 318, 32, 'front', 'strip-cream'],
]
const PHONE_CENTER = { x: 364, y: 254 }

function RewardPiece({ piece, size }: { piece: Piece; size: number }) {
  switch (piece) {
    case 'medal':
      return (
        <span
          className="grid rotate-12 place-items-center rounded-full border-4 border-honey-200 bg-honey-400 text-honey-800 shadow-[0_4px_0_var(--color-honey-600)]"
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
          className="grid -rotate-6 place-items-center rounded-full bg-forest-500 text-white shadow-[0_4px_0_var(--color-forest-700)]"
          style={{ width: size, height: size }}
        >
          <CheckIcon className="h-1/2 w-1/2" />
        </span>
      )
    case 'sparkle':
      return (
        <svg viewBox="0 0 24 24" className="fill-sky-400" style={{ width: size, height: size }}>
          <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" />
        </svg>
      )
    case 'dot-sky':
      return <span className="block rounded-full bg-sky-300" style={{ width: size, height: size }} />
    default: {
      const tone = {
        'strip-forest': 'bg-forest-400 -rotate-[22deg]',
        'strip-sky': 'bg-sky-300 rotate-[28deg]',
        'strip-honey': 'bg-honey-300 rotate-[62deg]',
        'strip-cream': 'bg-cream ring-1 ring-linen-300 -rotate-[34deg] dark:ring-linen-500',
      }[piece]
      return <span className={`block rounded-[4px] ${tone}`} style={{ width: size * 0.45, height: size }} />
    }
  }
}

function Rewards({ depth }: { depth: 'back' | 'front' }) {
  return REWARDS.filter((r) => r[3] === depth).map(([left, top, size, , piece], i) => (
    <span
      key={piece}
      className={`final-burst absolute ${depth === 'back' ? 'opacity-80 blur-[0.5px]' : 'drop-shadow-md'}`}
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
 * screens (like the hero's) so it keeps its shape at every width. One
 * silhouette on one patch of ground: the finished-quiz phone in the middle,
 * rewards gathered around it, and the small logo up high letting manna fall
 * to Omer's spot at the phone's base.
 */
function FinishedStage() {
  return (
    <div
      role="img"
      aria-label="A phone showing a finished quiz, 4 of 5 right and plus 50 XP, with confetti and a gold medal around it and manna falling from the Manna Money logo."
      className="relative mx-auto h-[322px] w-[322px] sm:h-[390px] sm:w-[390px] xl:h-[520px] xl:w-[520px]"
    >
      <div className="absolute top-0 left-0 h-[520px] w-[520px] origin-top-left scale-[0.62] sm:scale-75 xl:scale-100">
        {/* Morning light behind the phone; fades out well inside the stage, so it never shows an edge. */}
        <div className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,var(--color-cream),transparent)] dark:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-sky-700)_45%,transparent),transparent)]" />
        <div className="absolute bottom-[2px] left-[40px] h-[28px] w-[460px] rounded-[50%] bg-forest-900/15 blur-md dark:bg-linen-950/80" />

        <Rewards depth="back" />

        <div className="absolute top-[128px] left-[112px] h-[372px] w-[100px] overflow-hidden">
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
         * Omer stands here, on the ground at the phone's base where the manna
         * lands, cheering the finished quiz (the "cheer" pose from
         * public/mascot/, see "Omer, the mascot" in docs/DESIGN.md). The
         * space is held in production; only dev builds outline it.
         */}
        <div
          data-slot="omer"
          aria-hidden
          className={`absolute bottom-[12px] left-[88px] h-[156px] w-[156px] ${
            import.meta.env.DEV
              ? 'rounded-2xl border-2 border-dashed border-forest-600/50 dark:border-forest-300/50'
              : ''
          }`}
        >
          {import.meta.env.DEV && (
            <span className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold tracking-wide text-forest-700 uppercase dark:text-forest-300">
              Omer
            </span>
          )}
        </div>

        <div className="absolute top-[40px] left-[118px] h-[84px] w-[84px] -rotate-6 drop-shadow-lg drop-shadow-forest-900/25">
          <MannaLogo className="h-full w-full" />
        </div>

        <Rewards depth="front" />
      </div>
    </div>
  )
}

const RING = 2 * Math.PI * 52

/** The quiz-finished screen from DESIGN.md's celebration table: the score counted up, the XP earned. */
function FinishedPhone() {
  return (
    <div
      aria-hidden
      className="absolute top-[14px] right-[36px] h-[480px] w-[240px] rounded-[40px] bg-linen-900 p-[9px] shadow-2xl shadow-linen-900/40 ring-1 ring-linen-700 dark:bg-linen-950 dark:ring-linen-600"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] bg-cream dark:bg-linen-900">
        <div className="flex h-9 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-linen-900 tabular-nums dark:text-linen-100">
          <span>9:41</span>
          <span className="absolute top-2 left-1/2 h-[22px] w-[72px] -translate-x-1/2 rounded-full bg-linen-900 dark:bg-linen-950" />
          <span className="h-2.5 w-5 rounded-[3px] border border-current p-px opacity-80">
            <span className="block h-full w-3/4 rounded-[1px] bg-current" />
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center px-5 pt-5 text-center">
          <div className="font-rounded text-[10px] font-bold tracking-wide text-linen-500 uppercase dark:text-linen-400">
            Quiz complete
          </div>

          <div className="relative mt-3 h-[124px] w-[124px]">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-rounded text-[40px] leading-none font-black text-forest-700 tabular-nums dark:text-forest-300">
                <span className="final-score" />
                <span className="text-[18px] text-linen-400">/5</span>
              </span>
              <span className="mt-1 text-[11px] font-semibold text-linen-500 dark:text-linen-400">right</span>
            </div>
          </div>

          <div className="mt-4 font-rounded text-[22px] font-black text-linen-900 dark:text-linen-100">
            Nice work!
          </div>
          <div className="mt-1 text-[12px] leading-snug text-linen-600 dark:text-linen-300">
            You found your top expense and your biggest bill.
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-honey-400 px-2.5 py-1 font-rounded text-[13px] font-black text-linen-900 shadow-[0_2px_0_var(--color-honey-600)]">
              +50 XP
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-rounded text-[12px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              3-day streak
            </span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex h-9 items-center justify-center rounded-lg bg-forest-600 font-rounded text-[12px] font-extrabold text-white shadow-[0_3px_0_var(--color-forest-800)]">
            Continue
          </div>
        </div>
      </div>
    </div>
  )
}
