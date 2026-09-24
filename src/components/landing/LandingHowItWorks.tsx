/**
 * The landing page's "How it works": a centered heading that names where the
 * steps lead, then the three things that actually happen when you use Manna
 * Money as alternating rows: connect your bank (or bring a CSV), answer the
 * question of the day, and keep a calm budget while showing up grows your
 * streak. Each row's visual is one focal slice of the real app drawn in
 * HTML; they're illustrations, so screen readers get a one-line description.
 */
import type { ReactNode } from 'react'
import { CheckIcon, LinkIcon, UploadIcon } from '../icons'
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
            Connect your bank, answer one quick question a day, and keep a simple budget. About two
            minutes a day.
          </p>
        </div>

        <ol className="mt-20 space-y-20 md:mt-32 md:space-y-40">
          <Step
            title="Connect your bank"
            body="Link your bank through Plaid with your free account. You sign in inside Plaid, so we never see your password. Or upload a CSV, or try the sample year."
            label="Choosing a bank from a grid and seeing it linked, with CSV upload and the sample year as other ways in."
            visual={<BankMock />}
          />
          <Step
            flip
            title="One question a day"
            body="Each day brings one quick question built from your own spending, like where most of last month went. Every answer shows the transactions behind it."
            label="The question of the day, answered correctly for 15 XP."
            visual={<QuestionMock />}
          />
          <Step
            title="Steady budgets, small wins"
            body="Set a simple monthly budget and see where you stand at a glance. Showing up each day grows your streak and your level."
            label="A groceries budget three quarters used, beside a 12-day streak and level progress."
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

/* ---------- Step 1: picking a bank and seeing it linked ---------- */

/**
 * Placeholder bank tiles. Swap each `mark` for a real logo SVG later; the
 * `linked` one is the tile the mockup shows connecting.
 */
const BANKS: { id: string; mark: ReactNode; linked?: boolean }[] = [
  { id: 'bank-a', mark: 'A' },
  { id: 'bank-b', mark: 'B', linked: true },
  { id: 'bank-c', mark: 'C' },
  { id: 'bank-d', mark: 'D' },
  { id: 'bank-e', mark: 'E' },
  { id: 'bank-f', mark: 'F' },
]

function BankMock() {
  return (
    <div className={`${CARD} p-5 sm:p-7`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 font-rounded text-[18px] font-bold text-linen-900 dark:text-linen-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-600 dark:bg-forest-500/15 dark:text-forest-300">
            <LinkIcon className="h-5 w-5" />
          </span>
          Connect a bank
        </span>
        <span className="text-[15px] text-linen-600 dark:text-linen-300">via Plaid</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {BANKS.map((b) =>
          b.linked ? (
            <div
              key={b.id}
              className="how-press relative flex aspect-[5/4] items-center justify-center rounded-xl border-2 border-forest-500 bg-forest-50 dark:bg-forest-500/15"
            >
              <BankMark mark={b.mark} active />
              <span className="how-check absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-white ring-4 ring-cream dark:ring-linen-900">
                <CheckIcon className="h-4 w-4" />
              </span>
            </div>
          ) : (
            <div
              key={b.id}
              className="flex aspect-[5/4] items-center justify-center rounded-xl border border-linen-200 bg-linen-50 dark:border-linen-700 dark:bg-linen-800/60"
            >
              <BankMark mark={b.mark} />
            </div>
          ),
        )}
      </div>

      <div className="how-linked mt-4 flex items-center justify-center gap-2 rounded-xl bg-forest-50 py-3 font-rounded text-[17px] font-bold text-forest-800 dark:bg-forest-500/15 dark:text-forest-200">
        <CheckIcon className="h-5 w-5" />
        Linked securely
      </div>

      <div className="mt-5 flex items-center gap-3 text-[15px] text-linen-600 dark:text-linen-300">
        <span className="h-px flex-1 bg-linen-200 dark:bg-linen-700" />
        <span className="flex items-center gap-1.5">
          <UploadIcon className="h-4 w-4" />
          Upload a CSV
        </span>
        <span aria-hidden>·</span>
        <span>Try the sample year</span>
        <span className="h-px flex-1 bg-linen-200 dark:bg-linen-700" />
      </div>
    </div>
  )
}

function BankMark({ mark, active }: { mark: ReactNode; active?: boolean }) {
  return (
    <span
      className={`flex h-12 w-12 items-center justify-center rounded-full font-rounded text-[20px] font-extrabold ${
        active
          ? 'bg-forest-600 text-white'
          : 'bg-linen-200 text-linen-600 dark:bg-linen-700 dark:text-linen-200'
      }`}
    >
      {mark}
    </span>
  )
}

/* ---------- Step 2: the question of the day, answered right ---------- */

function QuestionMock() {
  return (
    <div className={`${CARD} p-5 sm:p-7`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-rounded text-[16px] font-bold text-linen-600 dark:text-linen-300">
          Question of the day
        </span>
        <span className="how-xp rounded-full border border-honey-300 bg-honey-100 px-3 py-1 font-rounded text-[16px] font-extrabold text-honey-800 tabular-nums dark:border-honey-500/40 dark:bg-honey-500/15 dark:text-honey-200">
          +15 XP
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

/* ---------- Step 3: a calm budget, with the streak beside it ---------- */

function BudgetMock() {
  return (
    <div className="flex flex-col">
      <div className={`${CARD} w-full p-6 sm:w-[88%] sm:p-8`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-rounded text-[18px] font-bold text-linen-900 dark:text-linen-50">Groceries</span>
          <span className="text-[15px] text-linen-600 dark:text-linen-300">September</span>
        </div>
        <div className="mt-5 font-sans tabular-nums">
          <span className="text-[44px] font-semibold tracking-tight text-linen-900 dark:text-linen-50">$412</span>
          <span className="ml-1.5 text-[18px] text-linen-600 dark:text-linen-300">of $550</span>
        </div>
        <div className="mt-4 mb-6 h-5 overflow-hidden rounded-full bg-linen-100 dark:bg-linen-700">
          <div className="h-full w-3/4 rounded-full bg-honey-400" />
        </div>
      </div>

      <div className={`${CARD} how-win relative -mt-8 ml-auto w-[86%] p-5 sm:w-[70%] sm:p-6`}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="how-flame h-12 w-12 shrink-0">
            <path
              className="fill-honey-500"
              d="M12 1.8c1.1 4.3 6.6 6.6 6.6 12.6a6.6 6.6 0 0 1-13.2 0c0-3.3 1.7-5.2 3.3-6.5 0 1.8.5 3 1.5 3.9C10.2 8.3 10.8 4.8 12 1.8z"
            />
            <path className="fill-honey-300" d="M12 11.4c.8 1.8 3.2 2.8 3.2 5.2a3.2 3.2 0 0 1-6.4 0c0-1.8 1.4-2.8 3.2-5.2z" />
          </svg>
          <div className="leading-tight">
            <div className="font-rounded text-[22px] font-extrabold text-honey-700 tabular-nums dark:text-honey-300">
              12-day streak
            </div>
            <div className="mt-0.5 text-[15px] text-linen-600 dark:text-linen-300">Level 3 · Faithful With Little</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-linen-100 dark:bg-linen-700">
          <div className="h-full w-[37%]">
            <div className="how-fill h-full rounded-full bg-linear-to-r from-honey-400 to-honey-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
