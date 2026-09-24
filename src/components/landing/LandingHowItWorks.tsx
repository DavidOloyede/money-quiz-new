/**
 * The landing page's "How it works": a heading that names where the steps
 * lead, then the three things that actually happen when you use Manna Money
 * (bring your transactions, take a quick quiz on them, keep a budget while
 * your streak grows) as alternating rows. Each row's visual is a slice of the
 * real app drawn in HTML; they're illustrations, so screen readers get a
 * one-line description instead.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckIcon, ShieldIcon } from '../icons'
import { BODY, COLUMN, DISPLAY, HEADING, SECTION } from './styles'
import './how.css'

export function LandingHowItWorks() {
  return (
    <section id="landing-how" aria-labelledby="landing-how-title" className={SECTION}>
      <div className={COLUMN}>
        <div className="mx-auto max-w-[620px] text-center">
          <h2 id="landing-how-title" className={`${DISPLAY} text-linen-900 dark:text-linen-50`}>
            From bank file to budget
          </h2>
          <p className={`${BODY} mt-4`}>
            Bring in your transactions, learn them with a quick quiz, then keep a simple budget.
            About two minutes a day.
          </p>
        </div>

        <ol className="mt-16 space-y-20 md:mt-28 md:space-y-56">
          <Step
            title="Bring your year"
            body="Drop in a bank CSV. It's read in your browser and your data stays on your device. No file? Try the sample year."
            label="A bank file added on the import screen, its transactions sorted into categories."
            visual={<ImportMock />}
          />
          <Step
            flip
            title="Take a quick quiz"
            body="About two minutes of questions on your own spending, like where last month went. Every answer shows the receipts."
            label="A quiz question about last month's top category, answered correctly for 10 XP."
            visual={<QuizMock />}
          />
          <Step
            title="Budgets that cheer you on"
            body="Set a simple monthly budget and see what's left at a glance, while every day you check in grows your streak."
            label="September budgets for groceries and dining with money left, and a 12-day streak."
            visual={<BudgetMock />}
          />
        </ol>
      </div>
    </section>
  )
}

function Step(props: { title: string; body: string; label: string; visual: ReactNode; flip?: boolean }) {
  return (
    <li className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
      <div className="text-center md:text-left">
        <h3 className={HEADING}>{props.title}</h3>
        <p className={`${BODY} mx-auto mt-4 max-w-[470px] md:mx-0`}>{props.body}</p>
      </div>
      <div
        role="img"
        aria-label={props.label}
        className={`flex justify-center ${props.flip ? 'md:order-first md:justify-start' : 'md:justify-end'}`}
      >
        <div aria-hidden className="w-full max-w-[420px]">
          {props.visual}
        </div>
      </div>
    </li>
  )
}

const CARD =
  'rounded-2xl border border-linen-200 bg-cream p-5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)] sm:p-6 dark:border-linen-600 dark:bg-linen-900 dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]'

/* ---------- Step 1: a bank file, sorted on the device ---------- */

function ImportMock() {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 text-[15px] font-medium text-forest-700 dark:text-forest-300">
        <ShieldIcon className="h-5 w-5 shrink-0" />
        Your data stays on your device
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-forest-300 bg-forest-50/60 px-3.5 py-3 dark:border-forest-500/40 dark:bg-forest-500/10">
        <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0">
          <path className="fill-forest-100 dark:fill-forest-500/25" d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
          <path className="fill-forest-300 dark:fill-forest-500/60" d="M14 2l5 5h-3.5A1.5 1.5 0 0 1 14 5.5z" />
          <rect x="6.5" y="13" width="11" height="5" rx="1" className="fill-forest-600" />
        </svg>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[16px] font-semibold text-linen-800 dark:text-linen-100">checking.csv</div>
          <div className="text-[15px] text-linen-600 tabular-nums dark:text-linen-300">212 transactions</div>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
          <CheckIcon className="h-4 w-4" />
        </span>
      </div>
      <ul className="mt-2 divide-y divide-linen-100 text-[16px] dark:divide-linen-700">
        <Row name="Corner Market" cat="Groceries" amt="−$64.18" />
        <Row name="Blue Door Café" cat="Dining" amt="−$12.40" />
      </ul>
    </div>
  )
}

function Row(props: { name: string; cat: string; amt: string }) {
  return (
    <li className="flex items-center gap-3 py-3 last:pb-0">
      <div className="min-w-0 flex-1 leading-snug">
        <div className="truncate text-linen-800 dark:text-linen-100">{props.name}</div>
        <div className="text-[15px] text-linen-600 dark:text-linen-300">{props.cat}</div>
      </div>
      <span className="shrink-0 font-sans font-medium text-linen-800 tabular-nums dark:text-linen-100">
        {props.amt}
      </span>
    </li>
  )
}

/* ---------- Step 2: one quiz question, answered right ---------- */

/** Sets data-play the first time the element is mostly on screen. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, seen] as const
}

function QuizMock() {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} data-play={seen || undefined} className={`${CARD} relative`}>
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-linen-100 dark:bg-linen-700">
          <div className="h-full w-[30%] rounded-full bg-forest-500" />
        </div>
        <span className="how-hop rounded-full border border-honey-300 bg-honey-100 px-2.5 py-0.5 font-rounded text-[15px] font-extrabold text-honey-800 tabular-nums dark:border-honey-500/40 dark:bg-honey-500/15 dark:text-honey-200">
          +10 XP
        </span>
      </div>
      <p className="mt-4 font-rounded text-[18px] leading-snug font-bold text-linen-900 dark:text-linen-50">
        Which category did you spend the most on last month?
      </p>
      <div className="mt-4 space-y-2.5 font-rounded text-[16px] font-semibold">
        <div className="how-cheer flex items-center justify-between rounded-xl border-2 border-forest-500 bg-forest-50 px-4 py-2.5 text-forest-800 dark:bg-forest-500/15 dark:text-forest-200">
          Dining
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-600 text-white">
            <CheckIcon className="h-4 w-4" />
          </span>
        </div>
        <div className="rounded-xl border border-linen-200 px-4 py-2.5 text-linen-600 dark:border-linen-600 dark:text-linen-300">
          Groceries
        </div>
      </div>
      <p className="mt-4 text-[15px] text-linen-700 dark:text-linen-200">
        <span className="font-semibold text-forest-700 dark:text-forest-300">Nice!</span> Dining led, at{' '}
        <span className="font-sans font-semibold tabular-nums">$612.40</span> across 18 visits.
      </p>
    </div>
  )
}

/* ---------- Step 3: budgets with room to spare, and the streak ---------- */

const BUDGETS = [
  { cat: 'Groceries', spent: '$412', budget: '$550', left: '$138', pct: 75 },
  { cat: 'Dining', spent: '$168', budget: '$250', left: '$82', pct: 67 },
]

function BudgetMock() {
  return (
    <div className={`${CARD} relative`}>
      <span className="absolute -top-4 right-5 flex items-center gap-1 rounded-full border border-honey-300 bg-honey-50 py-1 pr-3 pl-2 font-rounded text-[15px] font-extrabold text-honey-800 shadow-sm tabular-nums dark:border-honey-500/40 dark:bg-honey-950 dark:text-honey-200">
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            className="fill-honey-500"
            d="M12 1.8c1.1 4.3 6.6 6.6 6.6 12.6a6.6 6.6 0 0 1-13.2 0c0-3.3 1.7-5.2 3.3-6.5 0 1.8.5 3 1.5 3.9C10.2 8.3 10.8 4.8 12 1.8z"
          />
          <path className="fill-honey-300" d="M12 11.4c.8 1.8 3.2 2.8 3.2 5.2a3.2 3.2 0 0 1-6.4 0c0-1.8 1.4-2.8 3.2-5.2z" />
        </svg>
        12-day streak
      </span>
      <div className="flex items-baseline gap-3">
        <span className="font-rounded text-[18px] font-bold text-linen-900 dark:text-linen-50">Budgets</span>
        <span className="text-[15px] text-linen-600 dark:text-linen-300">September</span>
      </div>
      <ul className="mt-4 space-y-5">
        {BUDGETS.map((b) => (
          <li key={b.cat}>
            <div className="flex items-center justify-between gap-3 text-[16px]">
              <span className="text-linen-800 dark:text-linen-100">{b.cat}</span>
              <span className="font-sans text-linen-600 tabular-nums dark:text-linen-300">
                {b.spent} / {b.budget}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-linen-100 dark:bg-linen-700">
              <div className="h-full rounded-full bg-honey-400" style={{ width: `${b.pct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-medium text-forest-700 dark:text-forest-300">
              <CheckIcon className="h-4 w-4" />
              <span>
                <span className="font-sans tabular-nums">{b.left}</span> left this month
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
