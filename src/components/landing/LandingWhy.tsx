/**
 * The landing page's "Why Manna" story and what grows out of it. The story
 * (bread given each morning, a lesson in trust) is the one place on the page
 * for the storyteller voice; the sections after it carry that posture into
 * the app: a small word each morning, a calm month-by-month plan, room to
 * give, and a notebook that stays yours. "How it works" already covers
 * importing, the daily question, budgets and streaks, so none of that
 * repeats here. The pictures are wordless shapes: nothing to read, no
 * numbers that could pass for stats, no scripture (that lives in the app).
 * No buttons: the call to action lives only in the hero and the closing
 * section.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { BODY, COLUMN, HEADING, SECTION } from './styles'
import './why.css'

export function LandingWhy() {
  return (
    <div id="landing-why">
      <Feature id="why-manna" heading="Why “Manna”?" visual={<MannaGround />} storyteller>
        Manna was bread given each morning in the wilderness, a daily lesson in trust. So here: steward what
        today brings, and plan ahead without the worry.
      </Feature>

      <Feature id="why-morning" heading="A word each morning" visual={<MorningScene />} flip>
        Each day opens with a short verse on money, giving or stewardship, fresh at midnight. A small portion
        for the day, before you look at a single number.
      </Feature>

      <Feature id="why-year" heading="A steady year" visual={<YearScene />}>
        Every month sits side by side, and the months ahead are sketched from your own habits and budgets, so
        next month is a plan, not a guess.
      </Feature>

      <Feature id="why-give" heading="Room to give" visual={<GivingScene />} flip>
        Generosity has a place here. See what you give as a share of your income, and set a goal if you’d like
        one: 10%, or whatever fits.
      </Feature>

      <Feature id="why-yours" heading="Stays with you" visual={<PrivacyScene />}>
        No account needed. Your numbers stay on this device, and they only reach the cloud if you sign in to
        sync.
      </Feature>
    </div>
  )
}

function Feature({
  id,
  heading,
  visual,
  flip = false,
  storyteller = false,
  children,
}: {
  id: string
  heading: string
  visual: ReactNode
  /** Put the picture on the left at desktop widths, for the zig-zag. */
  flip?: boolean
  storyteller?: boolean
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={SECTION}>
      <div className={`${COLUMN} grid items-center gap-12 md:grid-cols-2 md:gap-16`}>
        <div className={`text-center md:text-left ${flip ? 'md:order-2' : ''}`}>
          <h2 id={id} className={HEADING}>
            {heading}
          </h2>
          <p
            className={`${BODY} mx-auto mt-5 max-w-[470px] text-pretty md:mx-0 ${
              storyteller ? 'font-display font-soft' : ''
            }`}
          >
            {children}
          </p>
        </div>
        <div className={`flex justify-center ${flip ? 'md:order-1' : ''}`}>{visual}</div>
      </div>
    </section>
  )
}

/** True once the element is mostly on screen, so a one-time animation plays where it's seen. */
function useSeenOnce<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, seen] as const
}

/* ---------- Why Manna: the morning's manna settling on the ground ---------- */

/** Height of the ground's top edge at x (a gentle hill across the 400-wide scene). */
function groundY(x: number) {
  const t = x / 400
  return 300 - 140 * t * (1 - t)
}

// [x, depth below the ground's edge, radius, color]. Scattered like dew:
// small, many, and spread out rather than heaped, since none of it is hoarded.
const GROUND_FLAKES: [number, number, number, string][] = [
  [92, 10, 7, 'fill-honey-300'],
  [130, 30, 9, 'fill-honey-400'],
  [168, 8, 6, 'fill-honey-200'],
  [205, 26, 10, 'fill-honey-300'],
  [242, 6, 7, 'fill-honey-400'],
  [280, 22, 8, 'fill-honey-200'],
  [316, 10, 6, 'fill-honey-300'],
  [110, 58, 8, 'fill-honey-200'],
  [186, 60, 7, 'fill-honey-400'],
  [262, 56, 9, 'fill-honey-300'],
  [150, 88, 6, 'fill-honey-300'],
  [226, 92, 8, 'fill-honey-200'],
]

function MannaGround() {
  const [ref, seen] = useSeenOnce<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-play={seen}
      role="img"
      aria-label="Small flakes of manna scattered on the ground in the morning"
      className="why-scene w-full max-w-[420px]"
    >
      <svg viewBox="0 0 400 400" className="w-full" aria-hidden>
        <defs>
          <clipPath id="why-ground-clip">
            <circle cx="200" cy="200" r="198" />
          </clipPath>
        </defs>
        <g clipPath="url(#why-ground-clip)">
          <rect width="400" height="400" className="fill-linen-100 dark:fill-linen-900" />
          <path d="M0 300Q200 230 400 300V400H0Z" className="fill-linen-200 dark:fill-linen-800" />
          {GROUND_FLAKES.map(([x, depth, r, color], i) => {
            const y = groundY(x) + depth
            return (
              <circle
                key={x}
                cx={x}
                cy={y}
                r={r}
                className={`why-flake ${color}`}
                style={{ '--why-drop': `${40 - y}px`, '--why-delay': `${i * 0.07}s` } as CSSProperties}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

/* ---------- A word each morning: the sun coming up over an open book ---------- */

function MorningScene() {
  return (
    <div
      role="img"
      aria-label="The morning sun rising behind an open book"
      className="w-full max-w-[360px] overflow-hidden rounded-[40px] bg-sky-100 dark:bg-sky-950/60"
    >
      <svg viewBox="0 0 400 480" className="w-full" aria-hidden>
        <circle cx="200" cy="262" r="118" className="fill-honey-100/70 dark:fill-honey-500/10" />
        <circle cx="200" cy="262" r="78" className="fill-honey-200 dark:fill-honey-300/80" />
        <path d="M0 272Q200 242 400 272V480H0Z" className="fill-linen-100 dark:fill-linen-900" />

        <g strokeWidth="3" strokeLinejoin="round">
          <path
            d="M200 338C170 324 110 322 60 332V430C110 420 170 422 200 436Z"
            className="fill-cream stroke-linen-300 dark:fill-linen-800 dark:stroke-linen-600"
          />
          <path
            d="M200 338C230 324 290 322 340 332V430C290 420 230 422 200 436Z"
            className="fill-cream stroke-linen-300 dark:fill-linen-800 dark:stroke-linen-600"
          />
        </g>
        {/* Lines of text, never words: the verse itself stays in the app. */}
        <g strokeWidth="7" strokeLinecap="round" className="stroke-linen-200 dark:stroke-linen-700">
          {[362, 384, 406].map((y, i) => (
            <g key={y}>
              <path d={`M86 ${y}H${[176, 168, 150][i]}`} />
              <path d={`M224 ${y}H${[314, 300, 306][i]}`} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

/* ---------- A steady year: months side by side, the rest sketched in ---------- */

// Each month's net, relative. Steady on purpose: the picture is a calm
// rhythm, not a pile growing, and never a "not quite" month without a next step.
const MONTHS = [0.62, 0.7, 0.58, 0.66, 0.72, 0.6, 0.68, 0.64, 0.7, 0.66, 0.66, 0.66]
/** October onward is sketched from habits and budgets. */
const FIRST_PROJECTED = 9

function YearScene() {
  return (
    <div
      role="img"
      aria-label="Twelve months side by side: nine filled in, the last three sketched ahead as a plan"
      className="w-full max-w-[440px]"
    >
      <div className="flex h-72 items-end gap-2 sm:h-96 sm:gap-3">
        {MONTHS.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-xl ${
              i >= FIRST_PROJECTED
                ? 'border-[3px] border-b-0 border-dashed border-forest-300 dark:border-forest-500/60'
                : 'bg-forest-500 dark:bg-forest-400'
            }`}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      <div className="h-[3px] rounded-full bg-linen-200 dark:bg-linen-800" />
    </div>
  )
}

/* ---------- Room to give: a portion passed from one heap to another ---------- */

const R = 20
// The larger heap is yours; one flake travels to the smaller heap beside it.
const OWN_HEAP: [number, number, string][] = [
  [50, 330, 'fill-honey-300'],
  [90, 330, 'fill-honey-400'],
  [130, 330, 'fill-honey-300'],
  [170, 330, 'fill-honey-400'],
  [70, 296, 'fill-honey-200'],
  [110, 296, 'fill-honey-300'],
  [150, 296, 'fill-honey-200'],
  [90, 262, 'fill-honey-300'],
  [130, 262, 'fill-honey-400'],
  [110, 228, 'fill-honey-200'],
]
const SHARED_HEAP: [number, number, string][] = [
  [290, 330, 'fill-honey-300'],
  [330, 330, 'fill-honey-400'],
  [310, 296, 'fill-honey-200'],
]

function GivingScene() {
  return (
    <div
      role="img"
      aria-label="A flake of manna passed from a larger heap to a smaller one beside it"
      className="w-full max-w-[440px]"
    >
      <svg viewBox="0 40 380 330" className="w-full" aria-hidden>
        <path d="M20 352H360" strokeWidth="3" strokeLinecap="round" className="stroke-linen-200 dark:stroke-linen-800" />
        <path
          d="M118 200C170 60 280 60 310 262"
          fill="none"
          strokeWidth="4"
          strokeDasharray="1 12"
          strokeLinecap="round"
          className="stroke-linen-300 dark:stroke-linen-600"
        />
        {[...OWN_HEAP, ...SHARED_HEAP].map(([x, y, color]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={R} className={color} />
        ))}
        {/* The flake on its way: outlined so it reads as moving, not resting. */}
        <circle
          cx="222"
          cy="103"
          r={R}
          strokeWidth="5"
          className="fill-honey-400 stroke-linen-50 dark:stroke-linen-950"
        />
      </svg>
    </div>
  )
}

/* ---------- Stays with you: this device, the cloud behind a switch that's off ---------- */

function PrivacyScene() {
  return (
    <div
      role="img"
      aria-label="Your numbers locked on this device, with the connection to the cloud switched off until you sign in"
      className="w-full max-w-[440px]"
    >
      <svg viewBox="0 0 440 370" className="w-full" aria-hidden>
        {/* The device: a screen holding the notebook, rows without words. */}
        <rect
          x="16"
          y="120"
          width="280"
          height="200"
          rx="26"
          strokeWidth="3"
          className="fill-cream stroke-linen-200 dark:fill-linen-900 dark:stroke-linen-700"
        />
        <rect x="126" y="330" width="60" height="10" rx="5" className="fill-linen-200 dark:fill-linen-700" />
        {[162, 202, 242, 282].map((y, i) => (
          <g key={y}>
            <rect
              x="48"
              y={y}
              width={[130, 100, 150, 112][i]}
              height="16"
              rx="8"
              className="fill-linen-100 dark:fill-linen-800"
            />
            <rect
              x={[212, 222, 206, 216][i]}
              y={y}
              width={[52, 42, 58, 48][i]}
              height="16"
              rx="8"
              className="fill-linen-200 dark:fill-linen-700"
            />
          </g>
        ))}

        {/* The seal: this notebook is locked to this device. */}
        <circle
          cx="286"
          cy="126"
          r="34"
          strokeWidth="3"
          className="fill-cream stroke-linen-200 dark:fill-linen-900 dark:stroke-linen-700"
        />
        <g
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-forest-600 dark:stroke-forest-300"
        >
          <rect x="271" y="124" width="30" height="22" rx="5" />
          <path d="M277 124v-6a9 9 0 0 1 18 0v6" />
        </g>

        {/* The road to the cloud is dashed and quiet, behind a switch that's off. */}
        <path
          d="M300 228C370 228 372 170 372 102"
          fill="none"
          strokeWidth="3"
          strokeDasharray="2 9"
          strokeLinecap="round"
          className="stroke-linen-300 dark:stroke-linen-600"
        />
        <rect
          x="336"
          y="178"
          width="52"
          height="28"
          rx="14"
          strokeWidth="3"
          className="fill-linen-50 stroke-linen-300 dark:fill-linen-950 dark:stroke-linen-600"
        />
        <circle cx="351" cy="192" r="8" className="fill-linen-300 dark:fill-linen-600" />
        <path
          d="M332 98h58a22 22 0 0 0 1-44 30 30 0 0 0-57-6 24 24 0 0 0-2 50Z"
          strokeWidth="3"
          strokeDasharray="7 7"
          strokeLinejoin="round"
          className="fill-sky-50/60 stroke-sky-400 dark:fill-sky-500/10 dark:stroke-sky-500/70"
        />
      </svg>
    </div>
  )
}
