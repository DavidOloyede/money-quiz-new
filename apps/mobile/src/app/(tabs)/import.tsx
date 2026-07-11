/**
 * Import — connect a bank or card through Plaid (the same /api/plaid routes
 * as the web; this app never sees credentials or access tokens) and manage
 * connected sources. CSV import stays desktop-first on the web app.
 */
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { createPlaidLinkSession } from 'react-native-plaid-link-sdk'
import { useStore, type AccountType, type ImportSource } from '@moneyquiz/core'
import { formatDate } from '@moneyquiz/core/lib/format'
import { plaidApi, plaidNeedsSignIn, type PlaidHealth } from '@moneyquiz/core/lib/plaid'

import { useAuth } from '@/lib/auth'
import { Button, Card, CardTitle, Note, Screen, Segmented, StatusLine } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

type Status =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'signin' }
  | { kind: 'down' }
  | { kind: 'ready'; health: PlaidHealth }

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'bank', label: 'Bank / checking' },
  { id: 'credit', label: 'Credit card' },
]

export default function ImportScreen() {
  const { colors } = useAppTheme()
  const { sources, hasData, loadSample, addPlaidSource, syncPlaidSource, removeSource } = useStore()
  const { loading: authLoading, session } = useAuth()
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('bank')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const signedIn = !!session
  useEffect(() => {
    // Bank connections live behind the account API, so they need accounts
    // configured and a signed-in user (same gating as the web's ConnectBank).
    if (!plaidNeedsSignIn()) {
      setStatus({ kind: 'unavailable' })
      return
    }
    if (authLoading) return
    if (!signedIn) {
      setStatus({ kind: 'signin' })
      return
    }
    let alive = true
    setStatus({ kind: 'loading' })
    plaidApi
      .health()
      .then((health) => alive && setStatus({ kind: 'ready', health }))
      .catch(() => alive && setStatus({ kind: 'down' }))
    return () => {
      alive = false
    }
  }, [authLoading, signedIn])

  const afterConnect = async (itemId: string, name: string) => {
    const n = await syncPlaidSource(itemId)
    setDone(`Connected ${name} — imported ${n} transaction${n === 1 ? '' : 's'}.`)
  }

  const connectMock = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const { item } = await plaidApi.mockConnect(institution, accountType)
      addPlaidSource(item)
      await afterConnect(item.id, item.institution)
      setInstitution('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.')
    } finally {
      setBusy(false)
    }
  }

  const connectPlaid = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const { link_token } = await plaidApi.createLinkToken()
      const linkSession = await createPlaidLinkSession({
        token: link_token,
        onSuccess: (success) => {
          void (async () => {
            try {
              const name = success.metadata.institution?.name || 'Bank'
              const { item } = await plaidApi.exchange(success.publicToken, name, accountType)
              addPlaidSource(item)
              await afterConnect(item.id, item.institution)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not finish connecting.')
            } finally {
              setBusy(false)
            }
          })()
        },
        onExit: (exit) => {
          setBusy(false)
          if (exit.error) setError('Plaid Link was closed before finishing.')
        },
        onEvent: () => {},
      })
      await linkSession.open()
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not start Plaid.')
    }
  }

  const confirmRemove = (s: ImportSource) => {
    Alert.alert(
      `Remove ${s.fileName}?`,
      'Its transactions come off this device (and your account, if you sync).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSource(s.id) },
      ],
    )
  }

  return (
    <Screen title="Import">
      <Card>
        <CardTitle
          right={
            status.kind === 'ready' ? (
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 11,
                  color: status.health.mode === 'mock' ? colors.accentDeep : colors.success,
                }}
              >
                {status.health.mode === 'mock' ? 'Demo mode' : `Plaid · ${status.health.env}`}
              </Text>
            ) : undefined
          }
        >
          🔗 Connect a bank or card
        </CardTitle>
        <Note>
          Link an account with Plaid to pull in and auto-categorize transactions. You log in with
          your bank inside Plaid — this app never sees your credentials.
        </Note>

        {status.kind === 'loading' && <Note>Checking the connection service…</Note>}
        {status.kind === 'unavailable' && (
          <Note>Bank connections aren&apos;t configured in this build.</Note>
        )}
        {status.kind === 'signin' && (
          <Note>
            Bank connections are tied to your account so they can follow you across devices. Sign
            in from Settings → Account to connect one.
          </Note>
        )}
        {status.kind === 'down' && (
          <Note>The connection service isn&apos;t reachable right now — try again in a moment.</Note>
        )}

        {status.kind === 'ready' && (
          <View style={{ gap: spacing.sm }}>
            {status.health.mode === 'mock' && (
              <TextInput
                value={institution}
                onChangeText={setInstitution}
                placeholder="Institution (optional), e.g. Chase"
                placeholderTextColor={colors.faint}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.borderStrong,
                  borderRadius: radii.md,
                  backgroundColor: colors.background,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: colors.text,
                }}
              />
            )}
            <Segmented options={ACCOUNT_TYPES} value={accountType} onChange={setAccountType} />
            <Button
              title={
                busy
                  ? 'Connecting…'
                  : status.health.mode === 'mock'
                    ? 'Connect (demo)'
                    : 'Connect with Plaid'
              }
              onPress={() => void (status.health.mode === 'mock' ? connectMock() : connectPlaid())}
              disabled={busy}
            />
          </View>
        )}

        {done && <StatusLine kind="success">✓ {done}</StatusLine>}
        {error && <StatusLine kind="error">✕ {error}</StatusLine>}
      </Card>

      {sources.length > 0 && (
        <Card>
          <CardTitle
            right={
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
                {sources.reduce((n, s) => n + s.count, 0)} transactions
              </Text>
            }
          >
            Connected sources
          </CardTitle>
          {sources.map((s) => (
            <SourceRow key={s.id} source={s} onRemove={() => confirmRemove(s)} />
          ))}
        </Card>
      )}

      {!hasData && (
        <Card>
          <CardTitle>Just exploring?</CardTitle>
          <Note>
            Load a realistic sample dataset to try the dashboard, quiz, and daily question without
            connecting anything.
          </Note>
          <Button title="Load sample data" variant="outline" onPress={loadSample} small />
        </Card>
      )}

      <Note>
        Have a CSV from your bank? Import it on the web app — it&apos;s much easier with a big
        screen, and everything syncs back here.
      </Note>
    </Screen>
  )
}

function SourceRow({ source, onRemove }: { source: ImportSource; onRemove: () => void }) {
  const { colors } = useAppTheme()
  const { syncPlaidSource } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const sync = async () => {
    setSyncing(true)
    setNote(null)
    try {
      const n = await syncPlaidSource(source.id)
      setNote(`Up to date — ${n} transactions.`)
    } catch {
      setNote('Sync failed — try again in a moment.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 15 }}>{source.kind === 'plaid' ? '🏦' : '📄'}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}
          >
            {source.fileName}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
            {source.count} transactions · added {formatDate(source.importedAt.slice(0, 10))}
          </Text>
        </View>
        {source.kind === 'plaid' && (
          <Button title={syncing ? 'Syncing…' : 'Sync'} variant="outline" small onPress={() => void sync()} disabled={syncing} />
        )}
        <Button title="Remove" variant="danger" small onPress={onRemove} />
      </View>
      {note && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>{note}</Text>
      )}
    </View>
  )
}
