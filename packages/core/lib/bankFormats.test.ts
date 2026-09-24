import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import type { CsvRow } from '../types'
import { BANK_FORMATS, cellsToRow, detectBankFormat, formatCsv, formatMapping } from './bankFormats'
import { rowsToTransactions } from './importCsv'

/** Parse CSV text the way the Import screen does. */
function parse(text: string): { headers: string[]; rows: CsvRow[] } {
  const res = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: 'greedy' })
  return { headers: (res.meta.fields ?? []).filter((f) => f.trim() !== ''), rows: res.data }
}

describe('detectBankFormat', () => {
  it.each(Object.values(BANK_FORMATS))('recognises $label by its header row', (format) => {
    const hit = detectBankFormat(format.headers)
    expect(hit?.format.id).toBe(format.id)
    expect(hit?.mapping.accountType).toBe(format.accountType)
  })

  it('ignores case and stray spaces, and answers in the file’s own spelling', () => {
    // Ally's leading spaces are lost when a file goes through a spreadsheet.
    const hit = detectBankFormat(['DATE', 'Time', 'Amount', 'Type', 'Description'])
    expect(hit?.format.id).toBe('ally')
    expect(hit?.mapping.amount).toBe('Amount')
    expect(hit?.mapping.description).toBe('Description')
  })

  it('leaves unfamiliar files to the ordinary guesser', () => {
    expect(detectBankFormat(['Date', 'Description', 'Amount'])).toBeNull()
    // One column short of Chase's card layout is not Chase's card layout.
    expect(detectBankFormat(['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount'])).toBeNull()
  })

  it('does not count the empty column a trailing comma makes', () => {
    expect(detectBankFormat([...BANK_FORMATS['chase-checking'].headers, ''])?.format.id).toBe('chase-checking')
  })
})

describe('reading each layout', () => {
  it('flips Amex so purchases are money out and payments are dropped', () => {
    const f = BANK_FORMATS.amex
    const rows = [
      ['09/17/2026', 'TARGET 00018465 HOUSTON TX', 'JORDAN AVERY', '-41008', '55.44'],
      ['09/14/2026', 'AUTOPAY PAYMENT - THANK YOU', 'JORDAN AVERY', '-41008', '-336.97'],
      ['09/10/2026', 'TARGET 00018465 HOUSTON TX', 'JORDAN AVERY', '-41008', '-12.00'],
    ].map((c) => cellsToRow(f, c))
    const r = rowsToTransactions(rows, formatMapping(f))
    expect(r.transactions.map((t) => t.amount)).toEqual([-55.44, 12])
    expect(r.droppedPayments).toBe(1)
  })

  it('reads Citi’s negative credits as money in', () => {
    const f = BANK_FORMATS.citi
    const rows = [
      ['Cleared', '09/04/2026', 'NORTHSIDE GROCERY #212 HOUSTON TX', '', '-18.25'],
      ['Cleared', '09/03/2026', 'SHELL OIL 57442 HOUSTON TX', '41.80', ''],
    ].map((c) => cellsToRow(f, c))
    expect(rowsToTransactions(rows, formatMapping(f)).transactions.map((t) => t.amount)).toEqual([18.25, -41.8])
  })
})

describe('formatCsv', () => {
  it('writes files that parse back into the same rows', () => {
    const f = BANK_FORMATS.citi
    const cells = [['Cleared', '08/31/2026', 'ONLINE PAYMENT, THANK YOU', '', '-35.00']]
    const { headers, rows } = parse(formatCsv(f, cells))
    expect(headers).toEqual(f.headers)
    expect(rows).toEqual([cellsToRow(f, cells[0])])
  })

  it('keeps Chase checking’s trailing comma without breaking the import', () => {
    const f = BANK_FORMATS['chase-checking']
    const text = formatCsv(f, [['DEBIT', '09/15/2026', 'OWNWELL', '-25.01', 'DEBIT_CARD', '2699.28', '']])
    expect(text.split('\n')[1].endsWith(',,')).toBe(true)
    const { headers, rows } = parse(text)
    const hit = detectBankFormat(headers)!
    expect(rowsToTransactions(rows, hit.mapping).transactions[0].amount).toBe(-25.01)
  })

  it('keeps Ally’s leading spaces in the header row', () => {
    expect(formatCsv(BANK_FORMATS.ally, []).split('\n')[0]).toBe('Date, Time, Amount, Type, Description')
  })
})
