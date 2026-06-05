import type { AccountType, Category, ColumnMapping, CsvRow, Transaction } from '../types'
import { CATEGORIES } from '../types'
import { parseAmount, parseDate } from './parse'
import { categorize } from './categorize'
import { newId } from './storage'

/**
 * Map a free-text category cell from a bank export onto one of our categories.
 * Banks label things like "Food & Drink", "Bills & Utilities" or
 * "Health & Wellness", which don't match our ids verbatim — so a row the bank
 * already classified used to fall through to "other". This keeps those labels.
 */
const BANK_CATEGORY_PATTERNS: { match: RegExp; category: Category }[] = [
  { match: /grocer|supermarket/, category: 'groceries' },
  { match: /food|dining|restaurant|drink|meal/, category: 'dining' },
  { match: /gas|fuel|automotive|\bauto\b|transport|travel|airline|rideshare|toll|parking/, category: 'transport' },
  { match: /rent|mortgage|housing/, category: 'rent' },
  { match: /bill|utilit|phone|internet|cable|wireless/, category: 'utilities' },
  { match: /health|wellness|medical|pharmac|fitness|gym|drug/, category: 'health' },
  { match: /entertain|movie|stream|music|game|hobby/, category: 'entertainment' },
  { match: /shop|merchandise|retail|department|clothing|apparel/, category: 'shopping' },
  { match: /payroll|salary|paycheck|income|interest/, category: 'income' },
  { match: /transfer|withdrawal|fee/, category: 'transfers' },
]

/** Best-effort match of a free-text category cell to one of our categories. */
function coerceCategory(value: string | undefined): Category | null {
  if (!value) return null
  const s = value.trim().toLowerCase()
  if (!s) return null
  const direct = CATEGORIES.find((c) => c === s)
  if (direct) return direct
  for (const { match, category } of BANK_CATEGORY_PATTERNS) {
    if (match.test(s)) return category
  }
  return null
}

/** Decode the handful of HTML entities that show up in bank exports. */
function cleanDescription(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Credit-card "payments" (paying down the balance from a checking account) show
 * up on the card statement as money in. They double-count spending that the
 * checking account already records, so we drop them when importing a card.
 */
const PAYMENT_RE =
  /payment thank you|online payment|payment from chk|auto ?pay|automatic payment|e-?payment|card payment|payment - thank you|pymt thank|web payment|mobile payment/i

export function isCardPayment(description: string, amount: number): boolean {
  return amount > 0 && PAYMENT_RE.test(description)
}

export interface ImportResult {
  transactions: Transaction[]
  skipped: number
  total: number
  /** card-payment rows that were intentionally removed (credit accounts) */
  droppedPayments: number
}

export interface ImportOptions {
  /** stamped onto every produced transaction so the source can be removed later */
  sourceId?: string
}

/** Apply a column mapping to raw CSV rows, producing normalized transactions. */
export function rowsToTransactions(
  rows: CsvRow[],
  m: ColumnMapping,
  opts: ImportOptions = {},
): ImportResult {
  const out: Transaction[] = []
  let skipped = 0
  let droppedPayments = 0
  const isCredit = m.accountType === 'credit'

  for (const row of rows) {
    const date = m.date ? parseDate(row[m.date] ?? '') : null
    const description = cleanDescription((m.description ? row[m.description] : '') ?? '')

    let amount = NaN
    if (m.amountMode === 'single' && m.amount) {
      amount = parseAmount(row[m.amount] ?? '')
      if (m.invertAmount && Number.isFinite(amount)) amount = -amount
    } else if (m.amountMode === 'debitCredit') {
      const debit = m.debit ? parseAmount(row[m.debit] ?? '') : NaN
      const credit = m.credit ? parseAmount(row[m.credit] ?? '') : NaN
      const d = Number.isFinite(debit) ? Math.abs(debit) : 0
      const c = Number.isFinite(credit) ? Math.abs(credit) : 0
      amount = d === 0 && c === 0 ? NaN : c - d
    }

    if (!date || !description || !Number.isFinite(amount)) {
      skipped++
      continue
    }

    // On a credit card, drop the payments that settle the balance — they're
    // already represented as money leaving the checking account.
    if (isCredit && isCardPayment(description, amount)) {
      droppedPayments++
      continue
    }

    const category =
      coerceCategory(m.category ? row[m.category] : undefined) ??
      categorize(description, amount)

    out.push({ id: newId(), date, description, amount, category, sourceId: opts.sourceId })
  }

  return { transactions: out, skipped, total: rows.length, droppedPayments }
}

function findHeader(headers: string[], patterns: RegExp[], exclude?: RegExp): string {
  for (const p of patterns) {
    const hit = headers.find((h) => p.test(h) && (!exclude || !exclude.test(h)))
    if (hit) return hit
  }
  return ''
}

/** Guess a sensible default mapping from the header names. */
export function guessMapping(headers: string[]): ColumnMapping {
  const date = findHeader(headers, [/date/i, /posted/i])
  const description = findHeader(
    headers,
    [/description/i, /\bmemo\b/i, /payee/i, /\bname\b/i, /narration/i, /detail/i],
    /date/i,
  )
  const amount = findHeader(headers, [/^amount$/i, /amount/i, /\bamt\b/i, /value/i])
  const debit = findHeader(headers, [/debit/i, /withdrawal/i, /paid out/i])
  const credit = findHeader(headers, [/credit/i, /deposit/i, /paid in/i])
  // Only treat a column named "category" as the category — a "Type" column is
  // usually debit/credit/sale, which would mislabel everything.
  const category = findHeader(headers, [/categor/i])

  const amountMode: ColumnMapping['amountMode'] =
    amount || !(debit && credit) ? 'single' : 'debitCredit'

  return {
    date,
    description,
    amountMode,
    amount: amount || undefined,
    debit: debit || undefined,
    credit: credit || undefined,
    category: category || undefined,
    invertAmount: false,
    accountType: 'bank',
  }
}

/**
 * Guess whether a file is a bank/checking export or a credit-card statement.
 * A running "Balance" column means bank; credit-card payment markers in the
 * descriptions (or the Chase-style Category+Memo signature) mean credit.
 */
export function guessAccountType(headers: string[], rows: CsvRow[]): AccountType {
  const head = headers.join(' ').toLowerCase()
  if (/balance/.test(head)) return 'bank'

  const descCol = guessMapping(headers).description
  const sample = rows.slice(0, 80)
  const text = sample
    .map((r) => (descCol ? r[descCol] : Object.values(r).join(' ')) ?? '')
    .join(' \n ')
  if (PAYMENT_RE.test(text)) return 'credit'
  if (/categor/.test(head) && /memo/.test(head)) return 'credit'
  return 'bank'
}

/** True when a remembered mapping still lines up with the current file's headers. */
export function mappingFitsHeaders(m: ColumnMapping, headers: string[]): boolean {
  const has = (c?: string) => !c || headers.includes(c)
  if (!headers.includes(m.date) || !headers.includes(m.description)) return false
  if (m.amountMode === 'single') return !!m.amount && headers.includes(m.amount)
  return has(m.debit) && has(m.credit) && (!!m.debit || !!m.credit)
}
