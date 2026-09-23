/**
 * A stable identity for ONE transaction that survives a re-import.
 *
 * Transaction `id`s are minted fresh by `newId()` on every import, so anything
 * the user pins to a single row — the category they chose for this charge, a
 * link to the refund that reverses it, how it should be treated — has to be
 * keyed on the row's *content* instead.
 *
 * `txSignature` (date + description + amount) is almost that key, but a
 * statement can legitimately contain the same charge twice on the same day:
 * two identical HOA dues posting together are different transactions the user
 * may well file differently. So the signature carries an occurrence number,
 * assigned in list order by `assignTxKeys`.
 *
 * The occurrence number is only stable if the rows arrive in the same order,
 * which they do for the normal flow (remove a source, import the same export
 * again). Importing the same file a second time *without* removing the first
 * copy doubles every signature group and shifts the numbering — the same
 * caveat that already applies to the rest of the app's duplicate handling.
 */
import type { Transaction } from '../types'
import { txSignature } from './merchant'

/** The key for one row: its signature plus which occurrence of it this is. */
export function txKey(date: string, description: string, amount: number, occurrence = 0): string {
  return `${txSignature(date, description, amount)}#${occurrence}`
}

/**
 * Map every transaction's `id` to its stable key, numbering duplicates in the
 * order they appear. Call this over the whole raw list, not a filtered slice —
 * filtering would renumber the survivors.
 */
export function assignTxKeys(transactions: Transaction[]): Map<string, string> {
  const seen = new Map<string, number>()
  const out = new Map<string, string>()
  for (const t of transactions) {
    const sig = txSignature(t.date, t.description, t.amount)
    const n = seen.get(sig) ?? 0
    seen.set(sig, n + 1)
    out.set(t.id, `${sig}#${n}`)
  }
  return out
}
