/**
 * Cloud mirror of the app's localStorage slices for signed-in users.
 *
 * The store keeps reading and writing localStorage exactly as before; this
 * module listens to every saveJSON() call (via storage.ts's save listener),
 * debounces, and POSTs changed slices to the Node API (`/api/sync`), which
 * stores one row per (user, storage key). On login the slices are pulled and
 * written back into localStorage, then the StoreProvider is remounted so the
 * store re-initializes from them.
 *
 * Conflicts are last-write-wins per slice, which is fine for one person on a
 * couple of devices: slices are independent, so editing budgets on the phone
 * can't clobber transactions edited on the laptop.
 */
import { api, beaconPost } from './api'
import { cloudEnabled } from './supabase'
import { loadJSON, setSaveListener, STORAGE_KEYS } from './storage'

/**
 * Slices that follow the account (everything "Clear all data" wipes, minus the
 * regenerated daily question, plus game progress and custom categories).
 * `theme` stays per-device; legacy subscription keys are migrated on load and
 * never written.
 */
export const SYNCED_KEYS: string[] = [
  STORAGE_KEYS.transactions,
  STORAGE_KEYS.mapping,
  STORAGE_KEYS.overrides,
  STORAGE_KEYS.sources,
  STORAGE_KEYS.merchantOverrides,
  STORAGE_KEYS.recurring,
  STORAGE_KEYS.recurringTxns,
  STORAGE_KEYS.groupMeta,
  STORAGE_KEYS.aliases,
  STORAGE_KEYS.ignoredTransfers,
  STORAGE_KEYS.dismissedRecurring,
  STORAGE_KEYS.recurringKinds,
  STORAGE_KEYS.categories,
  STORAGE_KEYS.budgets,
  STORAGE_KEYS.quizHistory,
  STORAGE_KEYS.startingBalances,
  STORAGE_KEYS.givingGoal,
  STORAGE_KEYS.paidOffDebts,
  STORAGE_KEYS.game,
]

const DEBOUNCE_MS = 2500

export interface SliceRow {
  key: string
  value: unknown
}

export type SyncStatus = 'off' | 'live' | 'pushing' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  pendingCount: number
}

let userId: string | null = null
let accessToken: string | null = null
/** Slice -> serialized value already in the cloud, to skip no-op pushes. */
const lastSynced = new Map<string, string>()
const pending = new Map<string, string>()
let timer: ReturnType<typeof setTimeout> | null = null
let state: SyncState = { status: 'off', lastSyncAt: null, pendingCount: 0 }
const listeners = new Set<(s: SyncState) => void>()

function notify(patch: Partial<SyncState>) {
  state = { ...state, ...patch, pendingCount: pending.size }
  listeners.forEach((l) => l(state))
}

export function subscribe(listener: (s: SyncState) => void): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function getState(): SyncState {
  return state
}

function onSave(key: string, value: unknown) {
  if (!userId || !SYNCED_KEYS.includes(key)) return
  let raw: string
  try {
    raw = JSON.stringify(value)
  } catch {
    return
  }
  // The store re-saves every slice when it (re)mounts; skip values that match
  // what the cloud already has so a login pull doesn't echo writes back up.
  if (lastSynced.get(key) === raw) return
  pending.set(key, raw)
  notify({})
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void flush(), DEBOUNCE_MS)
}

async function flush(): Promise<void> {
  if (!cloudEnabled || !userId || pending.size === 0) return
  const uid = userId
  const batch = [...pending.entries()]
  pending.clear()
  notify({ status: 'pushing' })
  const slices = batch.map(([key, raw]) => ({ key, value: JSON.parse(raw) as unknown }))
  try {
    await api.post('/sync', { slices })
  } catch {
    if (userId !== uid) return // signed out mid-flight; drop the result
    // Put failed slices back (unless newer edits replaced them) and retry on
    // the next save or page-hide.
    for (const [key, raw] of batch) if (!pending.has(key)) pending.set(key, raw)
    notify({ status: 'error' })
    return
  }
  if (userId !== uid) return // signed out mid-flight; drop the result
  for (const [key, raw] of batch) lastSynced.set(key, raw)
  notify({ status: 'live', lastSyncAt: new Date().toISOString() })
}

/** Push anything pending right now (used before a manual re-pull). */
export async function flushNow(): Promise<void> {
  if (timer) clearTimeout(timer)
  await flush()
}

/**
 * Best-effort flush while the tab is closing. An awaited fetch can't run during
 * unload, so this sends a keepalive beacon with the cached token.
 */
function flushOnHide() {
  if (!userId || !accessToken || pending.size === 0) return
  const slices = [...pending.entries()].map(([key, raw]) => ({
    key,
    value: JSON.parse(raw) as unknown,
  }))
  for (const [key, raw] of pending) lastSynced.set(key, raw)
  pending.clear()
  notify({})
  beaconPost('/sync', accessToken, { slices })
}

function handleHide() {
  if (document.visibilityState === 'hidden') flushOnHide()
}

/** Begin mirroring saves for this user. Call after the login pull/push. */
export function start(uid: string, token: string) {
  userId = uid
  accessToken = token
  setSaveListener(onSave)
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushOnHide)
    document.addEventListener('visibilitychange', handleHide)
  }
  notify({ status: 'live', lastSyncAt: new Date().toISOString() })
}

export function setAccessToken(token: string) {
  accessToken = token
}

/** Stop mirroring (sign-out). Pending writes are flushed best-effort first. */
export function stop() {
  flushOnHide()
  userId = null
  accessToken = null
  pending.clear()
  lastSynced.clear()
  if (timer) clearTimeout(timer)
  setSaveListener(null)
  if (typeof window !== 'undefined') {
    window.removeEventListener('pagehide', flushOnHide)
    document.removeEventListener('visibilitychange', handleHide)
  }
  notify({ status: 'off', lastSyncAt: null })
}

/** Fetch every slice stored for the signed-in user. */
export async function pullAll(): Promise<SliceRow[]> {
  if (!cloudEnabled) return []
  const { slices } = await api.get<{ slices: SliceRow[] }>('/sync')
  return slices ?? []
}

/**
 * Write pulled slices into localStorage (and seed the no-op filter). Slices
 * missing from the cloud are removed locally so the device matches the
 * account exactly. The caller remounts the store afterwards.
 */
export function applyToLocal(rows: SliceRow[]): void {
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  for (const key of SYNCED_KEYS) {
    if (byKey.has(key)) {
      const raw = JSON.stringify(byKey.get(key))
      try {
        localStorage.setItem(key, raw)
      } catch {
        // quota/private mode: the store will just see whatever loaded
      }
      lastSynced.set(key, raw)
    } else {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
      lastSynced.delete(key)
    }
  }
}

/** Upload this device's slices to the account (first-sign-in migration). */
export async function pushAllFromLocal(_uid: string): Promise<void> {
  if (!cloudEnabled) return
  const slices: SliceRow[] = []
  for (const key of SYNCED_KEYS) {
    const value = loadJSON<unknown>(key, null)
    if (value === null) continue
    slices.push({ key, value })
    lastSynced.set(key, JSON.stringify(value))
  }
  if (slices.length === 0) return
  await api.post('/sync', { slices })
}

/** Remove every slice from the account (used by "Clear all data"). */
export async function deleteAllCloud(): Promise<void> {
  if (!cloudEnabled || !userId) return
  pending.clear()
  lastSynced.clear()
  await api.del('/sync')
}

/** Serialized snapshot of local slices, for the pre-replace backup download. */
export function localSnapshotJson(): string {
  const out: Record<string, unknown> = {}
  for (const key of SYNCED_KEYS) {
    const value = loadJSON<unknown>(key, null)
    if (value !== null) out[key] = value
  }
  return JSON.stringify(out, null, 2)
}

/** True when any local slice differs from the given cloud rows. */
export function localDiffersFromCloud(rows: SliceRow[]): boolean {
  const byKey = new Map(rows.map((r) => [r.key, JSON.stringify(r.value)]))
  for (const key of SYNCED_KEYS) {
    const local = loadJSON<unknown>(key, null)
    const localRaw = local === null ? undefined : JSON.stringify(local)
    if (localRaw !== byKey.get(key)) return true
  }
  return false
}
