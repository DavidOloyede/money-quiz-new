/**
 * The landing page's "Why Manna" story and what grows out of it. The story
 * (bread given each morning, a daily lesson in trust, for any faith or none)
 * is the one place on the page for the storyteller voice; the blocks after it
 * carry that daily posture into the app: a moment of perspective each
 * morning, room to give, and an account that keeps it all safe on every
 * device. "How it works" already covers importing, the daily question,
 * budgets and streaks, so none of that repeats here. The pictures are
 * wordless shapes with no numbers and no scripture. No buttons: the call to
 * action lives only in the hero and the closing section.
 */
import type { CSSProperties, ReactNode } from 'react'
import { BODY, COLUMN, HEADING, SECTION } from './styles'
import { useReplayInView } from './useReplayInView'
import './why.css'

export function LandingWhy() {
  return (
    // One SECTION's rhythm wraps the run, and the blocks sit a fixed gap apart,
    // so four blocks read as one steady sequence rather than four full sections.
    <div id="landing-why" className={SECTION}>
      <div className={`${COLUMN} space-y-24 lg:space-y-32`}>
        <Feature id="why-manna" heading="Why “Manna”?" visual={<MannaMorning />} storyteller>
          Manna was bread given each morning in the wilderness, a daily lesson in trust. For any faith or
          none: tend today well, and plan without worry.
        </Feature>

        <Feature id="why-morning" heading="A pause each morning" visual={<MorningWindow />} flip>
          Each day opens with a moment of perspective, a short verse on money or generosity, before any
          numbers. Linger over it, or skip straight past.
        </Feature>

        <Feature id="why-give" heading="Room to give" visual={<GivingSlice />}>
          Enough for today leaves room to share. See what you give as a share of your income, and set a goal
          if you’d like one: 10%, or whatever fits.
        </Feature>

        <Feature id="why-yours" heading="Safe, and yours" visual={<AccountScene />} flip>
          Sign in and your numbers follow you to every device. Connect a bank through Plaid or upload a CSV.
          No one else, admins included, can pull up your finances.
        </Feature>
      </div>
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
    <section aria-labelledby={id} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
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
    </section>
  )
}

/** Every picture shares one footprint, so the run keeps an even height. */
const FRAME = 'why-scene aspect-[440/420] w-full max-w-[440px]'

/* ---------- Why Manna: manna settling on the ground at first light ---------- */

// [x, y, radius, color]. Resting on the ground, spread out like dew rather
// than heaped: nothing here is gathered into a container.
const RESTING: [number, number, number, string][] = [
  [58, 346, 8, 'fill-honey-300'],
  [104, 322, 10, 'fill-honey-400'],
  [150, 356, 7, 'fill-honey-300'],
  [196, 316, 9, 'fill-honey-300'],
  [238, 350, 11, 'fill-honey-400'],
  [284, 318, 8, 'fill-honey-300'],
  [326, 360, 9, 'fill-honey-400'],
  [372, 330, 10, 'fill-honey-300'],
  [124, 392, 9, 'fill-honey-300'],
  [270, 394, 8, 'fill-honey-400'],
  [400, 386, 7, 'fill-honey-300'],
]
// Still on the way down, in the morning air.
const FALLING: [number, number, number][] = [
  [90, 150, 6],
  [168, 220, 7],
  [226, 120, 5],
  [300, 196, 7],
  [356, 132, 6],
  [138, 270, 5],
  [330, 262, 6],
]

function MannaMorning() {
  const [ref, motion] = useReplayInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-motion={motion}
      role="img"
      aria-label="Flakes of manna falling at first light and settling on the ground"
      className={`${FRAME} overflow-hidden rounded-[40px] bg-sky-700 dark:bg-sky-900`}
    >
      <svg viewBox="0 0 440 420" className="h-full w-full" aria-hidden>
        <circle cx="220" cy="-30" r="190" className="fill-sky-600/70 dark:fill-sky-800/80" />
        <path d="M0 300Q220 252 440 300V420H0Z" className="fill-linen-100 dark:fill-linen-800" />
        {FALLING.map(([x, y, r], i) => (
          <circle
            key={`f${x}`}
            cx={x}
            cy={y}
            r={r}
            className="why-flake fill-honey-200"
            style={{ '--why-delay': `${i * 0.06}s` } as CSSProperties}
          />
        ))}
        {RESTING.map(([x, y, r, color], i) => (
          <circle
            key={`r${x}`}
            cx={x}
            cy={y}
            r={r}
            className={`why-flake ${color}`}
            style={{ '--why-delay': `${0.2 + i * 0.05}s` } as CSSProperties}
          />
        ))}
      </svg>
    </div>
  )
}

/* ---------- A pause each morning: the sun coming up in an arched window ---------- */

function MorningWindow() {
  const [ref, motion] = useReplayInView<HTMLDivElement>()
  const page = 'fill-cream stroke-linen-400 dark:fill-linen-700 dark:stroke-linen-500'
  return (
    <div
      ref={ref}
      data-motion={motion}
      role="img"
      aria-label="The sun rising in an arched window over an open book"
      className={`${FRAME} overflow-hidden rounded-t-[50%] rounded-b-[40px] bg-sky-200 dark:bg-sky-900`}
    >
      <svg viewBox="0 0 440 420" className="h-full w-full" aria-hidden>
        <g className="why-sun">
          <circle cx="220" cy="262" r="128" className="fill-cream/45 dark:fill-linen-100/10" />
          <circle cx="220" cy="262" r="84" className="fill-cream dark:fill-linen-100" />
        </g>
        <path d="M0 276Q110 236 230 266T440 252V420H0Z" className="fill-linen-300 dark:fill-linen-700" />
        <path d="M0 318Q220 282 440 318V420H0Z" className="fill-linen-100 dark:fill-linen-800" />

        <g strokeWidth="3" strokeLinejoin="round">
          <path d="M220 330C188 316 124 314 72 324V404C124 396 188 398 220 410Z" className={page} />
          <path d="M220 330C252 316 316 314 368 324V404C316 396 252 398 220 410Z" className={page} />
        </g>
        {/* Lines of text, never words: the verse itself stays in the app. */}
        <g strokeWidth="6" strokeLinecap="round" className="stroke-linen-300 dark:stroke-linen-500">
          {[352, 372, 390].map((y, i) => (
            <g key={y}>
              <path d={`M96 ${y}H${[196, 186, 168][i]}`} />
              <path d={`M244 ${y}H${[344, 330, 336][i]}`} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

/* ---------- Room to give: a slice of your income set out to share ---------- */

const CX = 206
const CY = 214
const RADIUS = 172
/** Where the pie's edge is at a given angle (degrees, counter-clockwise from 3 o'clock). */
function edge(deg: number, dx = 0, dy = 0) {
  const a = (deg * Math.PI) / 180
  return `${(CX + dx + RADIUS * Math.cos(a)).toFixed(1)} ${(CY + dy - RADIUS * Math.sin(a)).toFixed(1)}`
}
// The given share: a tenth of the circle, pulled out along its middle.
const SLICE_FROM = 18
const SLICE_TO = 54
const PULL = 30
const PULL_X = PULL * Math.cos((36 * Math.PI) / 180)
const PULL_Y = -PULL * Math.sin((36 * Math.PI) / 180)

function GivingSlice() {
  const [ref, motion] = useReplayInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-motion={motion}
      role="img"
      aria-label="A circle of income with one slice pulled out to give"
      className={FRAME}
    >
      <svg viewBox="0 0 440 420" className="h-full w-full" aria-hidden>
        {/* Forest is income: the whole circle is what came in. */}
        <path
          d={`M${CX} ${CY}L${edge(SLICE_TO)}A${RADIUS} ${RADIUS} 0 1 0 ${edge(SLICE_FROM)}Z`}
          className="fill-forest-600 dark:fill-forest-500"
        />
        <path
          d={`M${CX + PULL_X} ${CY + PULL_Y}L${edge(SLICE_FROM, PULL_X, PULL_Y)}A${RADIUS} ${RADIUS} 0 0 0 ${edge(
            SLICE_TO,
            PULL_X,
            PULL_Y,
          )}Z`}
          strokeWidth="6"
          strokeLinejoin="round"
          className="why-slice fill-forest-200 stroke-linen-50 dark:fill-forest-300 dark:stroke-linen-950"
          style={{ '--why-dx': `${-PULL_X}px`, '--why-dy': `${-PULL_Y}px` } as CSSProperties}
        />
      </svg>
    </div>
  )
}

/* ---------- Safe, and yours: one locked account, the same numbers on each device ---------- */

/** Rows without words, the same notebook on every screen. */
function Rows({ x, end, ys, widths }: { x: number; end: number; ys: number[]; widths: [number, number][] }) {
  return (
    <>
      {ys.map((y, i) => (
        <g key={y}>
          <rect
            x={x}
            y={y}
            width={widths[i][0]}
            height="16"
            rx="8"
            className="fill-linen-200 dark:fill-linen-700"
          />
          <rect
            x={end - widths[i][1]}
            y={y}
            width={widths[i][1]}
            height="16"
            rx="8"
            className="fill-linen-300 dark:fill-linen-600"
          />
        </g>
      ))}
    </>
  )
}

// Each sync pulse rests at its device; armed, it sits back at the account.
const PULSES: [number, number, number, number][] = [
  [135, 214, 85, -48],
  [364, 198, -144, -32],
]

function AccountScene() {
  const [ref, motion] = useReplayInView<HTMLDivElement>()
  const device = 'fill-cream stroke-linen-400 dark:fill-linen-900 dark:stroke-linen-600'
  return (
    <div
      ref={ref}
      data-motion={motion}
      role="img"
      aria-label="One locked account keeping the same numbers in step on a laptop and a phone"
      className={FRAME}
    >
      <svg viewBox="0 0 440 420" className="h-full w-full" aria-hidden>
        <g fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-sky-500 dark:stroke-sky-400">
          <path d="M204 166C180 190 150 196 135 214" />
          <path d="M236 166C290 184 350 180 364 198" />
        </g>

        {/* Your account: a solid sky shield, the app's "synced" color. */}
        <path
          d="M220 16L282 38V92C282 132 255 158 220 170C185 158 158 132 158 92V38Z"
          className="fill-sky-600 dark:fill-sky-500"
        />
        <g
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-cream dark:stroke-linen-950"
        >
          <rect x="202" y="86" width="36" height="28" rx="6" />
          <path d="M209 86v-8a11 11 0 0 1 22 0v8" />
        </g>

        <rect x="10" y="216" width="250" height="160" rx="22" strokeWidth="4" className={device} />
        <rect x="0" y="382" width="270" height="14" rx="7" className="fill-linen-400 dark:fill-linen-600" />
        <Rows
          x={40}
          end={230}
          ys={[250, 286, 322]}
          widths={[
            [120, 44],
            [90, 34],
            [136, 50],
          ]}
        />

        <rect x="300" y="200" width="128" height="210" rx="26" strokeWidth="4" className={device} />
        <rect x="344" y="214" width="40" height="7" rx="3.5" className="fill-linen-300 dark:fill-linen-600" />
        <Rows
          x={320}
          end={408}
          ys={[244, 280, 316, 352]}
          widths={[
            [56, 22],
            [42, 16],
            [62, 26],
            [48, 20],
          ]}
        />

        {PULSES.map(([x, y, dx, dy], i) => (
          <circle
            key={x}
            cx={x}
            cy={y}
            r="8"
            className="why-pulse fill-sky-600 dark:fill-sky-400"
            style={
              { '--why-dx': `${dx}px`, '--why-dy': `${dy}px`, '--why-delay': `${i * 0.12}s` } as CSSProperties
            }
          />
        ))}
      </svg>
    </div>
  )
}
