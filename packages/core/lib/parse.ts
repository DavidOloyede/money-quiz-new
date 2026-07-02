/**
 * Flexible parsing helpers for messy bank CSV data: dates in several formats
 * and amounts with currency symbols, commas, or accountant-style parentheses.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function normalizeYear(y: number): number {
  if (y >= 100) return y
  // Two-digit year: assume 2000s for recent finance data.
  return y <= 69 ? 2000 + y : 1900 + y
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/**
 * Parse a date string into ISO YYYY-MM-DD, or null if unrecognized.
 * Handles YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY, and falls back to
 * Date parsing for written forms like "Apr 3, 2026". When the day clearly
 * can't be a month (>12) the M/D order is auto-corrected to D/M.
 */
export function parseDate(input: string): string | null {
  if (!input) return null
  const s = input.trim()
  if (!s) return null

  // ISO: 2026-04-03 (or 2026/04/03)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (isValidYmd(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`
    return null
  }

  // US-style: 04/03/2026, 4-3-26, 04.03.2026 (month first by default)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    let a = Number(m[1]) // assumed month
    let b = Number(m[2]) // assumed day
    const y = normalizeYear(Number(m[3]))
    // If the "month" is impossible but the "day" works as a month, swap.
    if (a > 12 && b <= 12) {
      ;[a, b] = [b, a]
    }
    if (isValidYmd(y, a, b)) return `${y}-${pad(a)}-${pad(b)}`
    return null
  }

  // Fallback: let the engine try written dates ("April 3, 2026", "3 Apr 2026").
  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const dt = new Date(t)
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  }

  return null
}

/**
 * Parse a monetary string into a number. Strips $ and thousands separators,
 * treats (123.45) and trailing CR/DR appropriately, and returns NaN when empty
 * or unparseable.
 */
export function parseAmount(input: string): number {
  if (input == null) return NaN
  let s = String(input).trim()
  if (!s) return NaN

  let negative = false

  // Accountant-style negatives: (123.45)
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }

  // Trailing/leading credit-debit markers
  if (/(^|\s)dr$/i.test(s) || /^-?dr/i.test(s)) negative = true
  s = s.replace(/\b(cr|dr)\b/gi, '').trim()

  // Leading minus
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }
  if (s.startsWith('+')) s = s.slice(1)

  // Strip currency symbols, commas, spaces
  s = s.replace(/[$£€¥]/g, '').replace(/,/g, '').replace(/\s/g, '')

  if (!s) return NaN
  const n = Number(s)
  if (!Number.isFinite(n)) return NaN
  return negative ? -Math.abs(n) : n
}
