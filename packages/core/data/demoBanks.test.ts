import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import type { CsvRow, Transaction } from '../types'
import {
  DEMO_INSTITUTIONS,
  DEMO_OWNER_NAMES,
  demoAccount,
  demoCsv,
  demoCsvFileName,
  demoImport,
} from './demoBanks'
import { detectBankFormat } from '../lib/bankFormats'
import { rowsToTransactions } from '../lib/importCsv'
import { isSelfTransfer } from '../lib/owner'
import { autoDetectLinks } from '../lib/links'
import { assignTxKeys } from '../lib/txKey'
import { monthKey, recurringTransfers } from '../lib/analysis'

// A fixed "now", mid-month, so the current month is partial like a real export.
const NOW = new Date(2026, 8, 22) // 22 Sep 2026
const ACCOUNTS = DEMO_INSTITUTIONS.flatMap((i) => i.accounts)
const imported = new Map(ACCOUNTS.map((a) => [a.id, demoImport(a.id, a.id, NOW)]))
const tx = (id: string): Transaction[] => imported.get(id)!.transactions
const all = [...imported.values()].flatMap((r) => r.transactions)
const strip = (rows: Transaction[]) => rows.map(({ id, ...rest }) => rest)

describe('the catalog', () => {
  it('gives every institution at least one account, with unique ids', () => {
    expect(DEMO_INSTITUTIONS.every((i) => i.accounts.length > 0)).toBe(true)
    expect(new Set(ACCOUNTS.map((a) => a.id)).size).toBe(ACCOUNTS.length)
    expect(demoAccount('demo-chase-checking')?.institutionId).toBe('chase')
  })

  it('names download files after the bank and account', () => {
    expect(demoCsvFileName('demo-chase-sapphire')).toBe('chase-sapphire-preferred-4417.csv')
  })
})

describe('each account', () => {
  it.each(ACCOUNTS)('$name ($mask) has a year of clean rows', (a) => {
    const r = imported.get(a.id)!
    expect(r.skipped).toBe(0)
    expect(r.transactions.length).toBeGreaterThan(20)
    expect(new Set(r.transactions.map((t) => monthKey(t.date))).size).toBe(12)
    expect(r.transactions.every((t) => t.date <= '2026-09-22')).toBe(true)
    expect(r.transactions.every((t) => t.sourceId === a.id)).toBe(true)
  })

  it.each(ACCOUNTS)('$name is the same every time for a given day', (a) => {
    expect(strip(demoImport(a.id, a.id, NOW).transactions)).toEqual(strip(tx(a.id)))
    expect(demoCsv(a.id, NOW)).toBe(demoCsv(a.id, NOW))
  })

  it.each(ACCOUNTS)('$name’s download re-imports through the upload path unchanged', (a) => {
    // Exactly what the Import screen does with a dropped file.
    const res = Papa.parse<CsvRow>(demoCsv(a.id, NOW), { header: true, skipEmptyLines: 'greedy' })
    const headers = (res.meta.fields ?? []).filter((f) => f.trim() !== '')
    const hit = detectBankFormat(headers)
    expect(hit?.format.id).toBe(a.format)
    const again = rowsToTransactions(res.data, hit!.mapping, { sourceId: a.id })
    expect(strip(again.transactions)).toEqual(strip(tx(a.id)))
  })

  it.each(ACCOUNTS.filter((a) => a.accountType === 'credit'))(
    '$name drops its own payment rows on import',
    (a) => {
      expect(imported.get(a.id)!.droppedPayments).toBeGreaterThanOrEqual(11)
      expect(tx(a.id).some((t) => /THANK YOU|AUTOPAY PYMT/i.test(t.description))).toBe(false)
    },
  )
})

describe('the accounts agree with each other', () => {
  it('pays every card from checking, as a transfer rather than spending', () => {
    const payoffs = tx('demo-chase-checking').filter((t) => /card|CITICTP|EPAYMENT|AUTOPAY/i.test(t.description))
    expect(payoffs.length).toBeGreaterThanOrEqual(55)
    expect(payoffs.every((t) => t.category === 'transfers')).toBe(true)
  })

  it('shows money moved to savings on both sides, as the owner’s own transfer', () => {
    const toSavings = tx('demo-chase-checking').filter((t) => /Zelle payment to Jordan Avery/.test(t.description))
    const intoSavings = tx('demo-ally-savings').filter((t) => /from JORDAN AVERY to Jordan Avery/.test(t.description))
    expect(toSavings.length).toBe(intoSavings.length)
    expect([...toSavings, ...intoSavings].every((t) => isSelfTransfer(t.description, DEMO_OWNER_NAMES))).toBe(true)
  })

  it('keeps checking above $250 all year', () => {
    const lines = demoCsv('demo-chase-checking', NOW).trim().split('\n').slice(1)
    const balances = lines.map((l) => Number(l.split(',').at(-3)))
    expect(Math.min(...balances)).toBeGreaterThanOrEqual(250)
  })
})

describe('what the dashboard gets to show', () => {
  const count = (re: RegExp) => all.filter((t) => re.test(t.description)).length

  it('lands the headline rows in the right categories', () => {
    const cat = (re: RegExp) => new Set(all.filter((t) => re.test(t.description)).map((t) => t.category))
    expect(cat(/PAYROLL/)).toEqual(new Set(['income']))
    expect(cat(/CEDARBROOK MTG/)).toEqual(new Set(['rent']))
    expect(cat(/STARBUCKS/)).toEqual(new Set(['dining']))
    expect(cat(/NORTHSIDE GROCERY/)).toEqual(new Set(['groceries']))
    expect(cat(/TITHE/)).toEqual(new Set(['tithes']))
    expect(cat(/Interest Paid/)).toEqual(new Set(['income']))
  })

  it('has a frequent merchant and one clear largest purchase', () => {
    expect(count(/STARBUCKS/)).toBeGreaterThan(40)
    const spending = all.filter((t) => t.amount < 0 && t.category !== 'transfers' && t.category !== 'rent')
    expect(spending.sort((a, b) => a.amount - b.amount)[0].description).toMatch(/VOLTIC/)
  })

  it('spots the Citi payment plan without being told', () => {
    // The store stamps each row's stable key before linking; do the same.
    const rows = tx('demo-citi-double')
    const keys = assignTxKeys(rows)
    const links = autoDetectLinks(rows.map((t) => ({ ...t, key: keys.get(t.id) })))
    expect(Object.keys(links)).toHaveLength(1)
  })

  it('finds the monthly Zelle for the phone plan despite Chase’s reference codes', () => {
    const phone = recurringTransfers(tx('demo-chase-checking')).find((r) => /Priya/i.test(r.label))
    expect(phone?.amount).toBe(85)
  })
})
