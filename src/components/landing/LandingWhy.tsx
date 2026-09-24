/**
 * The landing page's "Why Manna" story and what grows out of it. The story
 * (manna came each morning, just enough for the day, and the app keeps that
 * rhythm) is the one place on the page for the storyteller voice, told so it
 * speaks to anyone rather than one tradition. The blocks after it carry that
 * posture into the app: room to give, and an account that keeps it all safe
 * on every device. "How it works" already covers the bank, categories, the
 * Year Sheet, the daily question and budgets, so none of that repeats here.
 * No buttons: the call to action lives only in the hero and the closing
 * section.
 */
import type { CSSProperties, ReactNode } from 'react'
import { BODY, COLUMN, HEADING, SECTION } from './styles'
import { useReplayInView } from './useReplayInView'
import './why.css'

export function LandingWhy() {
  return (
    // One SECTION's rhythm wraps the run, and the blocks sit a fixed gap apart,
    // so the blocks read as one steady sequence rather than separate full sections.
    <div id="landing-why" className={SECTION}>
      <div className={`${COLUMN} space-y-24 lg:space-y-32`}>
        <Feature id="why-manna" heading="Why “Manna”?" visual={<MannaBowlScene />} storyteller>
          Manna came each morning, just enough for the day. We keep that rhythm: small, daily, enough, so
          you can steward what you’ve been given without worry.
        </Feature>

        <Feature id="why-give" heading="Room to give" visual={<GivingSlice />} flip>
          Enough for today leaves room to share. See what you give as a share of your income, and set a goal
          if you’d like one: 10%, or whatever fits.
        </Feature>

        <Feature id="why-yours" heading="Safe, and yours" visual={<AccountScene />}>
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

/* ---------- Why Manna: the day's manna falling into a bowl, all day long ---------- */

// [x, y, radius, color, seconds per fall]: lighter high in the morning air
// and deeper gold as they near the bowl. Each keeps falling on its own slow
// clock, and (y) is where it sits when the picture is still.
const FALLING: [number, number, number, string, number][] = [
  [152, 86, 9, 'fill-honey-200', 5.2],
  [196, 118, 9, 'fill-honey-200', 6.1],
  [262, 156, 7, 'fill-honey-200', 4.6],
  [318, 176, 8, 'fill-honey-200', 5.7],
  [214, 212, 9, 'fill-honey-300', 4.9],
  [270, 222, 11, 'fill-honey-400', 5.5],
  [176, 40, 7, 'fill-honey-200', 5.8],
  [240, 70, 8, 'fill-honey-300', 5],
  [292, 104, 6, 'fill-honey-200', 6.4],
]
/** The stream's ends: just above the disc, and just inside the bowl (hidden by it). */
const FALL_FROM = -12
const FALL_TO = 300

// The day's portion already gathered, heaped just over the rim.
const HEAP: [number, number, number, string][] = [
  [168, 262, 11, 'fill-honey-300'],
  [196, 254, 15, 'fill-honey-300'],
  [226, 250, 19, 'fill-honey-200'],
  [256, 256, 13, 'fill-honey-300'],
  [140, 266, 8, 'fill-honey-200'],
]

function MannaBowlScene() {
  const [ref, motion] = useReplayInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-motion={motion}
      role="img"
      aria-label="Manna falling at first light into a golden bowl, just enough for the day"
      className={FRAME}
    >
      <svg viewBox="0 0 440 420" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="why-dawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="[stop-color:var(--color-cream)] dark:[stop-color:var(--color-sky-950)]" />
            <stop offset="0.55" className="[stop-color:var(--color-honey-100)] dark:[stop-color:var(--color-sky-900)]" />
            <stop offset="1" className="[stop-color:var(--color-sky-100)] dark:[stop-color:var(--color-honey-950)]" />
          </linearGradient>
          <clipPath id="why-disc">
            <circle cx="220" cy="210" r="206" />
          </clipPath>
        </defs>
        <circle cx="220" cy="210" r="206" fill="url(#why-dawn)" />

        <g clipPath="url(#why-disc)">
          {FALLING.map(([x, y, r, color, dur]) => (
            <circle
              key={`f${x}`}
              cx={x}
              cy={y}
              r={r}
              className={`why-fall ${color}`}
              style={
                {
                  '--why-from': `${FALL_FROM - y}px`,
                  '--why-to': `${FALL_TO - y}px`,
                  '--why-dur': `${dur}s`,
                  // Start each loop mid-fall, exactly where the still picture has it.
                  '--why-delay': `${(-dur * (y - FALL_FROM)) / (FALL_TO - FALL_FROM)}s`,
                } as CSSProperties
              }
            />
          ))}
        </g>

        <g className="why-heap">
          {HEAP.map(([x, y, r, color]) => (
            <circle key={`h${x}`} cx={x} cy={y} r={r} className={color} />
          ))}
        </g>

        {/* The bowl: rim, body with its shaded side, and foot. */}
        <ellipse cx="220" cy="272" rx="118" ry="13" className="fill-honey-300" />
        <path d="M102 272C102 340 150 372 220 372S338 340 338 272Z" className="fill-honey-400" />
        <path d="M296 272h42c0 62-40 96-106 100 44-14 64-52 64-100Z" className="fill-honey-500" />
        <rect x="178" y="372" width="84" height="16" rx="8" className="fill-honey-500" />
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
