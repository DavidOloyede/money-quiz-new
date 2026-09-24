/**
 * The pretend banks behind "Try a demo connection": an offline stand-in for
 * Plaid, for demos and for trying the app without real accounts.
 *
 * Connecting one looks like linking a real bank, but underneath each account
 * is a CSV file in that bank's real export layout (lib/bankFormats), read by
 * the same importer an uploaded file goes through. So a demo exercises the
 * real parsing, card-payment removal and categorising, and the very same
 * files can be downloaded and uploaded by hand.
 *
 * It's one invented person, Jordan Avery (the sample year's owner), whose
 * money is spread across six banks the way a real household's is: pay and
 * bills in checking, a savings account at an online bank, and a card for each
 * kind of spending. The accounts agree with each other: every card's
 * purchases come back as a payment out of checking the next month, and money
 * moved to savings appears on both sides. Connect one bank and it reads
 * sensibly on its own; connect them all and the totals still add up.
 *
 * Like the sample year it's rolling (12 months ending today) and
 * deterministic (every amount and day comes from a hash, never Math.random).
 * All rows are invented. Never copy rows from a real statement into it.
 */
import type { AccountType } from '../types'
import type { BrandSlug } from './brandIcons'
import {
  BANK_FORMATS,
  cellsToRow,
  formatCsv,
  formatMapping,
  type BankFormatId,
} from '../lib/bankFormats'
import { rowsToTransactions, type ImportResult } from '../lib/importCsv'
import { SAMPLE_OWNER_NAMES, iso, pad, rand, round2, vary, windowMonths } from './sampleData'

/** The demo person's own names, so their self-transfers are recognised. */
export const DEMO_OWNER_NAMES = SAMPLE_OWNER_NAMES

export interface DemoAccount {
  id: string
  institutionId: string
  /** The product name, e.g. "Total Checking". */
  name: string
  /** Last four digits. */
  mask: string
  accountType: AccountType
  format: BankFormatId
  /** What this account is used for, shown in the account picker. */
  blurb: string
}

export interface DemoInstitution {
  id: string
  name: string
  /** Bundled logo, when we carry one; otherwise a monogram in `color`. */
  brand?: BrandSlug
  /** Brand colour for the monogram tile, 6-digit hex without the #. */
  color: string
  accounts: DemoAccount[]
}

const account = (
  institutionId: string,
  id: string,
  name: string,
  mask: string,
  accountType: AccountType,
  format: BankFormatId,
  blurb: string,
): DemoAccount => ({ id, institutionId, name, mask, accountType, format, blurb })

export const DEMO_INSTITUTIONS: DemoInstitution[] = [
  {
    id: 'chase',
    name: 'Chase',
    brand: 'chase',
    color: '117ACA',
    accounts: [
      account('chase', 'demo-chase-checking', 'Total Checking', '1092', 'bank', 'chase-checking', 'Paycheck, mortgage and bills'),
      account('chase', 'demo-chase-sapphire', 'Sapphire Preferred', '4417', 'credit', 'chase-card', 'Coffee, restaurants and travel'),
    ],
  },
  {
    id: 'ally',
    name: 'Ally Bank',
    color: '8A3575',
    accounts: [account('ally', 'demo-ally-savings', 'Online Savings', '4821', 'bank', 'ally', 'Savings, with monthly interest')],
  },
  {
    id: 'bofa',
    name: 'Bank of America',
    brand: 'bankofamerica',
    color: '012169',
    accounts: [account('bofa', 'demo-bofa-cash', 'Customized Cash Rewards', '3306', 'credit', 'bofa-card', 'Subscriptions, plus gas and lunch')],
  },
  {
    id: 'citi',
    name: 'Citi',
    color: '056DAE',
    accounts: [account('citi', 'demo-citi-double', 'Double Cash', '7784', 'credit', 'citi', 'Groceries, gas and the power bill')],
  },
  {
    id: 'amex',
    name: 'American Express',
    brand: 'americanexpress',
    color: '2E77BC',
    accounts: [account('amex', 'demo-amex-blue', 'Blue Cash Everyday', '1008', 'credit', 'amex', 'Shopping and big purchases')],
  },
  {
    id: 'capitalone',
    name: 'Capital One',
    color: 'D03027',
    accounts: [account('capitalone', 'demo-capone-quicksilver', 'Quicksilver', '7730', 'credit', 'capital-one', 'Phone, internet, health and fun')],
  },
]

const ACCOUNTS = new Map(DEMO_INSTITUTIONS.flatMap((i) => i.accounts.map((a) => [a.id, a] as const)))

export function demoAccount(id: string): DemoAccount | undefined {
  return ACCOUNTS.get(id)
}

export function demoInstitution(id: string): DemoInstitution | undefined {
  return DEMO_INSTITUTIONS.find((i) => i.id === id)
}

/* ------------------------------------------------------------------ */
/* The catalog                                                         */
/* ------------------------------------------------------------------ */

/** One row as the ledger knows it; each bank's writer styles it. */
interface Entry {
  date: string
  description: string
  /** Negative for money out, as everywhere else in the app. */
  amount: number
  /** The bank's own category label, for layouts that have one. */
  category?: string
  /** Chase's row type (checking: ACH_DEBIT, LOAN_PMT…; card: Sale, Payment…). */
  type?: string
}

interface Monthly {
  description: string
  amount: number
  day: number
  /** 0 = the same every month; default 0.15. */
  spread?: number
  category?: string
  type?: string
  /** Only from / up to this month of the 12-month window (0 = oldest). */
  from?: number
  until?: number
}

interface Habit {
  description: string
  amount: number
  times: number
  spread?: number
  category?: string
}

/** A one-off, placed by calendar month (1–12) so seasonal things land in season. */
interface OneOff {
  month: number
  day: number
  description: string
  amount: number
  category?: string
  type?: string
}

interface Catalog {
  monthly?: Monthly[]
  habits?: Habit[]
  oneOffs?: OneOff[]
}

/** How each card is paid off from checking, the month after the spending. */
interface CardPayoff {
  day: number
  /** The row in checking. `md` is the payment's MM/DD, which Chase appends. */
  checking: (md: string) => string
  checkingType: string
  /** The matching row on the card's own statement. */
  card: string
  cardCategory?: string
  cardType?: string
}

const SELF_TO_ALLY = 400

const CATALOG: Record<string, Catalog> = {
  'demo-chase-checking': {
    monthly: [
      { description: 'HARBOR POINT LABS PAYROLL PPD ID: 9110438821', amount: 2465, day: 1, spread: 0.02, type: 'ACH_CREDIT' },
      { description: 'HARBOR POINT LABS PAYROLL PPD ID: 9110438821', amount: 2465, day: 15, spread: 0.02, type: 'ACH_CREDIT' },
      { description: 'CEDARBROOK MTG PYMTS WEB ID: 1800948598', amount: -1845, day: 1, spread: 0, type: 'ACH_DEBIT' },
      { description: 'WILLOW BEND OWNERS ASSOCIATION WEB ID: 3201463633', amount: -118, day: 3, spread: 0, type: 'ACH_DEBIT' },
      { description: 'RIVERSTONE CHAPEL TITHE WEB ID: 4400921837', amount: -492, day: 5, spread: 0.05, type: 'ACH_DEBIT' },
      { description: 'SENTINEL AUTO INSURANCE PPD ID: 2743001198', amount: -142.3, day: 8, spread: 0, type: 'ACH_DEBIT' },
      { description: 'MERIDIAN STUDENT LOAN PAYMENT PPD ID: 9102001101', amount: -312.6, day: 20, spread: 0, type: 'ACH_DEBIT' },
      // A shared phone plan: same person, same amount, same day every month.
      { description: 'Zelle payment to Priya Raman', amount: -85, day: 18, spread: 0, type: 'QUICKPAY_DEBIT' },
      // Savings at another bank, sent by Zelle to themselves (see ALLY below).
      { description: 'Zelle payment to Jordan Avery', amount: -SELF_TO_ALLY, day: 2, spread: 0, type: 'CHASE_TO_PARTNERFI' },
    ],
    oneOffs: [
      // The home-insurance half of the HOA descriptor: same name, different bill.
      ...[1, 4, 7, 10].map((month) => ({
        month,
        day: 3,
        description: 'WILLOW BEND OWNERS ASSOCIATION WEB ID: 3201463633',
        amount: -342.5,
        type: 'ACH_DEBIT',
      })),
      { month: 4, day: 9, description: 'IRS  TREAS 310     TAX REF PPD ID: 9111036170', amount: 1284, type: 'ACH_CREDIT' },
      // Zelle that needs a human decision: a contractor, a gift, a friend settling up.
      { month: 3, day: 11, description: 'Zelle payment to Marcus Ellison', amount: -450, type: 'QUICKPAY_DEBIT' },
      { month: 8, day: 24, description: 'Zelle payment to Marcus Ellison', amount: -275, type: 'QUICKPAY_DEBIT' },
      { month: 5, day: 8, description: 'Zelle payment from Renee Avery', amount: 300, type: 'QUICKPAY_CREDIT' },
      { month: 6, day: 20, description: 'Zelle payment from Dana Whitlock', amount: 61, type: 'QUICKPAY_CREDIT' },
      { month: 10, day: 3, description: 'Zelle payment from Dana Whitlock', amount: 42.5, type: 'QUICKPAY_CREDIT' },
      // A fee the bank took back the next day.
      { month: 6, day: 8, description: 'MONTHLY SERVICE FEE', amount: -15, type: 'FEE_TRANSACTION' },
      { month: 6, day: 9, description: 'FEE REVERSAL', amount: 15, type: 'REFUND_TRANSACTION' },
      { month: 5, day: 5, description: 'ATM WITHDRAWAL 004412 4320 MAIN ST HOUSTON TX', amount: -200, type: 'ATM' },
      { month: 10, day: 17, description: 'ATM WITHDRAWAL 004419 4320 MAIN ST HOUSTON TX', amount: -140, type: 'ATM' },
      { month: 3, day: 22, description: 'HOPE HARVEST FUND DONATION WEB ID: 7730019921', amount: -75, type: 'ACH_DEBIT' },
      { month: 11, day: 19, description: 'HOPE HARVEST FUND DONATION WEB ID: 7730019921', amount: -60, type: 'ACH_DEBIT' },
      // Savings covering July's big purchase and trip (see ALLY below).
      { month: 8, day: 13, description: 'Zelle payment from Jordan Avery', amount: 1500, type: 'PARTNERFI_TO_CHASE' },
    ],
  },

  'demo-ally-savings': {
    monthly: [
      {
        description: 'Zelle payment from JORDAN AVERY to Jordan Avery (Ally Savings Account XXXXXX4821)',
        amount: SELF_TO_ALLY,
        day: 2,
        spread: 0,
      },
    ],
    oneOffs: [
      {
        month: 8,
        day: 13,
        description: 'Zelle payment from Jordan Avery (Ally Savings Account XXXXXX4821) to JORDAN  AVERY',
        amount: -1500,
      },
    ],
  },

  'demo-chase-sapphire': {
    habits: [
      // The frequent merchant the dashboard singles out.
      { description: 'STARBUCKS STORE 13390', amount: -6.4, times: 4, spread: 0.2, category: 'Food & Drink' },
      { description: 'CORNER COFFEE ROASTERS', amount: -5.25, times: 1, spread: 0.2, category: 'Food & Drink' },
      { description: 'TST* MORNING GLORY CAFE', amount: -18.4, times: 1, spread: 0.3, category: 'Food & Drink' },
      { description: 'BASIL & BRICK PIZZA', amount: -24.8, times: 1, spread: 0.3, category: 'Food & Drink' },
      { description: 'SOL TACO KITCHEN', amount: -16.75, times: 1, spread: 0.3, category: 'Food & Drink' },
    ],
    oneOffs: [
      { month: 3, day: 14, description: 'UBER   *TRIP HELP.UBER.COM', amount: -18.4, category: 'Travel' },
      { month: 7, day: 3, description: 'UBER   *TRIP HELP.UBER.COM', amount: -23.75, category: 'Travel' },
      { month: 11, day: 22, description: 'UBER   *TRIP HELP.UBER.COM', amount: -16.9, category: 'Travel' },
      // A summer trip.
      { month: 7, day: 18, description: 'DELTA AIR 0062178344521', amount: -412.6, category: 'Travel' },
      { month: 7, day: 21, description: 'HARBORVIEW INN SAVANNAH GA', amount: -578.8, category: 'Travel' },
      { month: 4, day: 2, description: 'ANNUAL MEMBERSHIP FEE', amount: -95, category: 'Fees & Adjustments', type: 'Fee' },
    ],
  },

  'demo-bofa-cash': {
    monthly: [
      { description: 'LUMEN NOTES SUBSCRIPTION', amount: -12, day: 6, spread: 0 },
      { description: 'NETFLIX.COM', amount: -15.49, day: 11, spread: 0 },
      { description: 'APPLE.COM/BILL', amount: -2.99, day: 15, spread: 0 },
      { description: 'GOOGLE *YouTubePremium', amount: -13.99, day: 20, spread: 0 },
      { description: 'SPOTIFY USA', amount: -11.99, day: 27, spread: 0 },
      // A subscription that ended partway through the year.
      { description: 'ATLAS VPN SUBSCRIPTION', amount: -4.99, day: 24, spread: 0, until: 6 },
    ],
    // Some everyday spending too. A card holding only fixed subscriptions
    // would be paid off by the same amount every month, and a same-amount
    // monthly transfer out of checking reads as a bill.
    habits: [
      { description: 'EXXONMOBIL 4471 HOUSTON TX', amount: -38.6, times: 1, spread: 0.3 },
      { description: 'CHICK-FIL-A #01842', amount: -11.4, times: 2, spread: 0.3 },
    ],
    oneOffs: [{ month: 3, day: 13, description: 'SKYVAULT STORAGE SUBSCRIPTION', amount: -95.88 }],
  },

  'demo-citi-double': {
    monthly: [{ description: 'BRIGHTLINE ENERGY SVC HOUSTON TX', amount: -104.5, day: 25, spread: 0.3 }],
    habits: [
      { description: 'NORTHSIDE GROCERY #212 HOUSTON TX', amount: -78.5, times: 3, spread: 0.25 },
      { description: 'GREENLEAF SUPERMARKET HOUSTON TX', amount: -41.2, times: 1, spread: 0.3 },
      { description: 'SHELL OIL 57442 HOUSTON TX', amount: -41.8, times: 1, spread: 0.25 },
      { description: 'SUMMIT FUEL STOP HOUSTON TX', amount: -44.3, times: 1, spread: 0.25 },
      { description: 'WELLSPRING PHARMACY HOUSTON TX', amount: -22.15, times: 1, spread: 0.3 },
    ],
    oneOffs: [
      // A repair moved onto a payment plan: the card reports a credit and an
      // equal new charge, and only the original repair is real spending.
      { month: 8, day: 5, description: 'TIMBERLINE AUTO REPAIR HOUSTON TX', amount: -511.47 },
      { month: 8, day: 19, description: 'CITI FLEX PAY CREDIT-TIMBERLINE AUTO REPAIR', amount: 511.47 },
      { month: 8, day: 19, description: 'CITI FLEX PAY', amount: -511.47 },
      { month: 8, day: 19, description: 'PLAN FEE - CITI FLEX PLAN 01', amount: -6.25 },
      // A refund that should net against groceries, not read as income.
      { month: 10, day: 4, description: 'NORTHSIDE GROCERY #212 HOUSTON TX', amount: 18.25 },
    ],
  },

  'demo-amex-blue': {
    habits: [
      { description: 'TARGET 00018465 HOUSTON TX', amount: -48.6, times: 1, spread: 0.35 },
      { description: 'AMAZON MARKETPLACE NA PA', amount: -34, times: 2, spread: 0.5 },
      { description: 'COSTCO WHSE #0688 HOUSTON TX', amount: -142, times: 1, spread: 0.25 },
      { description: 'RIVERMARK CLOTHING CO', amount: -63.4, times: 1, spread: 0.4 },
    ],
    oneOffs: [
      // The one clear largest purchase of the year, and a return.
      { month: 7, day: 14, description: 'VOLTIC ELECTRONICS', amount: -1899 },
      { month: 7, day: 29, description: 'RIVERMARK CLOTHING CO', amount: 63.4 },
      { month: 6, day: 23, description: 'WAGGLE PET SUPPLIES', amount: -54.2 },
      { month: 12, day: 6, description: 'AMAZON MARKETPLACE NA PA', amount: -186.4 },
    ],
  },

  'demo-capone-quicksilver': {
    monthly: [
      { description: 'CLEARWAVE INTERNET', amount: -79.99, day: 14, spread: 0, category: 'Internet' },
      { description: 'VERIZON WIRELESS', amount: -85, day: 17, spread: 0, category: 'Phone/Cable' },
      // A subscription that started partway through the year.
      { description: 'BEACON FITNESS SUBSCRIPTION', amount: -29, day: 19, spread: 0, from: 5, category: 'Other Services' },
    ],
    habits: [
      { description: "MCDONALD'S F12345", amount: -9.8, times: 1, spread: 0.25, category: 'Dining' },
      { description: 'CITY TRANSIT PAYGO', amount: -2.9, times: 2, spread: 0.1, category: 'Other Travel' },
    ],
    oneOffs: [
      ...[1, 3, 5, 7, 9, 11].map((month) => ({
        month,
        day: 16,
        description: 'CLIPPER LANE BARBERSHOP',
        amount: -35,
        category: 'Other Services',
      })),
      { month: 2, day: 9, description: 'PAWPRINT VET CLINIC', amount: -186.4, category: 'Health Care' },
      { month: 10, day: 12, description: 'PAWPRINT VET CLINIC', amount: -94, category: 'Health Care' },
      { month: 3, day: 18, description: 'MAPLE FAMILY DENTAL', amount: -210, category: 'Health Care' },
      { month: 9, day: 7, description: 'MAPLE FAMILY DENTAL', amount: -95, category: 'Health Care' },
      { month: 4, day: 6, description: 'BRIGHTPATH TUITION CENTER', amount: -320, category: 'Other Services' },
      { month: 10, day: 6, description: 'BRIGHTPATH TUITION CENTER', amount: -320, category: 'Other Services' },
      { month: 2, day: 21, description: 'STARLIGHT CINEMA', amount: -34.5, category: 'Entertainment' },
      { month: 5, day: 14, description: 'RIVERFRONT CONCERT HALL', amount: -128, category: 'Entertainment' },
      { month: 8, day: 27, description: 'STARLIGHT CINEMA', amount: -41.25, category: 'Entertainment' },
      { month: 11, day: 8, description: 'LAKESIDE SKATING RINK', amount: -27, category: 'Entertainment' },
    ],
  },
}

const PAYOFFS: Record<string, CardPayoff> = {
  'demo-chase-sapphire': {
    day: 22,
    checking: (md) => `Payment to Chase card ending in 4417 ${md}`,
    checkingType: 'LOAN_PMT',
    card: 'Payment Thank You-Mobile',
    cardType: 'Payment',
  },
  'demo-citi-double': {
    day: 1,
    checking: () => 'CITI CARD ONLINE PAYMENT 432106770621518 WEB ID: CITICTP',
    checkingType: 'ACH_DEBIT',
    card: 'ONLINE PAYMENT, THANK YOU',
  },
  'demo-bofa-cash': {
    day: 12,
    checking: () => 'BANK OF AMERICA CREDIT CARD BILL PAYMENT WEB ID: 8826531401',
    checkingType: 'ACH_DEBIT',
    card: 'PAYMENT - THANK YOU',
  },
  'demo-amex-blue': {
    day: 14,
    checking: () => 'AMEX EPAYMENT    ACH PMT    W4418 WEB ID: 2005032111',
    checkingType: 'ACH_DEBIT',
    card: 'AUTOPAY PAYMENT - THANK YOU',
  },
  'demo-capone-quicksilver': {
    day: 17,
    checking: () => 'CAPITAL ONE AUTOPAY PYMT WEB ID: 9279744380',
    checkingType: 'ACH_DEBIT',
    card: 'CAPITAL ONE AUTOPAY PYMT',
    cardCategory: 'Payment/Credit',
  },
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const ALLY_START = 8200
const ALLY_APY = 0.036

/** Every account's rows for the 12 months ending `now`, oldest first. */
function buildLedger(now: Date): Map<string, Entry[]> {
  const ledger = new Map<string, Entry[]>([...ACCOUNTS.keys()].map((id) => [id, [] as Entry[]]))
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate())
  const push = (accountId: string, e: Entry) => {
    // Never a transaction in the future: the current month is partial, the
    // way a real export is.
    if (e.date <= todayIso) ledger.get(accountId)!.push(e)
  }
  const months = windowMonths(now)
  // Card spending per month (index → net charges), for next month's payoff.
  const spent = new Map<string, number[]>()

  for (const [accountId, cat] of Object.entries(CATALOG)) {
    const perMonth = months.map(() => 0)
    for (const { year, month, index } of months) {
      const add = (day: number, e: Omit<Entry, 'date'>) => {
        const date = iso(year, month, day)
        if (date <= todayIso) perMonth[index] += e.amount
        push(accountId, { ...e, date })
      }
      for (const m of cat.monthly ?? []) {
        if (m.from !== undefined && index < m.from) continue
        if (m.until !== undefined && index > m.until) continue
        const amount = m.spread === 0 ? m.amount : vary(m.amount, `${m.description}|${index}`, m.spread ?? 0.15)
        add(m.day, { description: m.description, amount, category: m.category, type: m.type })
      }
      for (const h of cat.habits ?? []) {
        for (let i = 0; i < h.times; i++) {
          const seed = `demo|${h.description}|${index}|${i}`
          const day = 2 + Math.floor(rand(`${seed}|day`) * 26)
          add(day, { description: h.description, amount: vary(h.amount, seed, h.spread ?? 0.2), category: h.category })
        }
      }
      for (const o of cat.oneOffs ?? []) {
        if (o.month !== month + 1) continue
        add(o.day, { description: o.description, amount: o.amount, category: o.category, type: o.type })
      }
    }
    spent.set(accountId, perMonth)
  }

  // Each card is paid in full from checking the month after the spending.
  // The oldest month has no "before" in the window, so it pays its own.
  for (const [cardId, payoff] of Object.entries(PAYOFFS)) {
    const perMonth = spent.get(cardId)!
    for (const { year, month, index } of months) {
      const owed = round2(-(perMonth[Math.max(0, index - 1)] ?? 0))
      if (owed <= 0) continue
      const date = iso(year, month, payoff.day)
      const md = `${pad(month + 1)}/${pad(payoff.day)}`
      push('demo-chase-checking', { date, description: payoff.checking(md), amount: -owed, type: payoff.checkingType })
      push(cardId, { date, description: payoff.card, amount: owed, category: payoff.cardCategory, type: payoff.cardType })
    }
  }

  // Savings interest, on the balance as it stood when each month began.
  let balance = ALLY_START
  const ally = ledger.get('demo-ally-savings')!
  for (const { year, month } of months) {
    const interest = round2((balance * ALLY_APY) / 12)
    push('demo-ally-savings', { date: iso(year, month, 13), description: 'Interest Paid', amount: interest })
    const prefix = `${year}-${pad(month + 1)}`
    balance += ally.filter((e) => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0)
  }

  for (const rows of ledger.values()) {
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description))
  }
  return ledger
}

/* ------------------------------------------------------------------ */
/* Writing each bank's layout                                          */
/* ------------------------------------------------------------------ */

const mdy = (isoDate: string) => `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}/${isoDate.slice(0, 4)}`
const money = (n: number) => n.toFixed(2)

/** A few days later, never past today. */
function postDate(isoDate: string, seed: string, todayIso: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1 + Math.floor(rand(seed) * 2))
  const out = d.toISOString().slice(0, 10)
  return out > todayIso ? todayIso : out
}

/** A stable reference code, like the ones banks tack onto Zelle rows. */
function code(seed: string, length: number, alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'): string {
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rand(`${seed}|${i}`) * alphabet.length)]
  return out
}

/** Chase checking lists a running balance; start high enough never to dip below $250. */
function runningBalances(rows: Entry[]): number[] {
  let run = 0
  let low = 0
  const deltas = rows.map((e) => (run = round2(run + e.amount)))
  for (const b of deltas) low = Math.min(low, b)
  const start = round2(250 - low + 1840.17)
  return deltas.map((b) => round2(start + b))
}

type Writer = (rows: Entry[], acct: DemoAccount, todayIso: string) => string[][]

const WRITERS: Record<BankFormatId, Writer> = {
  'chase-checking': (rows) => {
    const balances = runningBalances(rows)
    return rows.map((e, i) => {
      const description = /^Zelle payment (to|from) /.test(e.description)
        ? `${e.description} ${e.amount < 0 ? 'JPM99' : 'ALB0K'}${code(`${e.date}|${e.description}`, e.amount < 0 ? 6 : 7)}`
        : e.description
      return [
        e.amount < 0 ? 'DEBIT' : 'CREDIT',
        mdy(e.date),
        description,
        money(e.amount),
        e.type ?? (e.amount < 0 ? 'ACH_DEBIT' : 'ACH_CREDIT'),
        money(balances[i]),
        '',
      ]
    })
  },
  'chase-card': (rows, _acct, todayIso) =>
    rows.map((e) => [
      mdy(e.date),
      mdy(postDate(e.date, `${e.date}|${e.description}|post`, todayIso)),
      e.description,
      e.category ?? '',
      e.type ?? (e.amount > 0 ? 'Return' : 'Sale'),
      money(e.amount),
      '',
    ]),
  ally: (rows) =>
    rows.map((e) => {
      const seed = `${e.date}|${e.description}|time`
      const time = `${pad(Math.floor(rand(seed) * 24))}:${pad(Math.floor(rand(`${seed}m`) * 60))}:${pad(Math.floor(rand(`${seed}s`) * 60))}`
      return [e.date, time, money(e.amount), e.amount < 0 ? 'Withdrawal' : 'Deposit', e.description]
    }),
  'bofa-card': (rows) =>
    rows.map((e) => [
      mdy(e.date),
      code(`${e.date}|${e.description}|ref`, 23, '0123456789'),
      e.description,
      e.amount > 0 ? '' : 'HOUSTON TX',
      money(e.amount),
    ]),
  citi: (rows) =>
    rows.map((e) => [
      'Cleared',
      mdy(e.date),
      e.description,
      e.amount < 0 ? money(-e.amount) : '',
      e.amount > 0 ? money(-e.amount) : '',
    ]),
  // Amex writes purchases as positive numbers — the reason its format flips signs.
  amex: (rows, acct) => rows.map((e) => [mdy(e.date), e.description, 'JORDAN AVERY', `-4${acct.mask}`, money(-e.amount)]),
  'capital-one': (rows, acct, todayIso) =>
    rows.map((e) => [
      e.date,
      postDate(e.date, `${e.date}|${e.description}|post`, todayIso),
      acct.mask,
      e.description,
      e.category ?? '',
      e.amount < 0 ? money(-e.amount) : '',
      e.amount > 0 ? money(e.amount) : '',
    ]),
  discover: (rows, _acct, todayIso) =>
    rows.map((e) => [mdy(e.date), mdy(postDate(e.date, `${e.date}|post`, todayIso)), e.description, money(-e.amount), e.category ?? '']),
}

/** One account's rows as its bank would write them, newest first like every download. */
function accountCells(accountId: string, now: Date): string[][] {
  const acct = ACCOUNTS.get(accountId)
  if (!acct) throw new Error(`Unknown demo account: ${accountId}`)
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate())
  const rows = buildLedger(now).get(accountId)!
  return WRITERS[acct.format](rows, acct, todayIso).reverse()
}

/** The CSV file this account's bank would let you download. */
export function demoCsv(accountId: string, now: Date = new Date()): string {
  const acct = ACCOUNTS.get(accountId)!
  return formatCsv(BANK_FORMATS[acct.format], accountCells(accountId, now))
}

/** A download name like "chase-sapphire-preferred-4417.csv". */
export function demoCsvFileName(accountId: string): string {
  const acct = ACCOUNTS.get(accountId)!
  const slug = `${acct.institutionId}-${acct.name}-${acct.mask}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${slug}.csv`
}

/**
 * "Fetch" a demo account: its bank-format rows through the ordinary CSV
 * importer, exactly as if the file had been uploaded.
 */
export function demoImport(accountId: string, sourceId: string, now: Date = new Date()): ImportResult {
  const acct = ACCOUNTS.get(accountId)
  if (!acct) throw new Error(`Unknown demo account: ${accountId}`)
  const format = BANK_FORMATS[acct.format]
  const rows = accountCells(accountId, now).map((cells) => cellsToRow(format, cells))
  return rowsToTransactions(rows, formatMapping(format), { sourceId })
}
