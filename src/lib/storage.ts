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
  // Manual ★ "recurring payment" flags (per-merchant and per-charge). The legacy
  // subscriptions/subscriptionTxns keys are read once and migrated into these.
  recurring: 'moneyquiz.recurring.v1',
  recurringTxns: 'moneyquiz.recurringTxns.v1',
  subscriptions: 'moneyquiz.subscriptions.v1',
  subscriptionTxns: 'moneyquiz.subscriptionTxns.v1',
  groupMeta: 'moneyquiz.groupMeta.v1',
  aliases: 'moneyquiz.aliases.v1',
  ignoredTransfers: 'moneyquiz.ignoredTransfers.v1',
  dismissedRecurring: 'moneyquiz.dismissedRecurring.v1',
  categories: 'moneyquiz.categories.v1',
  budgets: 'moneyquiz.budgets.v1',
  quizHistory: 'moneyquiz.quizHistory.v1',
  startingBalances: 'moneyquiz.startingBalances.v1',
  // XP / level / daily streak. Deliberately NOT in DATA_KEYS: clearing your
  // data shouldn't take away the level you earned.
  game: 'moneyquiz.game.v1',
  theme: 'moneyquiz.theme.v1',
} as const

/** Keys that hold imported data / edits (wiped by "Clear all data"). */
export const DATA_KEYS: string[] = [
  STORAGE_KEYS.transactions,
  STORAGE_KEYS.mapping,
  STORAGE_KEYS.overrides,
  STORAGE_KEYS.sources,
  STORAGE_KEYS.merchantOverrides,
  STORAGE_KEYS.recurring,
  STORAGE_KEYS.recurringTxns,
  STORAGE_KEYS.subscriptions,
  STORAGE_KEYS.subscriptionTxns,
  STORAGE_KEYS.groupMeta,
  STORAGE_KEYS.aliases,
  STORAGE_KEYS.ignoredTransfers,
  STORAGE_KEYS.dismissedRecurring,
  STORAGE_KEYS.budgets,
  STORAGE_KEYS.quizHistory,
  STORAGE_KEYS.startingBalances,
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
