/**
 * Tiny typed key-value store. Signed out, everything stays on the user's
 * device. When someone signs in, cloudSync registers a save listener here to
 * mirror slices to their account — local storage remains what the app reads.
 *
 * The backing store is swappable (`setStorageBackend`) so the same code runs
 * on web (localStorage, auto-detected — the web app registers nothing) and
 * React Native (MMKV). Reads are SYNCHRONOUS by design: store.tsx hydrates
 * state in useState initializers, so the backend must answer immediately —
 * MMKV on mobile, never AsyncStorage.
 */

/** The minimal synchronous KV surface a platform must provide. */
export interface KVBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

let injected: KVBackend | null = null
let warned = false

/** No-op backend for environments with no storage at all (warns once). */
const nullBackend: KVBackend = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

/** Install a platform storage backend (e.g. MMKV on mobile). Null resets to auto-detect. */
export function setStorageBackend(backend: KVBackend | null): void {
  injected = backend
}

/**
 * Resolved lazily on every call, not at import time: tests (and the design
 * previews) install a fake `localStorage` after this module loads, and that
 * must win.
 */
function backend(): KVBackend {
  if (injected) return injected
  if (typeof localStorage !== 'undefined') return localStorage
  if (!warned) {
    warned = true
    console.warn('No storage backend available; data will not persist.')
  }
  return nullBackend
}

type SaveListener = (key: string, value: unknown) => void

let saveListener: SaveListener | null = null

/** cloudSync hooks saves here; null detaches (sign-out). */
export function setSaveListener(fn: SaveListener | null): void {
  saveListener = fn
}

export const STORAGE_KEYS = {
  transactions: 'moneyquiz.transactions.v1',
  mapping: 'moneyquiz.mapping.v1',
  // Category edits remembered at three levels: this exact ROW (txOverrides,
  // keyed by lib/txKey), every row with this exact description (overrides),
  // and every row from this merchant (merchantOverrides).
  txOverrides: 'moneyquiz.txOverrides.v1',
  // How single rows count: 'reimbursement' or 'internal' (see types.TxTreatment).
  txTreatments: 'moneyquiz.txTreatments.v1',
  // A credit -> the charge it offsets, both by txKey. '' is a tombstone meaning
  // "the user unlinked this", so auto-detection doesn't put it straight back.
  txLinks: 'moneyquiz.txLinks.v1',
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
  // Bill vs habit reclassifications for recurring groups (by group key).
  recurringKinds: 'moneyquiz.recurringKinds.v1',
  // Today's daily question + whether it was answered (regenerated each day).
  daily: 'moneyquiz.daily.v1',
  categories: 'moneyquiz.categories.v1',
  budgets: 'moneyquiz.budgets.v1',
  quizHistory: 'moneyquiz.quizHistory.v1',
  startingBalances: 'moneyquiz.startingBalances.v1',
  givingGoal: 'moneyquiz.givingGoal.v1',
  paidOffDebts: 'moneyquiz.paidOffDebts.v1',
  // XP / level / daily streak. Deliberately NOT in DATA_KEYS: clearing your
  // data shouldn't take away the level you earned.
  game: 'moneyquiz.game.v1',
  theme: 'moneyquiz.theme.v1',
} as const

/** Keys that hold imported data / edits (wiped by "Clear all data"). */
export const DATA_KEYS: string[] = [
  STORAGE_KEYS.transactions,
  STORAGE_KEYS.mapping,
  STORAGE_KEYS.txOverrides,
  STORAGE_KEYS.txTreatments,
  STORAGE_KEYS.txLinks,
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
  STORAGE_KEYS.recurringKinds,
  STORAGE_KEYS.daily, // may embed personal figures, so it's wiped with the data
  STORAGE_KEYS.budgets,
  STORAGE_KEYS.quizHistory,
  STORAGE_KEYS.startingBalances,
  STORAGE_KEYS.givingGoal,
  STORAGE_KEYS.paidOffDebts,
]

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = backend().getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    backend().setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be full or unavailable (private mode); fail silently.
  }
  saveListener?.(key, value)
}

export function removeKey(key: string): void {
  try {
    backend().removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Raw string access that never notifies the save listener. cloudSync uses
 * these when applying pulled slices, so a login pull can't echo itself back
 * up as new writes.
 */
export function getRaw(key: string): string | null {
  try {
    return backend().getItem(key)
  } catch {
    return null
  }
}

export function setRaw(key: string, value: string): void {
  try {
    backend().setItem(key, value)
  } catch {
    // quota/private mode: the store will just see whatever loaded
  }
}

export function removeRaw(key: string): void {
  try {
    backend().removeItem(key)
  } catch {
    // ignore
  }
}

/** Wipe every key this app owns. */
export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey)
}
