/**
 * The three small steps at the top of "How it works": connect your bank, see
 * your categories, plan your whole year. Each tile holds a tiny slice of the
 * real app that plays while you hover it (tap it on a phone, where it also
 * plays once it's centred on screen): the bank links, a category opens onto
 * its transactions, and the Year Sheet's numbers ripple in from the corner.
 * At rest every tile shows its finished picture, so nothing is hidden from a
 * visitor who never hovers. They're illustrations: screen readers get the
 * one-line label, and the numbers are made up.
 */
import type { CSSProperties, ReactNode } from 'react'
import type { BrandSlug } from '@moneyquiz/core/data/brandIcons'
import { CheckIcon, LinkIcon, UploadIcon } from '../icons'
import { MerchantLogo } from '../MerchantLogo'
import { BODY } from './styles'
import { useHoverPlay } from './useHoverPlay'
import './steps.css'

export function HowSteps() {
  return (
    <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
      <StepTile
        n={1}
        title="Connect your bank"
        body="Link it through Plaid. You sign in inside Plaid, so we never see your password. Or upload a CSV."
        label="Choosing Chase from a grid of banks and seeing it linked securely."
        visual={<BankTile />}
      />
      <StepTile
        n={2}
        title="See your categories"
        body="Every purchase lands in a category. Open one to see exactly what’s inside."
        label="A list of spending categories; opening Groceries shows its transactions."
        visual={<CategoriesTile />}
      />
      <StepTile
        n={3}
        title="Plan your whole year"
        body="The Year Sheet lays every month side by side, with the months ahead projected."
        label="The Year Sheet for 2026: income, groceries, dining and giving by month, with the net for each."
        visual={<YearTile />}
      />
    </ol>
  )
}

function StepTile(props: { n: number; title: string; body: string; label: string; visual: ReactNode }) {
  const [ref, phase, handlers] = useHoverPlay<HTMLDivElement>()
  return (
    <li className="mx-auto w-full max-w-[400px]">
      <div
        ref={ref}
        data-motion={phase}
        role="img"
        aria-label={props.label}
        tabIndex={0}
        {...handlers}
        className="step-tile flex h-[300px] items-center justify-center rounded-3xl bg-linen-100 px-3 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-600 dark:bg-linen-900"
      >
        <div aria-hidden className="w-full max-w-[300px]">
          {props.visual}
        </div>
      </div>
      <h3 className="mt-6 font-rounded text-[20px] font-extrabold text-linen-900 dark:text-linen-50">
        <span className="text-forest-600 dark:text-forest-300">{props.n}.</span> {props.title}
      </h3>
      <p className={`${BODY} mt-2 text-pretty`}>{props.body}</p>
    </li>
  )
}

const CARD =
  'rounded-2xl border border-linen-200 bg-cream shadow-[0_14px_30px_-16px_rgb(0_0_0/0.25)] dark:border-linen-700 dark:bg-linen-800 dark:shadow-[0_14px_30px_-16px_rgb(0_0_0/0.9)]'

/* ---------- 1. Picking a bank and seeing it linked ---------- */

/**
 * The banks in the picker; `linked` is the one the mockup shows connecting.
 * The logos are the app's bundled brand set (see data/brandIcons); they're
 * here only to show what connecting looks like, not to imply endorsement.
 */
const BANKS: { brand: BrandSlug; linked?: boolean }[] = [
  { brand: 'chase', linked: true },
  { brand: 'bankofamerica' },
  { brand: 'wellsfargo' },
  { brand: 'americanexpress' },
  { brand: 'discover' },
]

const BANK_CELL = 'relative flex aspect-[5/4] items-center justify-center rounded-xl'

function BankTile() {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-rounded text-[15px] font-bold text-linen-900 dark:text-linen-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-50 text-forest-600 dark:bg-forest-500/15 dark:text-forest-300">
            <LinkIcon className="h-4 w-4" />
          </span>
          Connect a bank
        </span>
        <span className="text-[12px] text-linen-500 dark:text-linen-400">via Plaid</span>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {BANKS.map((b) => (
          <div
            key={b.brand}
            className={`${BANK_CELL} ${
              b.linked
                ? 'step-bank border-2 border-forest-500 bg-forest-50 dark:bg-forest-500/15'
                : 'border border-linen-200 bg-linen-50 dark:border-linen-600 dark:bg-linen-900/60'
            }`}
          >
            <MerchantLogo brand={b.brand} size="lg" className="shadow-[0_1px_2px_rgb(0_0_0/0.12)]" />
            {b.linked && (
              <span className="step-check absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-forest-600 text-white ring-3 ring-cream dark:ring-linen-800">
                <CheckIcon className="h-3 w-3" />
              </span>
            )}
          </div>
        ))}
        {/* Plaid reaches thousands of banks; the grid only shows a handful. */}
        <div
          className={`${BANK_CELL} border border-dashed border-linen-300 font-rounded text-[13px] font-bold text-linen-500 dark:border-linen-600 dark:text-linen-400`}
        >
          + more
        </div>
      </div>

      {/* Sky is the app's "synced" colour; a status line, not an action. */}
      <div className="step-linked mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 py-2 font-rounded text-[14px] font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
        <CheckIcon className="h-4 w-4" />
        Linked securely
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-linen-500 dark:text-linen-400">
        <UploadIcon className="h-3.5 w-3.5" />
        Or upload a CSV
      </div>
    </div>
  )
}

/* ---------- 2. A category list that opens onto its transactions ---------- */

const CATEGORIES: { name: string; amount: string; dot: string; open?: boolean }[] = [
  { name: 'Groceries', amount: '$412', dot: 'bg-forest-500', open: true },
  { name: 'Dining', amount: '$188', dot: 'bg-sky-500' },
  { name: 'Gas', amount: '$96', dot: 'bg-linen-400' },
  { name: 'Giving', amount: '$512', dot: 'bg-forest-300' },
  { name: 'Utilities', amount: '$142', dot: 'bg-sky-300' },
]

const GROCERIES: [string, string, string][] = [
  ['Corner Market', 'Sep 21', '−$64.18'],
  ['Fresh Foods', 'Sep 17', '−$92.40'],
  ['Corner Market', 'Sep 12', '−$38.75'],
  ['Farmers Market', 'Sep 6', '−$24.00'],
]

const ROW = 'flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]'

function CategoriesTile() {
  return (
    <div className={`${CARD} overflow-hidden`}>
      {/* Two screens side by side; opening a category slides to the second. */}
      <div className="step-strip flex w-[200%]">
        <div className="w-1/2">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
            <span className="font-rounded text-[15px] font-bold text-linen-900 dark:text-linen-50">Spending</span>
            <span className="text-[12px] text-linen-500 dark:text-linen-400">September</span>
          </div>
          <ul className="divide-y divide-linen-100 dark:divide-linen-700">
            {CATEGORIES.map((c) => (
              <li
                key={c.name}
                className={`${ROW} ${c.open ? 'step-open' : ''} text-linen-800 dark:text-linen-100`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  {c.name}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  {c.amount}
                  <Chevron />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-1/2">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
            <span className="flex items-center gap-1 font-rounded text-[15px] font-bold text-linen-900 dark:text-linen-50">
              <Chevron back />
              Groceries
            </span>
            <span className="text-[12px] text-linen-500 tabular-nums dark:text-linen-400">$412</span>
          </div>
          <ul className="divide-y divide-linen-100 dark:divide-linen-700">
            {GROCERIES.map(([who, when, amt], i) => (
              <li
                key={who + when}
                className={`step-txn ${ROW}`}
                style={{ '--d': `${900 + i * 70}ms` } as CSSProperties}
              >
                <span className="leading-tight">
                  <span className="block font-semibold text-linen-800 dark:text-linen-100">{who}</span>
                  <span className="text-[11px] text-linen-500 dark:text-linen-400">{when}</span>
                </span>
                <span className="text-linen-800 tabular-nums dark:text-linen-100">{amt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 ${back ? 'rotate-180 text-forest-600 dark:text-forest-300' : 'text-linen-400'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

/* ---------- 3. The Year Sheet, numbers rippling in from the corner ---------- */

const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** From October on the months are projected, drawn softer and in italics. */
const FIRST_PROJECTED = 2
const LINES: { label: string; cells: string[]; tone?: string }[] = [
  {
    label: 'Income',
    cells: ['4,850', '5,120', '4,850', '4,850', '4,850'],
    tone: 'text-forest-700 dark:text-forest-300',
  },
  { label: 'Groceries', cells: ['588', '641', '600', '600', '600'] },
  { label: 'Dining', cells: ['262', '188', '200', '200', '200'] },
  { label: 'Giving', cells: ['485', '512', '485', '485', '485'] },
]
const NET = ['−86', '+940', '+1,050', '+1,050', '+1,050']
const LAST_COL = MONTHS.length - 1

/**
 * The ripple's clock: a cell's delay grows with how many rings out it sits
 * from the top-right number, so each ring of neighbours lands together.
 */
function ring(row: number, col: number) {
  return { '--d': `${Math.max(row, LAST_COL - col) * 110}ms` } as CSSProperties
}

const GRID = 'grid grid-cols-[58px_repeat(5,minmax(0,1fr))] items-center'

function YearTile() {
  const shade = (col: number) => (col >= FIRST_PROJECTED ? 'bg-linen-100/70 dark:bg-linen-900/50' : '')
  return (
    <div className={`${CARD} overflow-hidden text-[11px]`}>
      <div className="flex items-baseline justify-between px-3 pt-3 pb-2">
        <span className="font-rounded text-[13px] font-bold text-linen-900 dark:text-linen-50">Year Sheet · 2026</span>
        <span className="text-[10px] text-linen-500 italic dark:text-linen-400">Ahead projected</span>
      </div>

      <div className={`${GRID} border-t border-linen-100 text-linen-500 dark:border-linen-700 dark:text-linen-400`}>
        <span />
        {MONTHS.map((m, c) => (
          <span key={m} className={`py-1.5 pr-1.5 text-right ${shade(c)} ${c >= FIRST_PROJECTED ? 'italic' : ''}`}>
            {m}
          </span>
        ))}
      </div>

      {LINES.map((line, r) => (
        <div key={line.label} className={`${GRID} border-t border-linen-100 dark:border-linen-700`}>
          <span className="py-2 pl-3 font-semibold text-linen-800 dark:text-linen-100">{line.label}</span>
          {line.cells.map((v, c) => (
            <span
              key={MONTHS[c]}
              className={`py-2 pr-1.5 text-right tabular-nums ${shade(c)} ${c >= FIRST_PROJECTED ? 'italic' : ''} ${
                line.tone ??
                (c >= FIRST_PROJECTED ? 'text-linen-500 dark:text-linen-400' : 'text-linen-800 dark:text-linen-100')
              }`}
            >
              <span className="step-num inline-block" style={ring(r, c)}>
                {v}
              </span>
            </span>
          ))}
        </div>
      ))}

      <div className={`${GRID} border-t-2 border-linen-200 font-bold dark:border-linen-600`}>
        <span className="py-2 pl-3 text-linen-900 dark:text-linen-50">Net</span>
        {NET.map((v, c) => (
          <span key={MONTHS[c]} className={`py-2 pr-1.5 text-right tabular-nums ${shade(c)}`}>
            <span
              className={`step-net inline-block ${
                v.startsWith('−') ? 'text-rose-600 dark:text-rose-400' : 'text-forest-700 dark:text-forest-300'
              } ${c >= FIRST_PROJECTED ? 'italic' : ''}`}
            >
              <span className="step-num inline-block" style={ring(LINES.length, c)}>
                {v}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
