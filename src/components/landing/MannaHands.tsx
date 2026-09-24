/**
 * Open hands receiving falling manna: a pair of cupped palms with a few
 * honey flakes drifting down into them, the image of daily provision. It
 * holds Omer's spot on the landing page (the base of the hero phone and the
 * closing scene) until his art arrives, so it's deliberately hands only: no
 * bowl, face or body that could compete with the mascot.
 *
 * Drawn once as the viewer's left hand and mirrored for the right. Fingers
 * are stroked curves (an outline stroke under a skin stroke), drawn over a
 * palm outline and under the palm fill, so the seams between fingers show
 * while their bases melt into the palm. The wrists fade out through a mask,
 * so the hands rise from the ground instead of ending at a hard edge.
 */
import { useId } from 'react'
import './hands.css'

const OUTLINE_FILL = 'fill-linen-700 stroke-linen-700 dark:fill-linen-800 dark:stroke-linen-800'
const OUTLINE = 'stroke-linen-700 dark:stroke-linen-800'
const SKIN_FILL = 'fill-linen-200 dark:fill-linen-300'
const SKIN = 'stroke-linen-200 dark:stroke-linen-300'
const SHADE_FILL = 'fill-linen-300 dark:fill-linen-400/70'
const SHADE = 'stroke-linen-300 dark:stroke-linen-400/70'

const PALM =
  'M100 88 L100 172 L76 172 C76 160 74 150 69 142 C60 132 54 120 53 106 C52 98 54 93 58 91 C72 87 88 86 100 88 Z'
const THUMB = 'M66 131 Q47 126 40 101'

/* Index to pinky. Each bows outward and turns in at the tip, which is what
   makes the hand read as cupped rather than held up flat. */
const FINGERS: { d: string; w: number }[] = [
  { d: 'M61 94 Q51 74 53 52', w: 12 },
  { d: 'M72 90 Q62 66 65 44', w: 12.5 },
  { d: 'M83 90 Q76 66 78 46', w: 12 },
  { d: 'M94 92 Q88 72 91 56', w: 10.5 },
]

const round = { strokeLinecap: 'round', fill: 'none' } as const

const hand = (
  <>
    <path d={PALM} className={OUTLINE_FILL} strokeWidth={5} strokeLinejoin="round" />
    <path d={THUMB} className={OUTLINE} strokeWidth={19} {...round} />
    <path d={THUMB} className={SKIN} strokeWidth={14} {...round} />
    {FINGERS.map(({ d, w }) => (
      <g key={d}>
        <path d={d} className={OUTLINE} strokeWidth={w + 5} {...round} />
        <path d={d} className={SKIN} strokeWidth={w} {...round} />
        {/* Cel shade on the side facing the hollow of the palms. */}
        <path d={d} transform="translate(3 0.8)" className={SHADE} strokeWidth={w - 8} {...round} />
      </g>
    ))}
    <path d={PALM} className={SKIN_FILL} />
    <path d="M100 95 C92 99 87 107 87 117 C87 127 92 133 100 137 Z" className={SHADE_FILL} />
    <path d="M49 108 Q53 120 66 125" className={OUTLINE} strokeWidth={2.5} {...round} />
  </>
)

/* Flakes as slightly squashed, turned ellipses so they read as grains of
   manna rather than coins. The three settled ones never move. */
type Flake = { cx: number; cy: number; rx: number; ry: number; rot: number; tone: string }
const SETTLED: Flake[] = [
  { cx: 91.5, cy: 124, rx: 4.8, ry: 3.8, rot: -18, tone: 'fill-honey-300' },
  { cx: 108.5, cy: 124.5, rx: 4.6, ry: 3.6, rot: 14, tone: 'fill-honey-300' },
  { cx: 100, cy: 126.5, rx: 5.2, ry: 4, rot: 0, tone: 'fill-honey-400' },
]
/* Drawn at their resting spots; hands.css drops them in from above. */
const FALLING: Flake[] = [
  { cx: 96, cy: 119, rx: 4.4, ry: 3.5, rot: 10, tone: 'fill-honey-200' },
  { cx: 104.5, cy: 119.5, rx: 4.6, ry: 3.6, rot: -12, tone: 'fill-honey-400' },
  { cx: 100.5, cy: 114, rx: 4.2, ry: 3.4, rot: 0, tone: 'fill-honey-300' },
  { cx: 88, cy: 119, rx: 3.8, ry: 3, rot: -24, tone: 'fill-honey-200' },
]

function FlakeShape({ cx, cy, rx, ry, rot, tone }: Flake) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} className={tone} />
}

export function MannaHands({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fade = `mh-fade-${id}`
  const mask = `mh-mask-${id}`
  return (
    <svg
      className={[animate && 'mh-animate', className].filter(Boolean).join(' ')}
      viewBox="0 -24 200 196"
      role="img"
      aria-label="Open hands receiving manna falling from above"
    >
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.82" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="-24" width="200" height="196">
          <rect y="-24" width="200" height="196" fill={`url(#${fade})`} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <g>{hand}</g>
        <g transform="matrix(-1 0 0 1 200 0)">{hand}</g>
        {/* The hollow where the palms meet, so the flakes sit in something. */}
        <ellipse cx="100" cy="126" rx="13" ry="5.5" className="fill-linen-400/60 dark:fill-linen-500/60" />
      </g>
      <g className="stroke-honey-500 dark:stroke-honey-600" strokeWidth={1}>
        {SETTLED.map((f) => (
          <FlakeShape key={`${f.cx}-${f.cy}`} {...f} />
        ))}
        {FALLING.map((f, i) => (
          // The wrapper takes the CSS transform so each flake keeps its own tilt.
          <g key={`${f.cx}-${f.cy}`} className={`mh-fall mh-fall-${i + 1}`}>
            <FlakeShape {...f} />
          </g>
        ))}
      </g>
    </svg>
  )
}
