const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Standard USD formatting, e.g. -$1,234.56 */
export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return '$0.00'
  return usd.format(n)
}

/** Always-positive USD, handy for spending amounts. */
export function formatAbs(n: number): string {
  return usd.format(Math.abs(n))
}

/** Compact currency for chart axes, e.g. $1.2k */
export function formatCurrencyShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}

export function formatPercent(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '0%'
  return `${n.toFixed(digits)}%`
}

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** ISO YYYY-MM-DD -> "Apr 3, 2026" */
export function formatDate(iso: string): string {
  if (!iso) return ''
  return dateFmt.format(utcDate(iso))
}

const monthFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "YYYY-MM" -> "Apr 2026" */
export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return monthFmt.format(new Date(Date.UTC(y, (m ?? 1) - 1, 1)))
}
