/**
 * Sits between AuthProvider and StoreProvider. On sign-in it pulls the
 * account's slices into localStorage and remounts the store (via the epoch
 * passed to children); on first sign-in it offers to upload this device's
 * data; on sign-out it clears synced data from the device. Signed out, it
 * renders children untouched — the app works exactly as it always has.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth'
import {
  applyToLocal,
  deleteAllCloud,
  flushNow,
  getState,
  localDiffersFromCloud,
  localSnapshotJson,
  pullAll,
  pushAllFromLocal,
  setAccessToken,
  start as startLiveSync,
  stop as stopLiveSync,
  subscribe,
  SYNCED_KEYS,
  type SliceRow,
  type SyncStatus,
} from '../lib/cloudSync'
import { downloadText } from '../lib/exportData'
import { loadJSON, removeKey, STORAGE_KEYS } from '../lib/storage'
import type { Transaction } from '../types'

interface SyncValue {
  /** True once this device is mirroring to the signed-in account. */
  active: boolean
  status: SyncStatus
  lastSyncAt: string | null
  pendingCount: number
  /** Push pending edits, re-pull the account, and reload the store. */
  resync: () => Promise<void>
  /** Wipe the account's cloud copy too (used by "Clear all data"). */
  clearCloud: () => Promise<void>
}

const SyncContext = createContext<SyncValue>({
  active: false,
  status: 'off',
  lastSyncAt: null,
  pendingCount: 0,
  resync: async () => {},
  clearCloud: async () => {},
})

export function useSync(): SyncValue {
  return useContext(SyncContext)
}

type Dialog =
  | { kind: 'none' }
  | { kind: 'upload' }
  | { kind: 'replace'; rows: SliceRow[] }

function hasLocalData(): boolean {
  return loadJSON<Transaction[]>(STORAGE_KEYS.transactions, []).length > 0
}

function DialogShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}

export function SyncGate({ children }: { children: (epoch: number) => ReactNode }) {
  const { enabled, loading, session, signOut } = useAuth()
  const [epoch, setEpoch] = useState(0)
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [pulling, setPulling] = useState(false)
  const [syncState, setSyncState] = useState(getState())
  const prevUserRef = useRef<string | null>(null)
  const liveRef = useRef(false)
  const [active, setActive] = useState(false)

  useEffect(() => subscribe(setSyncState), [])

  const userId = session?.user.id ?? null
  const accessToken = session?.access_token ?? null

  const goLive = useCallback(
    (uid: string, token: string) => {
      startLiveSync(uid, token)
      liveRef.current = true
      setActive(true)
    },
    [],
  )

  // Keep the keepalive-flush token fresh across refreshes.
  useEffect(() => {
    if (liveRef.current && accessToken) setAccessToken(accessToken)
  }, [accessToken])

  useEffect(() => {
    if (!enabled || loading) return
    const prev = prevUserRef.current
    if (userId === prev) return
    prevUserRef.current = userId

    if (userId && accessToken) {
      let cancelled = false
      setPulling(true)
      pullAll()
        .then((rows) => {
          if (cancelled) return
          if (rows.length === 0) {
            if (hasLocalData()) {
              setDialog({ kind: 'upload' })
            } else {
              goLive(userId, accessToken)
            }
          } else if (hasLocalData() && localDiffersFromCloud(rows)) {
            setDialog({ kind: 'replace', rows })
          } else {
            applyToLocal(rows)
            goLive(userId, accessToken)
            setEpoch((e) => e + 1)
          }
        })
        .catch(() => {
          // Pull failed (offline?): stay usable locally, just don't mirror.
        })
        .finally(() => {
          if (!cancelled) setPulling(false)
        })
      return () => {
        cancelled = true
      }
    }

    if (!userId && prev) {
      stopLiveSync()
      if (liveRef.current) {
        // The account keeps the data; a shared browser shouldn't.
        const accountKeys = new Set([...SYNCED_KEYS, STORAGE_KEYS.daily])
        accountKeys.forEach(removeKey)
        setEpoch((e) => e + 1)
      }
      liveRef.current = false
      setActive(false)
      setDialog({ kind: 'none' })
    }
  }, [enabled, loading, userId, accessToken, goLive])

  const resync = useCallback(async () => {
    if (!liveRef.current || !userId) return
    setPulling(true)
    try {
      await flushNow()
      const rows = await pullAll()
      applyToLocal(rows)
      setEpoch((e) => e + 1)
    } finally {
      setPulling(false)
    }
  }, [userId])

  const clearCloud = useCallback(async () => {
    if (liveRef.current) await deleteAllCloud()
  }, [])

  const acceptUpload = async () => {
    if (!userId || !accessToken) return
    setDialog({ kind: 'none' })
    setPulling(true)
    try {
      await pushAllFromLocal(userId)
      goLive(userId, accessToken)
    } finally {
      setPulling(false)
    }
  }

  const acceptReplace = (rows: SliceRow[]) => {
    if (!userId || !accessToken) return
    setDialog({ kind: 'none' })
    applyToLocal(rows)
    goLive(userId, accessToken)
    setEpoch((e) => e + 1)
  }

  // Declining either dialog signs back out; live sync never started, so the
  // device's local data is left exactly as it was.
  const decline = () => {
    setDialog({ kind: 'none' })
    void signOut()
  }

  return (
    <SyncContext.Provider
      value={{
        active,
        status: syncState.status,
        lastSyncAt: syncState.lastSyncAt,
        pendingCount: syncState.pendingCount,
        resync,
        clearCloud,
      }}
    >
      {children(epoch)}

      {pulling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-xl">
            Syncing your account…
          </div>
        </div>
      )}

      {dialog.kind === 'upload' && (
        <DialogShell>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Save this device&apos;s data to your account?
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your account is empty, but this browser has imported data. Save it to your account and
            it will follow you to any device you sign in on.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={decline}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
            <button
              onClick={() => void acceptUpload()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save to my account
            </button>
          </div>
        </DialogShell>
      )}

      {dialog.kind === 'replace' && (
        <DialogShell>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Use your account&apos;s data?
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your account already has data saved. Continuing replaces what&apos;s on this device
            with your account&apos;s copy. You can download a backup of this device&apos;s data
            first.
          </p>
          <button
            onClick={() =>
              downloadText('money-quiz-local-backup.json', localSnapshotJson(), 'application/json')
            }
            className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Download backup of this device&apos;s data
          </button>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={decline}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
            <button
              onClick={() => acceptReplace(dialog.rows)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Use account data
            </button>
          </div>
        </DialogShell>
      )}
    </SyncContext.Provider>
  )
}
