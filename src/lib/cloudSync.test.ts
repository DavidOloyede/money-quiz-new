import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Slice {
  key: string
  value: unknown
}

/** Captured POST /sync payloads (each is the batch of slices sent). */
const posts: Slice[][] = []
const beacons: Slice[][] = []

vi.mock('./supabase', () => ({ cloudEnabled: true }))

vi.mock('./api', () => ({
  api: {
    post: (_path: string, body: { slices: Slice[] }) => {
      posts.push(body.slices)
      return Promise.resolve({ ok: true })
    },
    get: () => Promise.resolve({ slices: [] }),
    del: () => Promise.resolve({ ok: true }),
  },
  beaconPost: (_path: string, _token: string | null, body: { slices: Slice[] }) => {
    beacons.push(body.slices)
  },
}))

import {
  applyToLocal,
  flushNow,
  localDiffersFromCloud,
  localSnapshotJson,
  pushAllFromLocal,
  start,
  stop,
  SYNCED_KEYS,
} from './cloudSync'
import { saveJSON, STORAGE_KEYS } from './storage'

// The vitest environment is node; give storage.ts a real-enough localStorage.
const mem = new Map<string, string>()
beforeEach(() => {
  mem.clear()
  posts.length = 0
  beacons.length = 0
  vi.useFakeTimers()
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  }
})

afterEach(() => {
  stop()
  vi.useRealTimers()
  delete (globalThis as Record<string, unknown>).localStorage
})

describe('SYNCED_KEYS', () => {
  it('follows account data but not device preferences', () => {
    expect(SYNCED_KEYS).toContain(STORAGE_KEYS.transactions)
    expect(SYNCED_KEYS).toContain(STORAGE_KEYS.game)
    expect(SYNCED_KEYS).toContain(STORAGE_KEYS.categories)
    expect(SYNCED_KEYS).not.toContain(STORAGE_KEYS.theme)
    expect(SYNCED_KEYS).not.toContain(STORAGE_KEYS.daily)
    // legacy keys are migrated on load and must never round-trip to the cloud
    expect(SYNCED_KEYS).not.toContain(STORAGE_KEYS.subscriptions)
    expect(SYNCED_KEYS).not.toContain(STORAGE_KEYS.subscriptionTxns)
  })
})

describe('debounced mirroring', () => {
  it('pushes a saved slice after the debounce window', async () => {
    start('user-1', 'token')
    saveJSON(STORAGE_KEYS.budgets, { groceries: 400 })
    expect(posts).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toEqual([{ key: STORAGE_KEYS.budgets, value: { groceries: 400 } }])
  })

  it('coalesces rapid saves of the same slice into one push', async () => {
    start('user-1', 'token')
    saveJSON(STORAGE_KEYS.budgets, { groceries: 100 })
    saveJSON(STORAGE_KEYS.budgets, { groceries: 200 })
    saveJSON(STORAGE_KEYS.budgets, { groceries: 300 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(1)
    expect((posts[0][0].value as { groceries: number }).groceries).toBe(300)
  })

  it('skips no-op saves that match what the cloud already has', async () => {
    start('user-1', 'token')
    saveJSON(STORAGE_KEYS.givingGoal, 10)
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(1)
    // the store remount re-saves every slice; identical values must not echo
    saveJSON(STORAGE_KEYS.givingGoal, 10)
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(1)
  })

  it('ignores unsynced keys and saves after stop()', async () => {
    start('user-1', 'token')
    saveJSON(STORAGE_KEYS.theme, 'dark')
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(0)
    stop()
    saveJSON(STORAGE_KEYS.budgets, { rent: 1200 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(posts).toHaveLength(0)
  })

  it('flushNow pushes without waiting for the debounce', async () => {
    start('user-1', 'token')
    saveJSON(STORAGE_KEYS.quizHistory, [{ at: '2026-06-12', correct: 8, total: 10 }])
    await flushNow()
    expect(posts).toHaveLength(1)
  })
})

describe('login pull / first-sign-in push', () => {
  it('applyToLocal writes cloud slices and removes ones the account lacks', () => {
    saveJSON(STORAGE_KEYS.budgets, { stale: 1 })
    applyToLocal([{ key: STORAGE_KEYS.transactions, value: [{ id: 't1' }] }])
    expect(JSON.parse(mem.get(STORAGE_KEYS.transactions)!)).toEqual([{ id: 't1' }])
    expect(mem.has(STORAGE_KEYS.budgets)).toBe(false)
  })

  it('localDiffersFromCloud is false right after applying the cloud copy', () => {
    const rows = [
      { key: STORAGE_KEYS.transactions, value: [{ id: 't1' }] },
      { key: STORAGE_KEYS.game, value: { xp: 120, streak: 3 } },
    ]
    applyToLocal(rows)
    expect(localDiffersFromCloud(rows)).toBe(false)
    saveJSON(STORAGE_KEYS.game, { xp: 130, streak: 4 })
    expect(localDiffersFromCloud(rows)).toBe(true)
  })

  it('pushAllFromLocal uploads every local slice', async () => {
    saveJSON(STORAGE_KEYS.transactions, [{ id: 't1' }])
    saveJSON(STORAGE_KEYS.givingGoal, 10)
    await pushAllFromLocal('user-1')
    expect(posts).toHaveLength(1)
    const keys = posts[0].map((r) => r.key)
    expect(keys).toContain(STORAGE_KEYS.transactions)
    expect(keys).toContain(STORAGE_KEYS.givingGoal)
  })

  it('localSnapshotJson captures only present slices', () => {
    saveJSON(STORAGE_KEYS.budgets, { rent: 1200 })
    const snap = JSON.parse(localSnapshotJson()) as Record<string, unknown>
    expect(snap[STORAGE_KEYS.budgets]).toEqual({ rent: 1200 })
    expect(snap[STORAGE_KEYS.transactions]).toBeUndefined()
  })
})
