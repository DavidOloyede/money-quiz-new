/**
 * Tiny typed wrapper around localStorage. Everything in this app stays on the
 * user's device — nothing here ever leaves the browser.
 */

export const STORAGE_KEYS = {
  transactions: 'moneyquiz.transactions.v1',
  mapping: 'moneyquiz.mapping.v1',
  overrides: 'moneyquiz.overrides.v1',
  sources: 'moneyquiz.sources.v1',
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be full or unavailable (private mode); fail silently.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Wipe every key this app owns. */
export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey)
}

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
