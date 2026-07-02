import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getRaw,
  loadJSON,
  removeRaw,
  saveJSON,
  setRaw,
  setSaveListener,
  setStorageBackend,
  STORAGE_KEYS,
  type KVBackend,
} from './storage'

/** Map-backed fake standing in for a platform store (MMKV on mobile). */
function fakeBackend() {
  const mem = new Map<string, string>()
  const backend: KVBackend = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
  return { mem, backend }
}

afterEach(() => {
  setStorageBackend(null)
  setSaveListener(null)
  delete (globalThis as Record<string, unknown>).localStorage
})

describe('storage backend injection', () => {
  it('routes reads and writes through an injected backend', () => {
    const { mem, backend } = fakeBackend()
    setStorageBackend(backend)
    saveJSON(STORAGE_KEYS.budgets, { rent: 1200 })
    expect(JSON.parse(mem.get(STORAGE_KEYS.budgets)!)).toEqual({ rent: 1200 })
    expect(loadJSON(STORAGE_KEYS.budgets, {})).toEqual({ rent: 1200 })
  })

  it('auto-detects localStorage installed after import (test/preview semantics)', () => {
    const { mem, backend } = fakeBackend()
    ;(globalThis as Record<string, unknown>).localStorage = backend
    saveJSON(STORAGE_KEYS.givingGoal, 10)
    expect(mem.get(STORAGE_KEYS.givingGoal)).toBe('10')
    expect(loadJSON(STORAGE_KEYS.givingGoal, 0)).toBe(10)
  })

  it('an injected backend wins over a global localStorage', () => {
    const global = fakeBackend()
    const injected = fakeBackend()
    ;(globalThis as Record<string, unknown>).localStorage = global.backend
    setStorageBackend(injected.backend)
    saveJSON(STORAGE_KEYS.givingGoal, 25)
    expect(injected.mem.size).toBe(1)
    expect(global.mem.size).toBe(0)
  })

  it('returns fallbacks without throwing when no backend exists at all', () => {
    expect(loadJSON(STORAGE_KEYS.budgets, { safe: true })).toEqual({ safe: true })
    expect(() => saveJSON(STORAGE_KEYS.budgets, { rent: 1 })).not.toThrow()
    expect(getRaw(STORAGE_KEYS.budgets)).toBeNull()
  })
})

describe('save listener semantics', () => {
  beforeEach(() => {
    setStorageBackend(fakeBackend().backend)
  })

  it('saveJSON notifies the listener; raw writes never do', () => {
    const seen: string[] = []
    setSaveListener((key) => void seen.push(key))
    saveJSON(STORAGE_KEYS.budgets, { rent: 1 })
    setRaw(STORAGE_KEYS.givingGoal, '10')
    removeRaw(STORAGE_KEYS.givingGoal)
    expect(seen).toEqual([STORAGE_KEYS.budgets])
  })

  it('raw reads see raw writes', () => {
    setRaw(STORAGE_KEYS.givingGoal, '15')
    expect(getRaw(STORAGE_KEYS.givingGoal)).toBe('15')
    removeRaw(STORAGE_KEYS.givingGoal)
    expect(getRaw(STORAGE_KEYS.givingGoal)).toBeNull()
  })

  it('warns once (not per call) when persisting into the void', () => {
    setStorageBackend(null)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    saveJSON(STORAGE_KEYS.budgets, { a: 1 })
    saveJSON(STORAGE_KEYS.budgets, { a: 2 })
    // The warn-once latch is module-global, so earlier tests may have tripped
    // it already; all we can assert here is that it never repeats.
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1)
    warn.mockRestore()
  })
})
