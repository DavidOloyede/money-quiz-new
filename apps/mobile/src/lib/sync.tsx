/**
 * Mobile counterpart of the web's SyncGate. Sits between AuthProvider and
 * StoreProvider: on sign-in it pulls the account's slices into MMKV and
 * remounts the store (via the epoch passed to children); on first sign-in it
 * offers to upload this device's data; on sign-out it clears synced data from
 * the device. The web flushes pending writes when the tab hides — the native
 * equivalent here is the app leaving the foreground (AppState).
 *
 * The prompts render in <SyncDialogs/>, mounted inside the store tree — this
 * provider sits above the store, where useAppTheme can't reach.
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
import { AppState, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native'
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
} from '@moneyquiz/core/lib/cloudSync'
import { loadJSON, removeKey, STORAGE_KEYS } from '@moneyquiz/core/lib/storage'
import type { Transaction } from '@moneyquiz/core/types'

import { useAuth } from '@/lib/auth'
import { fonts, radii, spacing, useAppTheme, type ThemeColors } from '@/theme'

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

type Dialog =
  | { kind: 'none' }
  | { kind: 'upload' }
  | { kind: 'replace'; rows: SliceRow[] }

/** The public value plus what SyncDialogs needs to render the prompts. */
interface SyncInternal extends SyncValue {
  dialog: Dialog
  pulling: boolean
  acceptUpload: () => void
  acceptReplace: (rows: SliceRow[]) => void
  decline: () => void
}

const SyncContext = createContext<SyncInternal>({
  active: false,
  status: 'off',
  lastSyncAt: null,
  pendingCount: 0,
  resync: async () => {},
  clearCloud: async () => {},
  dialog: { kind: 'none' },
  pulling: false,
  acceptUpload: () => {},
  acceptReplace: () => {},
  decline: () => {},
})

export function useSync(): SyncValue {
  return useContext(SyncContext)
}

function hasLocalData(): boolean {
  return loadJSON<Transaction[]>(STORAGE_KEYS.transactions, []).length > 0
}

export function SyncProvider({ children }: { children: (epoch: number) => ReactNode }) {
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

  const goLive = useCallback((uid: string, token: string) => {
    startLiveSync(uid, token)
    liveRef.current = true
    setActive(true)
  }, [])

  // Keep the sign-out flush token fresh across refreshes.
  useEffect(() => {
    if (liveRef.current && accessToken) setAccessToken(accessToken)
  }, [accessToken])

  // The web pushes pending edits on pagehide/visibilitychange; on a phone the
  // moment that matters is leaving the foreground. flushNow() is a no-op when
  // signed out or nothing is pending.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void flushNow()
    })
    return () => sub.remove()
  }, [])

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
          // Unconditionally: if this pull was cancelled (signed out mid-flight),
          // skipping the reset would leave the "Syncing…" overlay up forever.
          setPulling(false)
        })
      return () => {
        cancelled = true
      }
    }

    if (!userId && prev) {
      stopLiveSync()
      if (liveRef.current) {
        // The account keeps the data; the device copy goes with the session.
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

  const acceptUpload = useCallback(() => {
    if (!userId || !accessToken) return
    setDialog({ kind: 'none' })
    setPulling(true)
    pushAllFromLocal(userId)
      .then(() => goLive(userId, accessToken))
      .catch(() => {
        // Upload failed (offline?): stay signed in and local; nothing is lost.
      })
      .finally(() => setPulling(false))
  }, [userId, accessToken, goLive])

  const acceptReplace = useCallback(
    (rows: SliceRow[]) => {
      if (!userId || !accessToken) return
      setDialog({ kind: 'none' })
      applyToLocal(rows)
      goLive(userId, accessToken)
      setEpoch((e) => e + 1)
    },
    [userId, accessToken, goLive],
  )

  // Declining either prompt signs back out; live sync never started, so the
  // device's local data is left exactly as it was.
  const decline = useCallback(() => {
    setDialog({ kind: 'none' })
    void signOut()
  }, [signOut])

  return (
    <SyncContext.Provider
      value={{
        active,
        status: syncState.status,
        lastSyncAt: syncState.lastSyncAt,
        pendingCount: syncState.pendingCount,
        resync,
        clearCloud,
        dialog,
        pulling,
        acceptUpload,
        acceptReplace,
        decline,
      }}
    >
      {children(epoch)}
    </SyncContext.Provider>
  )
}

/**
 * The sign-in prompts and the "Syncing…" overlay. Rendered inside the store
 * tree (the root layout mounts it next to the navigator) so it can read the
 * theme. One Modal hosts everything — iOS won't present two at once.
 */
export function SyncDialogs() {
  const { colors } = useAppTheme()
  const { dialog, pulling, acceptUpload, acceptReplace, decline } = useContext(SyncContext)
  const visible = pulling || dialog.kind !== 'none'
  if (!visible) return null

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.md,
          backgroundColor: colors.overlay,
        }}
      >
        {pulling ? (
          <View
            style={{
              borderRadius: radii.lg,
              backgroundColor: colors.card,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
            }}
          >
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.muted }}>
              Syncing your account…
            </Text>
          </View>
        ) : dialog.kind === 'upload' ? (
          <DialogCard
            colors={colors}
            title="Save this phone's data to your account?"
            body="Your account is empty, but this phone has data on it. Save it to your account and it will follow you to any device you sign in on."
            confirmLabel="Save to my account"
            onConfirm={acceptUpload}
            onDecline={decline}
          />
        ) : dialog.kind === 'replace' ? (
          <DialogCard
            colors={colors}
            title="Use your account's data?"
            body="Your account already has data saved. Continuing replaces what's on this phone with your account's copy. You can share a backup of this phone's data first."
            confirmLabel="Use account data"
            onConfirm={() => acceptReplace(dialog.rows)}
            onDecline={decline}
            extra={
              <Pressable
                onPress={() =>
                  void Share.share({ message: localSnapshotJson(), title: 'Manna Money backup' })
                }
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.primary }}>
                  Share a backup of this phone's data
                </Text>
              </Pressable>
            }
          />
        ) : null}
      </View>
    </Modal>
  )
}

function DialogCard({
  colors,
  title,
  body,
  confirmLabel,
  onConfirm,
  onDecline,
  extra,
}: {
  colors: ThemeColors
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onDecline: () => void
  extra?: ReactNode
}) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 400,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink }}>{title}</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted }}>
        {body}
      </Text>
      {extra}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
        <Pressable
          onPress={onDecline}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
            borderRadius: radii.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderStrong,
          }}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>
            Sign out
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
            borderRadius: radii.md,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.card }}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
