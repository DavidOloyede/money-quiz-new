/**
 * The Account screen: sign in / create account (email+password; Google is
 * built but switched off, see SHOW_GOOGLE_SIGN_IN) when
 * signed out; profile, sync status, and sign-out when signed in. The mobile
 * counterpart of the web's AccountView — same warm copy, themed from the
 * shared tokens.
 */
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { useAuth } from '@/lib/auth'
import { useSync } from '@/lib/sync'
import { fonts, radii, spacing, useAppTheme, type ThemeColors } from '@/theme'

export default function AccountScreen() {
  const { theme, colors } = useAppTheme()
  const { enabled, loading, session } = useAuth()
  const params = useLocalSearchParams<{ mode?: string }>()

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Account',
          // Reached from Settings, the welcome screen or a card, so a plain "Back".
          headerBackTitle: 'Back',
          headerTitleStyle: { fontFamily: fonts.rounded, color: colors.ink },
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          {!enabled ? (
            <Card colors={colors}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted }}>
                Accounts aren&apos;t configured in this build. The app runs fully on this device.
              </Text>
            </Card>
          ) : loading ? (
            <Card colors={colors}>
              <ActivityIndicator color={colors.primary} />
            </Card>
          ) : session ? (
            <>
              <ProfileCard colors={colors} />
              <SyncCard colors={colors} />
            </>
          ) : (
            <SignInCard colors={colors} theme={theme} initialMode={params.mode === 'signup' ? 'signup' : 'signin'} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

/**
 * Google sign-in is switched off for now (David, Sep 2026): email and
 * password only. The flow below is kept intact; flipping this back on also
 * needs `mannamoney://auth` in the Supabase redirect allow-list.
 */
const SHOW_GOOGLE_SIGN_IN = false

function SignInCard({
  colors,
  theme,
  initialMode,
}: {
  colors: ThemeColors
  theme: 'light' | 'dark'
  /** The welcome screen's "Create a free account" opens straight to sign-up. */
  initialMode: 'signin' | 'signup'
}) {
  const { signUpWithPassword, signInWithPassword, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const err = await signUpWithPassword(email.trim(), password)
        if (err) setError(err)
        else
          setInfo(
            'Account created. If a confirmation email is required, check your inbox — otherwise you are now signed in.',
          )
      } else {
        const err = await signInWithPassword(email.trim(), password)
        if (err) setError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.text,
  }

  return (
    <Card colors={colors}>
      {/* Segmented sign in / create account toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'flex-start',
          padding: 2,
          borderRadius: radii.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}
      >
        {(
          [
            { id: 'signin', label: 'Sign in' },
            { id: 'signup', label: 'Create account' },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => {
              setMode(opt.id)
              setError(null)
              setInfo(null)
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radii.md - 2,
              backgroundColor: mode === opt.id ? colors.primary : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: mode === opt.id ? colors.card : colors.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted }}>
        {mode === 'signin'
          ? 'Welcome back. Your data syncs to this device when you sign in.'
          : 'An account keeps your data backed up and lets you use it on any device.'}
      </Text>

      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor={colors.faint}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
      />
      <TextInput
        style={inputStyle}
        placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
        placeholderTextColor={colors.faint}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        secureTextEntry
      />

      {error && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: '#dc2626' }}>{error}</Text>
      )}
      {info && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.primary }}>{info}</Text>
      )}

      <Pressable
        onPress={() => void submit()}
        disabled={busy}
        style={{
          alignItems: 'center',
          paddingVertical: spacing.sm + 2,
          borderRadius: radii.md,
          backgroundColor: colors.primary,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.card }}>
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>

      {SHOW_GOOGLE_SIGN_IN && (
        <>
          {/* or divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>OR</Text>
            <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          </View>

          <Pressable
            onPress={() => {
              setError(null)
              void signInWithGoogle().then((err) => err && setError(err))
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.borderStrong,
            }}
          >
            <GoogleMark theme={theme} />
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text }}>
              Continue with Google
            </Text>
          </Pressable>
        </>
      )}
    </Card>
  )
}

function ProfileCard({ colors }: { colors: ThemeColors }) {
  const { session, profile, isAdmin, signOut } = useAuth()
  const email = profile?.email ?? session?.user.email ?? ''
  const since = profile ? new Date(profile.created_at).toLocaleDateString() : null

  return (
    <Card colors={colors}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontFamily: fonts.rounded, fontSize: 20, color: colors.card }}>
            {(email[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontFamily: fonts.sansSemiBold, fontSize: 16, color: colors.ink }}
            >
              {email}
            </Text>
            {isAdmin && (
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radii.md,
                  backgroundColor: colors.accent,
                }}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: colors.ink }}>
                  Admin
                </Text>
              </View>
            )}
          </View>
          {since && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
              Member since {since}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={() => void signOut()}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderStrong,
        }}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>
          Sign out
        </Text>
      </Pressable>
    </Card>
  )
}

/** Sync status + a manual "Sync now" — the same states the web AccountView shows. */
function SyncCard({ colors }: { colors: ThemeColors }) {
  const sync = useSync()
  const [resyncing, setResyncing] = useState(false)

  const syncLabel = !sync.active
    ? 'Not syncing on this device'
    : sync.status === 'error'
      ? 'Sync error — will retry on your next change'
      : sync.pendingCount > 0 || sync.status === 'pushing'
        ? 'Saving changes…'
        : sync.lastSyncAt
          ? `Synced ${new Date(sync.lastSyncAt).toLocaleTimeString()}`
          : 'Synced'

  return (
    <Card colors={colors}>
      <Text style={{ fontFamily: fonts.rounded, fontSize: 16, color: colors.ink }}>Sync</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted }}>
        Changes save to your account automatically. {syncLabel}.
      </Text>
      <Pressable
        onPress={() => {
          setResyncing(true)
          void sync.resync().finally(() => setResyncing(false))
        }}
        disabled={!sync.active || resyncing}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderStrong,
          opacity: !sync.active || resyncing ? 0.4 : 1,
        }}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>
          {resyncing ? 'Syncing…' : 'Sync now'}
        </Text>
      </Pressable>
    </Card>
  )
}

/** A wordless brand-tinted "G" — keeps the button dependency-free (no SVG). */
function GoogleMark({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === 'dark' ? '#ffffff' : '#f1f3f4',
      }}
    >
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: '#4285F4' }}>G</Text>
    </View>
  )
}

function Card({ colors, children }: { colors: ThemeColors; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radii.lg,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {children}
    </View>
  )
}
