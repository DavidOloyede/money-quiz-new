/**
 * Mobile startup wiring — installs the platform half of the core seams.
 * Imported FIRST in the root layout (before anything touches the store or
 * API client) so core never runs unconfigured. The web equivalent is
 * src/lib/configure.ts.
 */
import { configureApi } from '@moneyquiz/core/lib/api'
import { setStorageBackend } from '@moneyquiz/core/lib/storage'
import { setThemeAdapter } from '@moneyquiz/core/lib/themeAdapter'
import { Appearance } from 'react-native'
import { mmkv } from './mmkv'
import { cloudEnabled, supabase } from './supabase'

// MMKV, never AsyncStorage: storage.ts reads are synchronous by contract —
// store.tsx hydrates its useState initializers straight from them.

setStorageBackend({
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key)
  },
})

setThemeAdapter({
  systemTheme: () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'),
  // Overriding the app-level scheme keeps native chrome (alerts, keyboard,
  // date pickers) in step with the store's chosen theme.
  apply: (mode) => Appearance.setColorScheme(mode),
})

// The signed-in user's JWT, attached to every API request; the Node API
// verifies it and scopes the query. Kept fresh from auth events instead of
// calling supabase.auth.getSession() per request: getSession serializes on an
// internal lock that can deadlock under React Native's concurrent auth
// traffic (a sign-in notification racing the sync pull it triggers).
let accessToken: string | null = null
supabase?.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? null
})

configureApi({
  // The iOS Simulator shares the Mac's network, so localhost reaches the dev
  // API (`npm run server`, port 8787). A physical device needs the Mac's LAN
  // address in EXPO_PUBLIC_API_URL instead.
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787/api',
  getToken: async () => accessToken,
  cloudEnabled,
})
