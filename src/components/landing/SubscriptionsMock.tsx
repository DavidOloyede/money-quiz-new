/**
 * The "Every subscription. Every habit." illustration: the app's recurring
 * card in the middle, with the things people pay for again and again
 * gathered in a ring around it: subscriptions, but also bills (the phone, the gym) and habits
 * (the weekly Chick-fil-A, rides, delivery). On the way in the logos drift from
 * farther out and settle into place, then the upcoming charges slide in;
 * after that the ring turns very slowly, always the same way. Pointing at a
 * logo lifts it while the ring keeps turning. Motion lives in subs.css, keyed off
 * the row's data-motion phase like the rest of "How it works".
 *
 * The ring is sized in container units (cqw), so the whole scene scales as
 * one picture from a phone to the desktop column.
 */
import type { CSSProperties, ReactNode } from 'react'
import { BRAND_ICONS, type BrandSlug } from '@moneyquiz/core/data/brandIcons'
import './subs.css'

/**
 * Brands whose logo artwork we don't carry (their owners had it pulled from
 * Simple Icons), drawn as their name on their brand colour rather than a
 * copy of the mark. The colours are brand data, like data/brandIcons.
 */
const WORDMARKS = {
  walmart: { label: 'Walmart+', bg: '#0071DC' },
} as const

type Mark = { brand: BrandSlug } | { word: keyof typeof WORDMARKS } | { gym: true }

/** One row of the card: a logo (or the generic power bolt), name, detail, amount. */
type Charge = { brand?: BrandSlug; name: string; detail: string; amount: string }

/**
 * The ring, clockwise from just right of the top. Neighbours come from
 * different parts of life (streaming, fast food, rides, the phone bill, AI,
 * the gym) so no one kind of spending clumps together. `size` is in % of the
 * scene's width.
 */
const RING: { mark: Mark; size: number }[] = [
  { mark: { brand: 'netflix' }, size: 13 },
  { mark: { brand: 'uber' }, size: 11 },
  { mark: { word: 'walmart' }, size: 13.5 },
  { mark: { brand: 'spotify' }, size: 11.5 },
  { mark: { brand: 'doordash' }, size: 12.5 },
  { mark: { gym: true }, size: 11 },
  { mark: { brand: 'hbo' }, size: 13 },
  { mark: { brand: 'att' }, size: 11.5 },
  { mark: { brand: 'claude' }, size: 12.5 },
  { mark: { brand: 'chickfila' }, size: 11 },
  { mark: { brand: 'hulu' }, size: 12.5 },
  { mark: { brand: 'youtube' }, size: 11.5 },
]

/** One of each kind the app finds: a fixed subscription, a bill that varies, a habit. */
const UPCOMING: Charge[] = [
  { brand: 'hulu', name: 'Hulu', detail: 'Sep 27', amount: '$11.99' },
  { name: 'Electric bill', detail: 'Oct 2', amount: '~$118' },
  { brand: 'chickfila', name: 'Chick-fil-A', detail: 'weekly', amount: '~$26' },
]

export function SubscriptionsMock() {
  return (
    <div className="subs-scene relative mx-auto aspect-square w-full max-w-[480px]">
      <div className="subs-ring absolute inset-0">
        {RING.map((item, i) => (
          <span
            key={i}
            className="subs-spot absolute top-1/2 left-1/2"
            style={
              {
                '--a': `${-75 + i * 30}deg`,
                // Alternate two radii so the ring reads as scattered, not drawn with a compass.
                '--r': i % 2 ? '45cqw' : '41.5cqw',
                '--s': `${item.size}cqw`,
                '--d': `${i * 55}ms`,
              } as CSSProperties
            }
          >
            <span className="subs-upright block">
              <Bubble mark={item.mark} />
            </span>
          </span>
        ))}
      </div>

      <SubscriptionsCard />
    </div>
  )
}

function Bubble({ mark }: { mark: Mark }) {
  const base =
    'subs-bubble flex items-center justify-center rounded-full shadow-[0_10px_22px_-10px_rgb(0_0_0/0.35)] dark:shadow-[0_10px_22px_-10px_rgb(0_0_0/0.9)]'
  let inner: ReactNode
  let style: CSSProperties | undefined
  let fill = 'bg-white'
  if ('brand' in mark) {
    const icon = BRAND_ICONS[mark.brand]
    inner = (
      <svg viewBox="0 0 24 24" className="h-[54%] w-[54%]">
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    )
  } else if ('word' in mark) {
    const w = WORDMARKS[mark.word]
    fill = ''
    style = { backgroundColor: w.bg }
    inner = (
      <span className="subs-word font-rounded leading-none font-extrabold tracking-tight text-white">
        {w.label}
      </span>
    )
  } else {
    inner = <Dumbbell />
  }
  return (
    <span className={`${base} ${fill}`} style={style}>
      {inner}
    </span>
  )
}

/** A generic power bill: every town has its own utility, so no one logo. */
function Bolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-[68%] w-[68%]">
      <path className="fill-honey-500" d="M13.5 2 5 13.5h6L10 22l9-12h-6.2L13.5 2z" />
    </svg>
  )
}

/** A generic gym: memberships come from every chain, so no one logo. */
function Dumbbell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[52%] w-[52%] text-forest-700"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </svg>
  )
}

/**
 * Mirrors the app's Recurring & subscriptions card, trimmed to its summary.
 * Sized in cqw like the ring, so it always fits inside it: the card's corners
 * stay clear of the logos however far the ring has turned.
 */
function SubscriptionsCard() {
  return (
    <div className="absolute top-1/2 left-1/2 w-[50cqw] -translate-x-1/2 -translate-y-1/2 rounded-[3.5cqw] border border-linen-200 bg-cream p-[3.8cqw] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)] dark:border-linen-600 dark:bg-linen-900 dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-rounded text-[3.5cqw] font-bold text-linen-900 dark:text-linen-50">Recurring</span>
        <span className="text-[2.5cqw] text-linen-500 dark:text-linen-400">15 found</span>
      </div>
      <div className="font-sans leading-tight tabular-nums">
        <span className="text-[6.6cqw] font-semibold tracking-tight text-linen-900 dark:text-linen-50">$486.20</span>
        <span className="ml-[1cqw] text-[2.7cqw] text-linen-500 dark:text-linen-400">/ mo</span>
      </div>

      <div className="mt-[2.2cqw] border-t border-linen-100 pt-[2cqw] text-[2.2cqw] font-semibold tracking-wide text-linen-500 uppercase dark:border-linen-700 dark:text-linen-400">
        Coming up
      </div>
      <ul className="mt-[1.4cqw] space-y-[1.6cqw]">
        {UPCOMING.map((u, i) => {
          const icon = u.brand && BRAND_ICONS[u.brand]
          return (
            <li
              key={u.name}
              className="subs-row flex items-center gap-[1.8cqw] text-[2.8cqw]"
              style={{ '--d': `${750 + i * 90}ms` } as CSSProperties}
            >
              <span className="flex h-[5cqw] w-[5cqw] shrink-0 items-center justify-center rounded-[1.2cqw] bg-white ring-1 ring-linen-200 dark:ring-0">
                {icon ? (
                  <svg viewBox="0 0 24 24" className="h-[64%] w-[64%]">
                    <path d={icon.path} fill={`#${icon.hex}`} />
                  </svg>
                ) : (
                  <Bolt />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-linen-800 dark:text-linen-100">{u.name}</span>
                <span className="ml-[1.2cqw] text-[2.4cqw] text-linen-500 dark:text-linen-400">{u.detail}</span>
              </span>
              <span className="font-semibold text-linen-800 tabular-nums dark:text-linen-100">{u.amount}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
