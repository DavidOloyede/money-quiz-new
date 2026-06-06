import type { Transaction } from '../types'
import { categoryLabel } from './categories'
import {
  headlineStats,
  monthsPresent,
  recurringPayments,
  spendingByCategory,
  topExpenses,
} from './analysis'
import { formatCurrency } from './format'

/** Trigger a client-side download of text content. */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export function transactionsToCsv(
  transactions: Transaction[],
  sourceName: (id?: string) => string,
): string {
  const lines = ['Date,Description,Amount,Category,Source']
  for (const t of transactions) {
    lines.push(
      [
        t.date,
        csvCell(t.description),
        t.amount.toFixed(2),
        csvCell(categoryLabel(t.category)),
        csvCell(sourceName(t.sourceId)),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function transactionsToJson(transactions: Transaction[]): string {
  return JSON.stringify(transactions, null, 2)
}

/** A plain-text / markdown summary of the whole dataset. */
export function buildReport(transactions: Transaction[]): string {
  const s = headlineStats(transactions)
  const cats = spendingByCategory(transactions)
  const rec = recurringPayments(transactions)
  const top = topExpenses(transactions, 5)
  const months = monthsPresent(transactions)
  const L: string[] = []
  L.push('Money Quiz — Summary report')
  L.push('='.repeat(32))
  L.push(`Generated: ${new Date().toLocaleString()}`)
  if (months.length) L.push(`Period:    ${months[0]} to ${months[months.length - 1]}`)
  L.push('')
  L.push('Totals (excluding transfers & Zelle)')
  L.push(`  Income:       ${formatCurrency(s.totalIncome)}`)
  L.push(`  Spending:     ${formatCurrency(s.totalSpending)}`)
  L.push(`  Net:          ${formatCurrency(s.net)}`)
  L.push(`  Transactions: ${s.count}`)
  L.push('')
  L.push('Spending by category')
  for (const c of cats) L.push(`  ${categoryLabel(c.category).padEnd(18)} ${formatCurrency(c.total)} (${c.count})`)
  L.push('')
  L.push('Top expenses')
  for (const e of top) L.push(`  ${formatCurrency(e.amount).padStart(12)}  ${e.description}`)
  if (rec.length) {
    L.push('')
    L.push('Recurring payments')
    for (const r of rec.slice(0, 10)) L.push(`  ${r.merchant.padEnd(24)} ~${formatCurrency(r.monthlyEstimate)}/mo`)
  }
  return L.join('\n')
}

/** Open a printable window with the report text and trigger the print dialog. */
export function printReport(text: string) {
  const w = window.open('', '_blank')
  if (!w) return
  const escaped = text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
  w.document.write(
    `<!doctype html><title>Money Quiz report</title>` +
      `<pre style="font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;padding:32px;color:#0f172a">${escaped}</pre>`,
  )
  w.document.close()
  w.focus()
  w.print()
}
