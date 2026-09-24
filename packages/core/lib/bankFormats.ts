/**
 * The CSV layouts real banks export, so a file from one of them can be read
 * without asking "which column is the amount?" — and so the demo bank
 * connections can write files a real bank would hand you.
 *
 * Each bank has quirks the generic guesser can't see from the headers alone:
 * American Express and Discover write purchases as POSITIVE numbers (the
 * guesser would read every one as income), Ally puts a space in front of every
 * header but the first, Chase checking ends each row with a stray comma, and
 * Citi splits money into Debit/Credit columns with the credits written negative.
 *
 * A layout is recognised by its exact header row (case and surrounding spaces
 * ignored), which is specific enough that two banks never collide.
 */
import type { AccountType, ColumnMapping, CsvRow } from '../types'

export type BankFormatId =
  | 'chase-checking'
  | 'chase-card'
  | 'ally'
  | 'bofa-card'
  | 'citi'
  | 'amex'
  | 'capital-one'
  | 'discover'

export interface BankFormat {
  id: BankFormatId
  /** Shown as "Recognised: {label}". */
  label: string
  accountType: AccountType
  /** The header row exactly as the bank writes it. */
  headers: string[]
  /** Column mapping in terms of `headers`. */
  mapping: Omit<ColumnMapping, 'accountType'>
  /** Chase checking ends every data row with an extra, unnamed empty field. */
  trailingComma?: boolean
}

export const BANK_FORMATS: Record<BankFormatId, BankFormat> = {
  'chase-checking': {
    id: 'chase-checking',
    label: 'Chase checking export',
    accountType: 'bank',
    headers: ['Details', 'Posting Date', 'Description', 'Amount', 'Type', 'Balance', 'Check or Slip #'],
    mapping: { date: 'Posting Date', description: 'Description', amountMode: 'single', amount: 'Amount' },
    trailingComma: true,
  },
  'chase-card': {
    id: 'chase-card',
    label: 'Chase credit card export',
    accountType: 'credit',
    headers: ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount', 'Memo'],
    mapping: {
      date: 'Transaction Date',
      description: 'Description',
      amountMode: 'single',
      amount: 'Amount',
      category: 'Category',
    },
  },
  ally: {
    id: 'ally',
    label: 'Ally Bank export',
    accountType: 'bank',
    headers: ['Date', ' Time', ' Amount', ' Type', ' Description'],
    mapping: { date: 'Date', description: ' Description', amountMode: 'single', amount: ' Amount' },
  },
  'bofa-card': {
    id: 'bofa-card',
    label: 'Bank of America credit card export',
    accountType: 'credit',
    headers: ['Posted Date', 'Reference Number', 'Payee', 'Address', 'Amount'],
    mapping: { date: 'Posted Date', description: 'Payee', amountMode: 'single', amount: 'Amount' },
  },
  citi: {
    id: 'citi',
    label: 'Citi credit card export',
    accountType: 'credit',
    headers: ['Status', 'Date', 'Description', 'Debit', 'Credit'],
    mapping: {
      date: 'Date',
      description: 'Description',
      amountMode: 'debitCredit',
      debit: 'Debit',
      credit: 'Credit',
    },
  },
  amex: {
    id: 'amex',
    label: 'American Express export',
    accountType: 'credit',
    headers: ['Date', 'Description', 'Card Member', 'Account #', 'Amount'],
    mapping: {
      date: 'Date',
      description: 'Description',
      amountMode: 'single',
      amount: 'Amount',
      invertAmount: true,
    },
  },
  'capital-one': {
    id: 'capital-one',
    label: 'Capital One credit card export',
    accountType: 'credit',
    headers: ['Transaction Date', 'Posted Date', 'Card No.', 'Description', 'Category', 'Debit', 'Credit'],
    mapping: {
      date: 'Transaction Date',
      description: 'Description',
      amountMode: 'debitCredit',
      debit: 'Debit',
      credit: 'Credit',
      category: 'Category',
    },
  },
  discover: {
    id: 'discover',
    label: 'Discover card export',
    accountType: 'credit',
    headers: ['Trans. Date', 'Post Date', 'Description', 'Amount', 'Category'],
    mapping: {
      date: 'Trans. Date',
      description: 'Description',
      amountMode: 'single',
      amount: 'Amount',
      category: 'Category',
      invertAmount: true,
    },
  },
}

const norm = (h: string) => h.trim().toLowerCase()

export interface DetectedFormat {
  format: BankFormat
  /** The format's mapping, re-pointed at this file's own header spellings. */
  mapping: ColumnMapping
}

/** Which bank wrote this file, judged by its header row — or null. */
export function detectBankFormat(headers: string[]): DetectedFormat | null {
  const present = headers.filter((h) => h.trim() !== '')
  const byNorm = new Map(present.map((h) => [norm(h), h]))
  for (const format of Object.values(BANK_FORMATS)) {
    if (format.headers.length !== byNorm.size) continue
    if (!format.headers.every((h) => byNorm.has(norm(h)))) continue
    // A file saved through a spreadsheet may have lost Ally's leading spaces,
    // so map by meaning and hand back the spelling this file actually uses.
    const actual = (h?: string) => (h === undefined ? undefined : byNorm.get(norm(h)))
    const m = format.mapping
    return {
      format,
      mapping: {
        ...m,
        date: actual(m.date)!,
        description: actual(m.description)!,
        amount: actual(m.amount),
        debit: actual(m.debit),
        credit: actual(m.credit),
        category: actual(m.category),
        invertAmount: m.invertAmount ?? false,
        accountType: format.accountType,
      },
    }
  }
  return null
}

/** The format's mapping as a complete ColumnMapping. */
export function formatMapping(format: BankFormat): ColumnMapping {
  return { invertAmount: false, ...format.mapping, accountType: format.accountType }
}

/** Key one row of cells by the format's headers, as a CSV parser would. */
export function cellsToRow(format: BankFormat, cells: string[]): CsvRow {
  const row: CsvRow = {}
  format.headers.forEach((h, i) => {
    row[h] = cells[i] ?? ''
  })
  return row
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** CSV text for rows of cells, with the bank's own header row and quirks. */
export function formatCsv(format: BankFormat, rows: string[][]): string {
  const tail = format.trailingComma ? ',' : ''
  const lines = [format.headers.map(csvCell).join(',')]
  for (const cells of rows) lines.push(cells.map(csvCell).join(',') + tail)
  return lines.join('\n') + '\n'
}
