/**
 * Tiny typed wrapper around localStorage. Everything in this app stays on the
 * user's device — nothing here ever leaves the browser.
 */

export const STORAGE_KEYS = {
  transactions: 'moneyquiz.transactions.v1',
  mapping: 'moneyquiz.mapping.v1',
  overrides: 'moneyquiz.overrides.v1',
  sources: 'moneyquiz.sources.v1',
  merchantOverrides: 'moneyquiz.merchantOverrides.v1',
  subscriptions: 'moneyquiz.subscriptions.v1',
  aliases: 'moneyquiz.aliases.v1',
  ignoredTransfers: 'moneyquiz.ignoredTransfers.v1',
  categories: 'moneyquiz.categories.v1',
  budgets: 'moneyquiz.budgets.v1',
  quizHistory: 'moneyquiz.quizHistory.v1',
  theme: 'moneyquiz.theme.v1',
} as const

/** Keys that hold imported data / edits (wiped by "Clear all data"). */
export const DATA_KEYS: string[] = [
  STORAGE_KEYS.transactions,
  STORAGE_KEYS.mapping,
  STORAGE_KEYS.overrides,
  STORAGE_KEYS.sources,
  STORAGE_KEYS.merchantOverrides,
  STORAGE_KEYS.subscriptions,
  STORAGE_KEYS.aliases,
  STORAGE_KEYS.ignoredTransfers,
  STORAGE_KEYS.budgets,
  STORAGE_KEYS.quizHistory,
]

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
