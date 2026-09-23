import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { assignTxKeys, txKey } from './txKey'

let n = 0
function tx(date: string, description: string, amount: number): Transaction {
  return { id: `id-${n++}`, date, description, amount, category: 'other' }
}

describe('txKey', () => {
  it('ignores case and extra whitespace in the description', () => {
    expect(txKey('2026-09-03', 'Ridgeview  Dues', -113)).toBe(
      txKey('2026-09-03', 'ridgeview dues', -113),
    )
  })

  it('separates rows that differ by date or amount', () => {
    expect(txKey('2026-09-03', 'Ridgeview Dues', -113)).not.toBe(
      txKey('2026-09-04', 'Ridgeview Dues', -113),
    )
    expect(txKey('2026-09-03', 'Ridgeview Dues', -113)).not.toBe(
      txKey('2026-09-03', 'Ridgeview Dues', -103.28),
    )
  })
})

describe('assignTxKeys', () => {
  it('gives every row a key', () => {
    const rows = [tx('2026-09-01', 'Corner Coffee', -6.25), tx('2026-09-02', 'Northside Grocery', -64.3)]
    const keys = assignTxKeys(rows)
    expect(keys.size).toBe(2)
    expect(keys.get(rows[0].id)).not.toBe(keys.get(rows[1].id))
  })

  it('numbers true duplicates so they can be filed differently', () => {
    // A statement can carry the same charge twice on the same day; the user
    // may file one as Insurance and the other as Home & HOA.
    const a = tx('2026-09-03', 'Ridgeview Dues', -113)
    const b = tx('2026-09-03', 'Ridgeview Dues', -113)
    const keys = assignTxKeys([a, b])
    expect(keys.get(a.id)).toBe(txKey('2026-09-03', 'Ridgeview Dues', -113, 0))
    expect(keys.get(b.id)).toBe(txKey('2026-09-03', 'Ridgeview Dues', -113, 1))
    expect(keys.get(a.id)).not.toBe(keys.get(b.id))
  })

  it('numbers each signature group independently', () => {
    const rows = [
      tx('2026-09-03', 'Ridgeview Dues', -113),
      tx('2026-09-03', 'Ridgeview Dues', -103.28),
      tx('2026-09-03', 'Ridgeview Dues', -113),
      tx('2026-09-03', 'Ridgeview Dues', -103.28),
    ]
    const keys = [...assignTxKeys(rows).values()]
    expect(new Set(keys).size).toBe(4)
    expect(keys[0].endsWith('#0')).toBe(true)
    expect(keys[1].endsWith('#0')).toBe(true)
    expect(keys[2].endsWith('#1')).toBe(true)
    expect(keys[3].endsWith('#1')).toBe(true)
  })

  it('produces the same keys when the same rows are imported again', () => {
    // Fresh ids (a re-import mints new ones), same content → same keys, which
    // is what lets a per-transaction edit survive.
    const first = [
      tx('2026-09-03', 'Ridgeview Dues', -113),
      tx('2026-09-03', 'Ridgeview Dues', -113),
      tx('2026-09-05', 'Corner Coffee', -6.25),
    ]
    const second = first.map((t) => ({ ...t, id: `re-${t.id}` }))
    expect([...assignTxKeys(second).values()]).toEqual([...assignTxKeys(first).values()])
  })

  it('is unaffected by rows from another source sitting in between', () => {
    const a = tx('2026-09-03', 'Ridgeview Dues', -113)
    const other = tx('2026-09-03', 'Corner Coffee', -6.25)
    const b = tx('2026-09-03', 'Ridgeview Dues', -113)
    const keys = assignTxKeys([a, other, b])
    expect(keys.get(b.id)!.endsWith('#1')).toBe(true)
  })
})
