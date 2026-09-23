/**
 * The "Try with sample data" set: a fictional year of money for a made-up
 * person (Jordan Avery) so the whole app can be explored without uploading
 * anything real.
 *
 * Two things matter about how this is built:
 *
 * 1. **Dates are relative to "now"** — a rolling 12 months ending today, so
 *    "This month", "Last month", the daily question and the Year Sheet are
 *    never empty. (The old set had fixed spring-2026 dates, which went stale
 *    the moment the calendar moved past them.)
 * 2. **It is deterministic** — every amount and day comes from a hash of the
 *    row's own identity, never from Math.random(). For a given "now" the set
 *    is byte-identical each time, so the quiz, the tests and the downloadable
 *    CSVs are all reproducible.
 *
 * It spans three accounts and touches every built-in category, with the
 * patterns the app is built to notice: a frequent merchant, one clear largest
 * purchase, a big repeating bill, subscriptions (monthly, annual, and one that
 * ended), refunds, an installment-plan credit/charge pair, transfers and Zelle
 * in both directions, and one merchant name used for two different bills at
 * two different amounts.
 *
 * Everything here is invented. Never copy rows from a real statement into it.
 */
import type { AccountType, Transaction } from '../types'
import { categorize } from '../lib/categorize'
import { matchCategoryRule, type CategoryRule } from '../lib/categoryRules'
import { isCardPayment } from '../lib/importCsv'
import { newId } from '../lib/id'

/** The fictional account holder. Used for the self-transfer descriptors. */
export const SAMPLE_OWNER_NAMES = ['Jordan Avery', 'Avery Jordan']

/**
 * The sample user co-owns a duplex, so some of their money is on a different
 * ledger. These are the rules they'd have set up to gather it, and the sample
 * ships with them already applied — the rent they RECEIVE stays plain Income,
 * because Business / Rental is a spending category and money in would
 * otherwise read as a refund against it.
 *
 * "BRIGHTLINE ENERGY UNIT B" is deliberately more specific than the personal
 * power bill from the same company: it shows a narrow rule beating a broad one.
 */
export const SAMPLE_CATEGORY_RULES: CategoryRule[] = [
  { pattern: 'BRIGHTLINE ENERGY UNIT B', category: 'business' },
  { pattern: 'KEYSTONE LEASING', category: 'business' },
  { pattern: 'TURBOTENANT', category: 'business' },
  { pattern: 'OWNWELL', category: 'business' },
]

export interface SampleAccount {
  id: string
  name: string
  accountType: AccountType
}

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  { id: 'sample-checking', name: 'Sample Checking', accountType: 'bank' },
  { id: 'sample-savings', name: 'Sample Savings', accountType: 'bank' },
  { id: 'sample-credit', name: 'Sample Credit Card', accountType: 'credit' },
]

type AccountId = (typeof SAMPLE_ACCOUNTS)[number]['id']

interface RawRow {
  date: string
  description: string
  amount: number
  account: AccountId
}

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

/** FNV-1a → a stable 0..1 for a string. Same seed, same number, always. */
function rand(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** `base`, varied by up to ±spread (default 15%), deterministically. */
function vary(base: number, seed: string, spread = 0.15): number {
  return round2(base * (1 - spread + 2 * spread * rand(seed)))
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(Math.min(day, daysInMonth(year, month)))}`
}

/** The 12 months ending with the one `now` falls in, oldest first. */
function windowMonths(now: Date): { year: number; month: number; index: number }[] {
  const out: { year: number; month: number; index: number }[] = []
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth(), index: 11 - back })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* The catalog                                                         */
/* ------------------------------------------------------------------ */

/** A bill that lands every month on roughly the same day. */
interface MonthlyBill {
  description: string
  account: AccountId
  /** Negative for money out. */
  amount: number
  day: number
  /** 0 = same amount every month (a fixed bill); higher = variable. */
  spread?: number
  /** Only from this month index (0-11) onward. */
  from?: number
  /** Only up to and including this month index. */
  until?: number
}

const MONTHLY: MonthlyBill[] = [
  // --- Income -------------------------------------------------------
  { description: 'HARBOR POINT LABS PAYROLL', account: 'sample-checking', amount: 2465, day: 1, spread: 0.02 },
  { description: 'HARBOR POINT LABS PAYROLL', account: 'sample-checking', amount: 2465, day: 15, spread: 0.02 },
  { description: 'Interest Paid', account: 'sample-savings', amount: 11.4, day: 13, spread: 0.2 },

  // --- Home ---------------------------------------------------------
  // The big repeating bill: fills every slot of a "largest expenses" list
  // unless those are grouped by merchant.
  { description: 'CEDARBROOK MTG PYMTS', account: 'sample-checking', amount: -1845, day: 1, spread: 0 },
  // Same descriptor, two different bills, two different amounts — the case
  // that needs filtering by name + amount to sort out.
  { description: 'WILLOW BEND OWNERS ASSOCIATION', account: 'sample-checking', amount: -118, day: 3, spread: 0 },
  { description: 'BRIGHTLINE ENERGY', account: 'sample-checking', amount: -104.5, day: 12, spread: 0.3 },
  { description: 'CLEARWAVE INTERNET', account: 'sample-checking', amount: -79.99, day: 14, spread: 0 },
  { description: 'NORTHSTAR WIRELESS', account: 'sample-checking', amount: -85, day: 17, spread: 0 },
  { description: 'SENTINEL AUTO INSURANCE', account: 'sample-checking', amount: -142.3, day: 8, spread: 0 },
  { description: 'MERIDIAN STUDENT LOAN PAYMENT', account: 'sample-checking', amount: -312.6, day: 20, spread: 0 },

  // --- Giving -------------------------------------------------------
  { description: 'RIVERSTONE CHAPEL TITHE', account: 'sample-checking', amount: -492, day: 5, spread: 0.05 },

  // --- Subscriptions (one ends partway through, one starts late) -----
  { description: 'LUMEN NOTES SUBSCRIPTION', account: 'sample-credit', amount: -12, day: 6, spread: 0 },
  { description: 'PIXELFORGE SUBSCRIPTION', account: 'sample-credit', amount: -19.99, day: 11, spread: 0 },
  { description: 'ATLAS VPN SUBSCRIPTION', account: 'sample-credit', amount: -4.99, day: 24, spread: 0, until: 6 },
  { description: 'BEACON FITNESS SUBSCRIPTION', account: 'sample-credit', amount: -29, day: 19, spread: 0, from: 5 },

  // --- Transfers & Zelle --------------------------------------------
  { description: 'Online Transfer to SAV 4821', account: 'sample-checking', amount: -400, day: 2, spread: 0 },
  { description: 'Online Transfer from CHK 1092', account: 'sample-savings', amount: 400, day: 2, spread: 0 },
  { description: 'Payment to Sample Credit Card ending in 4417', account: 'sample-checking', amount: -620, day: 22, spread: 0.25 },
  { description: 'PAYMENT - THANK YOU', account: 'sample-credit', amount: 620, day: 22, spread: 0.25 },
  // A real bill hiding among the transfers: same amount, same day, every month.
  { description: 'Zelle payment to Priya Raman', account: 'sample-checking', amount: -85, day: 18, spread: 0 },
  // Money the sample user moves to themselves — the noise an owner-name rule
  // is meant to hide.
  { description: 'Zelle payment from JORDAN  AVERY', account: 'sample-checking', amount: 250, day: 26, spread: 0.3 },
  { description: 'Zelle payment to Avery Jordan', account: 'sample-savings', amount: -250, day: 26, spread: 0.3 },

  // --- Rental thread (a duplex the sample user co-owns) --------------
  { description: 'MAPLE COURT RENT:UNIT B', account: 'sample-checking', amount: 1450, day: 4, spread: 0 },
  { description: 'OWNWELL PROPERTY TAX SVC', account: 'sample-checking', amount: -28.1, day: 21, spread: 0 },
  { description: 'TURBOTENANT PLAN', account: 'sample-credit', amount: -59, day: 9, spread: 0 },
]

/** Everyday spending: N times a month on deterministic days. */
interface Habit {
  description: string
  account: AccountId
  amount: number
  /** How many times a month. */
  times: number
  spread?: number
}

const HABITS: Habit[] = [
  // The frequent merchant — the one the dashboard singles out.
  { description: 'CORNER COFFEE ROASTERS', account: 'sample-credit', amount: -6.4, times: 4, spread: 0.2 },
  { description: 'NORTHSIDE GROCERY CO', account: 'sample-credit', amount: -78.5, times: 3, spread: 0.25 },
  { description: 'GREENLEAF SUPERMARKET', account: 'sample-credit', amount: -41.2, times: 1, spread: 0.3 },
  { description: 'BASIL & BRICK PIZZA', account: 'sample-credit', amount: -24.8, times: 1, spread: 0.3 },
  { description: 'SOL TACO KITCHEN', account: 'sample-credit', amount: -16.75, times: 1, spread: 0.3 },
  { description: 'SUMMIT FUEL STOP', account: 'sample-credit', amount: -44.3, times: 2, spread: 0.25 },
  { description: 'CITY TRANSIT PAYGO', account: 'sample-credit', amount: -2.9, times: 2, spread: 0.1 },
  { description: 'RIVERMARK CLOTHING CO', account: 'sample-credit', amount: -63.4, times: 1, spread: 0.4 },
  { description: 'WELLSPRING PHARMACY', account: 'sample-credit', amount: -22.15, times: 1, spread: 0.3 },
]

/** One-off rows, placed by month index so the year has shape. */
interface OneOff {
  month: number
  day: number
  description: string
  account: AccountId
  amount: number
}

const ONE_OFFS: OneOff[] = [
  // Personal care, every other month.
  ...[0, 2, 4, 6, 8, 10].map((month) => ({
    month,
    day: 16,
    description: 'CLIPPER LANE BARBERSHOP',
    account: 'sample-credit' as AccountId,
    amount: -35,
  })),
  // Pets.
  { month: 1, day: 9, description: 'PAWPRINT VET CLINIC', account: 'sample-credit', amount: -186.4 },
  { month: 5, day: 23, description: 'WAGGLE PET SUPPLIES', account: 'sample-credit', amount: -54.2 },
  { month: 9, day: 12, description: 'PAWPRINT VET CLINIC', account: 'sample-credit', amount: -94 },
  // Health.
  { month: 2, day: 18, description: 'MAPLE FAMILY DENTAL', account: 'sample-credit', amount: -210 },
  { month: 8, day: 7, description: 'MAPLE FAMILY DENTAL', account: 'sample-credit', amount: -95 },
  // Education.
  { month: 3, day: 6, description: 'BRIGHTPATH TUITION CENTER', account: 'sample-credit', amount: -320 },
  { month: 9, day: 6, description: 'BRIGHTPATH TUITION CENTER', account: 'sample-credit', amount: -320 },
  // Entertainment.
  { month: 1, day: 21, description: 'STARLIGHT CINEMA', account: 'sample-credit', amount: -34.5 },
  { month: 4, day: 14, description: 'RIVERFRONT CONCERT HALL', account: 'sample-credit', amount: -128 },
  { month: 7, day: 27, description: 'STARLIGHT CINEMA', account: 'sample-credit', amount: -41.25 },
  { month: 10, day: 8, description: 'LAKESIDE SKATING RINK', account: 'sample-credit', amount: -27 },
  // Charity, beside the monthly tithe.
  { month: 2, day: 22, description: 'HOPE HARVEST FUND DONATION', account: 'sample-checking', amount: -75 },
  { month: 6, day: 11, description: 'CEDAR CITY RELIEF DONATION', account: 'sample-checking', amount: -120 },
  { month: 10, day: 19, description: 'HOPE HARVEST FUND DONATION', account: 'sample-checking', amount: -60 },
  // Fees.
  { month: 3, day: 28, description: 'MONTHLY MAINTENANCE FEE', account: 'sample-checking', amount: -12 },
  { month: 8, day: 2, description: 'FOREIGN TRANSACTION FEE', account: 'sample-credit', amount: -3.85 },
  // Cash out — lands in Other, because that is honestly all we know about it.
  { month: 4, day: 5, description: 'ATM WITHDRAWAL', account: 'sample-checking', amount: -200 },
  { month: 9, day: 17, description: 'ATM WITHDRAWAL', account: 'sample-checking', amount: -140 },
  // The one clear largest purchase of the year.
  { month: 6, day: 14, description: 'VOLTIC ELECTRONICS', account: 'sample-credit', amount: -1899 },
  // A store return, and a merchant credit: money in that should NOT read as
  // income — it nets against what it refunds.
  { month: 6, day: 29, description: 'RIVERMARK CLOTHING CO RETURN', account: 'sample-credit', amount: 63.4 },
  { month: 9, day: 4, description: 'NORTHSIDE GROCERY CO REFUND', account: 'sample-credit', amount: 18.25 },
  // An annual renewal.
  { month: 2, day: 13, description: 'SKYVAULT STORAGE SUBSCRIPTION', account: 'sample-credit', amount: -95.88 },
  // An installment plan: the purchase is moved onto a payment plan, which the
  // card reports as a credit plus an equal new charge. Only the original
  // purchase is real spending — the other two cancel out.
  { month: 8, day: 5, description: 'TIMBERLINE AUTO REPAIR', account: 'sample-credit', amount: -511.47 },
  { month: 8, day: 19, description: 'FLEX PAY CREDIT-TIMBERLINE AUTO REPAIR', account: 'sample-credit', amount: 511.47 },
  { month: 8, day: 19, description: 'FLEX PAY', account: 'sample-credit', amount: -511.47 },
  { month: 8, day: 19, description: 'PLAN FEE - FLEX PLAN', account: 'sample-credit', amount: -6.25 },
  // Zelle that needs a human decision: a contractor (an expense), a family
  // member sending money, and a friend settling up for a shared dinner.
  { month: 3, day: 11, description: 'Zelle payment to Marcus Ellison', account: 'sample-checking', amount: -450 },
  { month: 7, day: 24, description: 'Zelle payment to Marcus Ellison', account: 'sample-checking', amount: -275 },
  { month: 5, day: 8, description: 'Zelle payment from Renee Avery', account: 'sample-checking', amount: 300 },
  { month: 10, day: 3, description: 'Zelle payment from Dana Whitlock', account: 'sample-checking', amount: 42.5 },
  { month: 6, day: 20, description: 'Zelle payment from Dana Whitlock', account: 'sample-checking', amount: 61 },
  // Rental vacancy: the unit's own power bill and a letting agent's fee.
  { month: 4, day: 12, description: 'BRIGHTLINE ENERGY UNIT B', account: 'sample-checking', amount: -63.2 },
  { month: 5, day: 12, description: 'BRIGHTLINE ENERGY UNIT B', account: 'sample-checking', amount: -58.75 },
  { month: 4, day: 26, description: 'KEYSTONE LEASING FEE', account: 'sample-checking', amount: -725 },
  // The home-insurance half of the WILLOW BEND descriptor — same name as the
  // monthly dues, a very different amount and a very different bill.
  ...[1, 4, 7, 10].map((month) => ({
    month,
    day: 3,
    description: 'WILLOW BEND OWNERS ASSOCIATION',
    account: 'sample-checking' as AccountId,
    amount: -342.5,
  })),
]

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

function buildRows(now: Date): RawRow[] {
  const rows: RawRow[] = []
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate())
  const push = (date: string, description: string, amount: number, account: AccountId) => {
    // Never invent a transaction in the future — the current month is partial,
    // exactly as a real export would be.
    if (date <= todayIso) rows.push({ date, description, amount, account })
  }

  for (const { year, month, index } of windowMonths(now)) {
    for (const b of MONTHLY) {
      if (b.from !== undefined && index < b.from) continue
      if (b.until !== undefined && index > b.until) continue
      const seed = `${b.description}|${index}`
      const amount = b.spread === 0 ? b.amount : vary(b.amount, seed, b.spread ?? 0.15)
      push(iso(year, month, b.day), b.description, amount, b.account)
    }

    for (const h of HABITS) {
      for (let i = 0; i < h.times; i++) {
        const seed = `${h.description}|${index}|${i}`
        // Spread the visits across the month without ever colliding on day 1.
        const day = 2 + Math.floor(rand(`${seed}|day`) * 26)
        push(iso(year, month, day), h.description, vary(h.amount, seed, h.spread ?? 0.2), h.account)
      }
    }

    for (const o of ONE_OFFS) {
      if (o.month !== index) continue
      push(iso(year, month, o.day), o.description, o.amount, o.account)
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description))
}

/**
 * Build fresh Transaction objects (with ids + auto categories) from the sample.
 *
 * Card "payment - thank you" rows are left out here for the same reason import
 * drops them: the checking account already records that money leaving, and the
 * card statement already itemizes what it paid for. They stay in the
 * downloadable CSV so a re-import exercises that rule for real.
 */
export function loadSampleTransactions(now: Date = new Date()): Transaction[] {
  const byId = new Map(SAMPLE_ACCOUNTS.map((a) => [a.id, a]))
  return buildRows(now)
    .filter((r) => !(byId.get(r.account)?.accountType === 'credit' && isCardPayment(r.description, r.amount)))
    .map((r) => ({
      id: newId(),
      date: r.date,
      description: r.description,
      amount: r.amount,
      // The sample ships with its owner's rules already in force, so the
      // duplex costs arrive on the right ledger.
      category:
        matchCategoryRule(r.description, SAMPLE_CATEGORY_RULES) ??
        categorize(r.description, r.amount),
      sourceId: r.account,
    }))
}

/**
 * CSV text for one sample account, for the "Download sample CSV" links. Each
 * file re-imports cleanly through guessMapping on its own — that's why they're
 * separate files rather than one combined export no real bank would produce.
 */
export function sampleCsv(accountId: string, now: Date = new Date()): string {
  const header = 'Date,Description,Amount'
  const lines = buildRows(now)
    .filter((r) => r.account === accountId)
    .map((r) => `${r.date},"${r.description.replace(/"/g, '""')}",${r.amount.toFixed(2)}`)
  return [header, ...lines].join('\n')
}
