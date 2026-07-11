/**
 * Root layout: installs the platform seams (the platform import must stay
 * first), loads the brand fonts, mounts the shared store, and themes the
 * navigation shell from it.
 */
import '@/lib/platform'

import { StoreProvider, useStore } from '@moneyquiz/core'
import { useFonts } from 'expo-font'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AuthProvider } from '@/lib/auth'
import { ensureReminderScheduled } from '@/lib/reminder'
import { SyncDialogs, SyncProvider } from '@/lib/sync'
import { palette } from '@/theme'

SplashScreen.preventAutoHideAsync()

// Re-assert the daily-reminder schedule saved on this device (fire and
// forget — nothing in the UI waits on it).
void ensureReminderScheduled()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
    'Fraunces-SemiBold': require('../../assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  // Auth above sync above the store: sync watches the session and, on the
  // account boundary, bumps the epoch so the store re-reads MMKV (after a
  // login pull or a sign-out wipe).
  return (
    <AuthProvider>
      <SyncProvider>
        {(epoch) => (
          <StoreProvider key={epoch}>
            <ThemedShell />
          </StoreProvider>
        )}
      </SyncProvider>
    </AuthProvider>
  )
}

/** Separate from RootLayout because useStore needs the provider above it. */
function ThemedShell() {
  const { theme } = useStore()
  const colors = palette[theme]
  const base = theme === 'dark' ? DarkTheme : DefaultTheme
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.ink,
          border: colors.border,
        },
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <SyncDialogs />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  )
}
