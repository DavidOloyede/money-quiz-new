import type { Category, ColumnMapping, CsvRow, Transaction } from '../types'
import { CATEGORIES } from '../types'
import { parseAmount, parseDate } from './parse'
import { categorize } from './categorize'
import { newId } from './storage'

/** Best-effort match of a free-text category cell to one of our categories. */
function coerceCategory(value: string | undefined): Category | null {
  if (!value) return null
  const s = value.trim().toLowerCase()
  if (!s) return null
  const direct = CATEGORIES.find((c) => c === s)
  if (direct) return direct
  // loose contains match (e.g. "Restaurants" -> dining is handled by keywords instead)
  const partial = CATEGORIES.find((c) => s.includes(c) || c.includes(s))
  return partial ?? null
}

export interface ImportResult {
  transactions: Transaction[]
  skipped: number
  total: number
}

/** Apply a column mapping to raw CSV rows, producing normalized transactions. */
export function rowsToTransactions(rows: CsvRow[], m: ColumnMapping): ImportResult {
  const out: Transaction[] = []
  let skipped = 0

  for (const row of rows) {
    const date = m.date ? parseDate(row[m.date] ?? '') : null
    const description = (m.description ? row[m.description] : '')?.trim() ?? ''

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

    const category =
      coerceCategory(m.category ? row[m.category] : undefined) ??
      categorize(description, amount)

    out.push({ id: newId(), date, description, amount, category })
  }

  return { transactions: out, skipped, total: rows.length }
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
  const category = findHeader(headers, [/category/i, /\btype\b/i])

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
  }
}

/** True when a remembered mapping still lines up with the current file's headers. */
export function mappingFitsHeaders(m: ColumnMapping, headers: string[]): boolean {
  const has = (c?: string) => !c || headers.includes(c)
  if (!headers.includes(m.date) || !headers.includes(m.description)) return false
  if (m.amountMode === 'single') return !!m.amount && headers.includes(m.amount)
  return has(m.debit) && has(m.credit) && (!!m.debit || !!m.credit)
}
