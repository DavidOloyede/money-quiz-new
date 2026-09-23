/**
 * Linking one transaction to another, so a credit and the charge it reverses
 * stop being counted as two separate events.
 *
 * The case that forced this: moving a purchase onto a card's installment plan
 * produces THREE rows — the original charge, a credit undoing it, and an equal
 * new "plan" charge. Left alone the credit reads as income and the plan charge
 * reads as a second purchase, so one repair bill inflates income AND gets
 * counted twice. Linking the credit to the plan charge makes that pair cancel,
 * leaving the original purchase as the one real expense.
 *
 * Links are stored child -> parent (credit -> charge) by `txKey`, so several
 * partial repayments can point at one charge, and everything survives a
 * re-import. An empty parent is a tombstone: the user unlinked that row, and
 * auto-detection must not put it straight back.
 */
import type { Transaction, TxTreatment } from '../types'

/** child txKey -> parent txKey, or '' meaning "deliberately not linked". */
export type TxLinks = Record<string, string>

/** How far apart a plan credit and its replacement charge may sit. */
const PLAN_WINDOW_DAYS = 5

/**
 * Card installment plans. Issuers name them differently but all follow the
 * same shape: a "<plan> credit" undoing the purchase, plus a new "<plan>"
 * charge for the same amount within a few days.
 */
const PLAN_CREDIT_RE = /\b(flex pay|plan it|my chase plan|chase plan|pay over time)\b[^a-z0-9]*credit\b/i
const PLAN_CHARGE_RE = /\b(flex pay|plan it|my chase plan|chase plan|pay over time)\b/i

function dayGap(a: string, b: string): number {
  const ms = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`))
  return Math.round(ms / 86_400_000)
}

/** Cents, so two amounts that should match aren't separated by float noise. */
function cents(n: number): number {
  return Math.round(n * 100)
}

/**
 * Stamp every row's treatment and link partners. Pure, so the store can call
 * it while deriving the live list and the tests can check it directly.
 *
 * Precedence: an explicit treatment the user chose wins over everything. Below
 * that, a linked credit behaves as a refund of whatever its charge is filed
 * under — which is why this runs after category resolution, not before.
 */
export function resolveLinks(
  rows: Transaction[],
  treatments: Record<string, TxTreatment> = {},
  links: TxLinks = {},
): Transaction[] {
  const byKey = new Map<string, Transaction>()
  for (const t of rows) if (t.key) byKey.set(t.key, t)

  // Only links whose BOTH ends are present count — a partner can be missing
  // because its source was removed.
  const childrenOf = new Map<string, string[]>()
  for (const [child, parent] of Object.entries(links)) {
    if (!parent || !byKey.has(child) || !byKey.has(parent) || child === parent) continue
    const list = childrenOf.get(parent)
    if (list) list.push(child)
    else childrenOf.set(parent, [child])
  }

  return rows.map((t) => {
    const key = t.key
    if (!key) return t
    const explicit = treatments[key]
    const linkedFrom = childrenOf.get(key)
    const parentKey = links[key]
    const parent = parentKey && parentKey !== key ? byKey.get(parentKey) : undefined

    if (explicit && explicit !== 'normal') {
      return linkedFrom ? { ...t, treatment: explicit, linkedFrom } : { ...t, treatment: explicit }
    }
    if (parent) {
      // The credit takes on the charge's category, so the pair nets inside
      // whatever bucket the charge belongs to instead of landing in Income.
      const linked: Transaction = {
        ...t,
        treatment: 'reimbursement',
        category: parent.category,
        linkedTo: parentKey,
      }
      return linkedFrom ? { ...linked, linkedFrom } : linked
    }
    return linkedFrom ? { ...t, linkedFrom } : t
  })
}

export interface CandidateOptions {
  /** Widen past "same amount" — for a partial repayment of a bigger charge. */
  anyAmount?: boolean
  /** Free-text filter on the description. */
  query?: string
  limit?: number
}

/**
 * Transactions that could be `target`'s partner: opposite sign, nearest date
 * first, across every source. Same absolute amount unless widened.
 */
export function linkCandidates(
  rows: Transaction[],
  target: Transaction,
  opts: CandidateOptions = {},
): Transaction[] {
  const want = cents(target.amount)
  const q = opts.query?.trim().toLowerCase()
  return rows
    .filter((t) => {
      if (t.id === target.id || !t.key) return false
      // Opposite direction: a credit pairs with a charge, never another credit.
      if (Math.sign(t.amount) === Math.sign(target.amount) || t.amount === 0) return false
      if (!opts.anyAmount && cents(t.amount) !== -want) return false
      if (q && !t.description.toLowerCase().includes(q)) return false
      return true
    })
    .sort(
      (a, b) =>
        dayGap(a.date, target.date) - dayGap(b.date, target.date) ||
        b.date.localeCompare(a.date),
    )
    .slice(0, opts.limit ?? 50)
}

/**
 * Find installment-plan pairs that nobody has linked yet, returning only the
 * NEW links to merge in. Idempotent: rows already linked (or deliberately
 * unlinked, via the '' tombstone) are skipped, so this can run after every
 * import without ever undoing a decision.
 */
export function autoDetectLinks(rows: Transaction[], existing: TxLinks = {}): TxLinks {
  const found: TxLinks = {}
  const charges = rows.filter(
    (t) => t.amount < 0 && t.key && PLAN_CHARGE_RE.test(t.description) && !PLAN_CREDIT_RE.test(t.description),
  )
  if (charges.length === 0) return found

  const taken = new Set(Object.values(existing).filter(Boolean))
  for (const credit of rows) {
    const key = credit.key
    if (!key || credit.amount <= 0) continue
    if (key in existing) continue // already linked, or deliberately not
    if (!PLAN_CREDIT_RE.test(credit.description)) continue

    const match = charges.find(
      (c) =>
        cents(c.amount) === -cents(credit.amount) &&
        dayGap(c.date, credit.date) <= PLAN_WINDOW_DAYS &&
        !taken.has(c.key as string) &&
        !found[c.key as string],
    )
    if (match?.key) {
      found[key] = match.key
      taken.add(match.key)
    }
  }
  return found
}
