/**
 * Phase E debug screen — proves the scaffold end to end: shared store
 * hydrating through MMKV, a moneyquiz.* key surviving relaunches, the theme
 * seam flipping light/dark, brand fonts rendering, and the API client
 * reaching the dev server. Real screens replace this in later phases.
 */
import { useStore } from '@moneyquiz/core'
import { api } from '@moneyquiz/core/lib/api'
import { loadJSON, saveJSON } from '@moneyquiz/core/lib/storage'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { fonts, radii, spacing, useAppTheme } from '@/theme'

/** Mobile-only diagnostic key; not a synced slice, so not in STORAGE_KEYS. */
const DEBUG_KEY = 'moneyquiz.debug.v1'

interface DebugStamp {
  savedAt: string
}

interface PlaidHealth {
  mode: string
  env: string
}

type ApiState =
  | { status: 'checking' }
  | { status: 'ok'; health: PlaidHealth }
  | { status: 'error'; message: string }

export default function DebugScreen() {
  const { theme, colors } = useAppTheme()
  const { transactions, hasData, setTheme } = useStore()

  // Read what the previous launch wrote, then stamp this launch — together
  // they prove writes reach MMKV and survive a full app restart.
  const [previousStamp] = useState(() => loadJSON<DebugStamp | null>(DEBUG_KEY, null))
  const [thisStamp] = useState(() => {
    const stamp = { savedAt: new Date().toISOString() }
    saveJSON(DEBUG_KEY, stamp)
    return stamp
  })
  const roundTrip = loadJSON<DebugStamp | null>(DEBUG_KEY, null)?.savedAt === thisStamp.savedAt

  const [apiState, setApiState] = useState<ApiState>({ status: 'checking' })
  const pingApi = () => {
    setApiState({ status: 'checking' })
    api
      .get<PlaidHealth>('/plaid/health')
      .then((health) => setApiState({ status: 'ok', health }))
      .catch((err: unknown) =>
        setApiState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
      )
  }
  useEffect(pingApi, [])

  const card = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink }}>
            Manna Money
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>
            Steward your daily bread
          </Text>
          <Text
            style={{
              fontFamily: fonts.displayItalic,
              fontSize: 15,
              color: colors.accent,
              marginTop: spacing.sm,
            }}
          >
            “Give us today our daily bread.”
          </Text>
        </View>

        <View style={card}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}>
            Storage (MMKV)
          </Text>
          <Row label="Round-trip" value={roundTrip ? 'pass' : 'FAIL'} ok={roundTrip} colors={colors} />
          <Row
            label="Previous launch"
            value={previousStamp ? previousStamp.savedAt : 'first launch'}
            ok={previousStamp !== null}
            colors={colors}
          />
          <Row
            label="Store hydrated"
            value={`${transactions.length} transactions${hasData ? '' : ' (empty is right)'}`}
            ok
            colors={colors}
          />
        </View>

        <View style={card}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}>
            Theme
          </Text>
          <Row label="Active" value={theme} ok colors={colors} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setTheme(mode)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  backgroundColor: theme === mode ? colors.primary : colors.background,
                  borderColor: colors.borderStrong,
                  borderWidth: theme === mode ? 0 : StyleSheet.hairlineWidth,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 14,
                    color: theme === mode ? colors.card : colors.text,
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={card}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}>
            API
          </Text>
          <Row
            label="Base URL"
            value={process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787/api'}
            ok
            colors={colors}
          />
          {apiState.status === 'checking' && (
            <Row label="/plaid/health" value="checking…" ok colors={colors} />
          )}
          {apiState.status === 'ok' && (
            <Row
              label="/plaid/health"
              value={`mode=${apiState.health.mode} env=${apiState.health.env}`}
              ok
              colors={colors}
            />
          )}
          {apiState.status === 'error' && (
            <Row label="/plaid/health" value={apiState.message} ok={false} colors={colors} />
          )}
          <Pressable
            onPress={pingApi}
            style={{
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radii.md,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.card }}>
              Ping again
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({
  label,
  value,
  ok,
  colors,
}: {
  label: string
  value: string
  ok: boolean
  colors: ReturnType<typeof useAppTheme>['colors']
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 13,
          color: ok ? colors.text : '#dc2626',
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  )
}
