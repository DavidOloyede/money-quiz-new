/**
 * Settings — account entry point, appearance, data controls, and support.
 * Heavier editing (categories, budgets, exports) deliberately stays on the
 * web app's bigger screen.
 */
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { Alert, Pressable, Text, View } from 'react-native'
import { useStore, type ThemeMode } from '@moneyquiz/core'

import { useAuth } from '@/lib/auth'
import { Support } from '@/components/Support'
import { Button, Card, CardTitle, Note, Screen, Segmented } from '@/components/ui'
import { fonts, spacing, useAppTheme } from '@/theme'

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: '☀️ Light' },
  { id: 'dark', label: '🌙 Dark' },
]

export default function SettingsScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const { enabled, session, profile } = useAuth()
  const { theme, setTheme, hasData, loadSample, clearAll } = useStore()

  const confirmClear = () => {
    Alert.alert(
      'Clear all data?',
      'Transactions, budgets, and edits come off this device (and your account, if you sync). Your XP, streak, and badges stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all data', style: 'destructive', onPress: clearAll },
      ],
    )
  }

  return (
    <Screen title="Settings">
      {/* Account */}
      {enabled && (
        <Pressable onPress={() => router.push('/account')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: session ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 17, color: session ? colors.card : colors.muted }}>
                  {session ? (profile?.email?.[0] ?? session.user.email?.[0] ?? '?').toUpperCase() : '?'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}
                >
                  {session ? (profile?.email ?? session.user.email) : 'Sign in or create an account'}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                  {session
                    ? 'Account, sync status, sign out'
                    : 'Back up your data and use it on any device'}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 18, color: colors.faint }}>›</Text>
            </View>
          </Card>
        </Pressable>
      )}

      {/* Appearance */}
      <Card>
        <CardTitle>Appearance</CardTitle>
        <Segmented options={THEMES} value={theme} onChange={setTheme} />
      </Card>

      {/* Data */}
      <Card>
        <CardTitle>Your data</CardTitle>
        <Note>
          Everything lives on this device{session ? ' and syncs to your account' : ''}. Category
          editing and CSV/JSON export live on the web app.
        </Note>
        {!hasData && <Button title="Load sample data" variant="outline" small onPress={loadSample} />}
        <Button title="Clear all data" variant="danger" small onPress={confirmClear} disabled={!hasData} />
      </Card>

      {/* Support */}
      <Support />

      {/* About */}
      <Note>
        Manna Money {Constants.expoConfig?.version ?? ''} — steward your daily bread. 🍞
      </Note>
    </Screen>
  )
}
