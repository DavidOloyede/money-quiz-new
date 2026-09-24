/**
 * The landing page's "How it works": a centered heading that names where the
 * steps lead, the three small steps that get you set up (connect your bank,
 * see your categories, plan your whole year; see HowSteps), then alternating
 * rows: the question of the day, whose streak grows each day you answer;
 * every subscription and habit (the charges that keep coming back), their
 * logos gathered around what they cost a month; and calm budgets that stay
 * green while you're under. The streak
 * belongs to the daily question, never to budgets. Each
 * row's visual is one focal slice of the real app drawn in HTML; they're
 * illustrations, so screen readers get a one-line description.
 */
import type { ReactNode } from 'react'
import { CheckIcon } from '../icons'
import { HowSteps } from './HowSteps'
import { SubscriptionsMock } from './SubscriptionsMock'
import { BODY, COLUMN, HEADING, SECTION } from './styles'
import { useReplayInView } from './useReplayInView'
import './how.css'

export function LandingHowItWorks() {
  return (
    <section id="landing-how" aria-labelledby="landing-how-title" className={`${SECTION} max-lg:pb-24`}>
      <div className={COLUMN}>
        <div className="mx-auto max-w-[620px] text-center">
          <h2 id="landing-how-title" className={HEADING}>
            From bank to budget
          </h2>
          <p className={`${BODY} mt-4 text-pretty`}>
            Connect your bank and see your whole year at a glance. Then one quick question a day and a
            simple budget keep you close to it. About two minutes a day.
          </p>
        </div>

        <div className="mt-16 md:mt-20">
          <HowSteps />
        </div>

        <ol className="mt-24 space-y-20 md:mt-40 md:space-y-40">
          <Step
            flip
            title="One question a day"
            body="Each day brings one quick question built from your own spending, and every answer shows the transactions behind it. Answer each day and your streak grows."
            label="The question of the day, answered correctly for 15 XP, extending a 12-day streak."
            visual={<QuestionMock />}
          />
          <Step
            title="Every subscription. Every habit."
            body="We track the obvious recurring charges and the sneaky ones — your bills, your favorite food spots, anything that keeps coming back — so you see what’s due next and what it’s really costing you."
            label="A ring of logos for things paid again and again, Netflix, Hulu, Chick-fil-A, AT&T, Walmart+, DoorDash and more, around a recurring card totaling $486.20 a month: Hulu due Sep 27, an electric bill around $118, and Chick-fil-A weekly, about $26 a month."
            visual={<SubscriptionsMock />}
          />
          <Step
            flip
            title="Simple, steady budgets"
            body="Set a monthly budget for what matters and see where you stand at a glance. The bar stays green while you’re under."
            label="September budgets: groceries, dining and gas, each under budget."
            visual={<BudgetMock />}
          />
        </ol>
      </div>
    </section>
  )
}

function Step(props: { title: string; body: string; label: string; visual: ReactNode; flip?: boolean }) {
  const [ref, phase] = useReplayInView<HTMLLIElement>()
  return (
    <li ref={ref} data-motion={phase} className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
      <div className="text-center md:text-left">
        <h3 className={HEADING}>{props.title}</h3>
        <p className={`${BODY} mx-auto mt-4 max-w-[470px] text-pretty md:mx-0`}>{props.body}</p>
      </div>
      <div
        role="img"
        aria-label={props.label}
        className={`flex justify-center ${props.flip ? 'md:order-first md:justify-start' : 'md:justify-end'}`}
      >
        <div aria-hidden className="w-full max-w-[480px]">
          {props.visual}
        </div>
      </div>
    </li>
  )
}

const CARD =
  'rounded-2xl border border-linen-200 bg-cream shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)] dark:border-linen-600 dark:bg-linen-900 dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]'

/* ---------- The question of the day, answered right, and its streak ---------- */

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Flame({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        className="fill-honey-500"
        d="M12 1.8c1.1 4.3 6.6 6.6 6.6 12.6a6.6 6.6 0 0 1-13.2 0c0-3.3 1.7-5.2 3.3-6.5 0 1.8.5 3 1.5 3.9C10.2 8.3 10.8 4.8 12 1.8z"
      />
      <path className="fill-honey-300" d="M12 11.4c.8 1.8 3.2 2.8 3.2 5.2a3.2 3.2 0 0 1-6.4 0c0-1.8 1.4-2.8 3.2-5.2z" />
    </svg>
  )
}

/**
 * Mirrors the app's Question of the day card, where the streak sits in the
 * header: answering is what keeps it going, so today's dot fills with the answer.
 */
function QuestionMock() {
  return (
    <div className={`${CARD} relative p-5 sm:p-7`}>
      <span className="how-xp absolute -top-4 right-5 rounded-full bg-honey-400 px-3 py-1 font-rounded text-[16px] font-extrabold text-linen-900 tabular-nums shadow-md">
        +15 XP
      </span>
      <div className="flex items-center justify-between gap-3">
        <span className="font-rounded text-[16px] font-bold text-linen-600 dark:text-linen-300">
          Question of the day
        </span>
        <span className="flex items-center gap-1 font-rounded text-[15px] font-extrabold text-honey-700 tabular-nums dark:text-honey-300">
          <Flame className="how-flame h-5 w-5" />
          12-day streak
        </span>
      </div>
      <p className="mt-4 font-rounded text-[22px] leading-snug font-extrabold text-balance text-linen-900 dark:text-linen-50">
        Which category did you spend the most on last month?
      </p>
      <div className="mt-5 space-y-3 font-rounded text-[18px] font-bold">
        <Option label="Groceries" />
        <div className="how-answer flex items-center justify-between rounded-xl border-2 border-forest-500 bg-forest-50 px-4 py-3.5 text-forest-800 dark:bg-forest-500/15 dark:text-forest-200">
          Dining
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-white">
            <CheckIcon className="h-4 w-4" />
          </span>
        </div>
        <Option label="Shopping" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-linen-100 pt-5 dark:border-linen-700">
        {WEEK.map((d, i) => {
          const today = i === WEEK.length - 1
          return (
            <span key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-honey-400 text-linen-900 ${
                  today ? 'how-today ring-3 ring-honey-200 dark:ring-honey-500/40' : ''
                }`}
              >
                <CheckIcon className="h-4 w-4" />
              </span>
              <span className="text-[13px] font-semibold text-linen-500 dark:text-linen-400">{d}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Option({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-linen-200 px-4 py-3.5 text-linen-600 dark:border-linen-600 dark:text-linen-300">
      {label}
    </div>
  )
}

/* ---------- Budgets: green while you're under, like the real Budgets card ---------- */

const BUDGETS: { name: string; spent: number; budget: number }[] = [
  { name: 'Dining', spent: 168, budget: 250 },
  { name: 'Gas', spent: 96, budget: 160 },
]

function Bar({ pct, thick }: { pct: number; thick?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-full bg-linen-100 dark:bg-linen-700 ${thick ? 'h-4' : 'h-2.5'}`}>
      <div className="h-full" style={{ width: `${pct}%` }}>
        <div className="how-fill h-full rounded-full bg-forest-500" />
      </div>
    </div>
  )
}

function BudgetMock() {
  return (
    <div className={`${CARD} p-6 sm:p-8`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-rounded text-[18px] font-bold text-linen-900 dark:text-linen-50">Budgets</span>
        <span className="text-[15px] text-linen-600 dark:text-linen-300">September</span>
      </div>
      <div className="mt-5 text-[16px] font-semibold text-linen-800 dark:text-linen-100">Groceries</div>
      <div className="font-sans tabular-nums">
        <span className="text-[44px] font-semibold tracking-tight text-linen-900 dark:text-linen-50">$412</span>
        <span className="ml-1.5 text-[18px] text-linen-600 dark:text-linen-300">of $550</span>
      </div>
      <div className="mt-3">
        <Bar pct={75} thick />
      </div>

      <ul className="mt-7 space-y-4 border-t border-linen-100 pt-6 dark:border-linen-700">
        {BUDGETS.map((b) => (
          <li key={b.name}>
            <div className="mb-1.5 flex items-baseline justify-between text-[16px]">
              <span className="font-semibold text-linen-800 dark:text-linen-100">{b.name}</span>
              <span className="text-linen-500 tabular-nums dark:text-linen-400">
                ${b.spent} / ${b.budget}
              </span>
            </div>
            <Bar pct={(b.spent / b.budget) * 100} />
          </li>
        ))}
      </ul>
    </div>
  )
}
