/**
 * Welcome — the phone's short, calm version of the web's landing page, shown
 * to someone signed out with no data (see (tabs)/_layout). One screen: the
 * promise, three steps, and the ways in: create an account, connect a bank,
 * or try the sample year. Picking any of them (or "Look around first")
 * answers it for this launch.
 */
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter, type Href } from 'expo-router'
import { useStore } from '@moneyquiz/core'

import { MannaLogo } from '@/components/MannaLogo'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { answerWelcome } from '@/lib/welcome'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

const STEPS = [
  {
    title: 'Connect your bank',
    body: 'Link it through Plaid. You sign in inside Plaid, so we never see your password.',
  },
  { title: 'See your categories', body: 'Every purchase lands in a category. Open one to see exactly what’s inside.' },
  { title: 'Plan your whole year', body: 'The Year Sheet lays out every month, with the months ahead projected.' },
]

export default function WelcomeScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const { loadSample } = useStore()
  const { enabled: accountsEnabled } = useAuth()

  // Land on the tabs first, so every way in has somewhere to go back to.
  const go = (then?: Href) => {
    answerWelcome()
    router.replace('/')
    if (then) router.push(then)
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          {/* The morning-sky band, in flat tones (no gradient library on the phone) */}
          <View
            style={{
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.xl,
              paddingHorizontal: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: colors.infoSoft,
            }}
          >
            <MannaLogo size={64} />
            <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 30, lineHeight: 36, textAlign: 'center', color: colors.ink }}>
              Enough for today.{'\n'}A plan for tomorrow.
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, textAlign: 'center', color: colors.text }}>
              Manna Money turns your real transactions into 2-minute questions, simple budgets and small
              wins worth celebrating. Free and private.
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            {STEPS.map((s, i) => (
              <View key={s.title} style={{ flexDirection: 'row', gap: spacing.sm + 4 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primarySoft,
                  }}
                >
                  <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 14, color: colors.success }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.rounded, fontSize: 17, color: colors.ink }}>{s.title}</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted }}>{s.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ gap: spacing.sm + 2 }}>
            {accountsEnabled && (
              <Button title="Create a free account" onPress={() => go({ pathname: '/account', params: { mode: 'signup' } })} />
            )}
            <Button
              title="Try it with sample data"
              variant={accountsEnabled ? 'outline' : 'primary'}
              onPress={() => {
                loadSample()
                go('/dashboard')
              }}
            />
            <Button title="Connect a bank" variant="outline" onPress={() => go('/import')} />
            <Text
              onPress={() => go()}
              suppressHighlighting
              style={{ alignSelf: 'center', padding: spacing.sm, fontFamily: fonts.roundedSemi, fontSize: 15, color: colors.muted }}
            >
              Look around first
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}
