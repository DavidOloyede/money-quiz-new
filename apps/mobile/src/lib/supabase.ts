/**
 * Supabase is used ONLY for authentication on mobile — sign in/up, session and
 * token refresh, and the Google OAuth redirect. All app data goes through our
 * Node API (@moneyquiz/core/lib/api); this client never touches the database
 * directly. Mirrors the web's src/lib/supabase.ts, but React-Native-flavored:
 *
 * - `react-native-url-polyfill/auto` gives supabase-js a real URL/URLSearchParams.
 * - Sessions persist in the same MMKV store the app data uses (sync, no
 *   AsyncStorage).
 * - `detectSessionInUrl: false` because there's no browser URL to read a
 *   session back from; the OAuth redirect is handled explicitly in auth.tsx.
 * - Token auto-refresh is gated on AppState so it only runs while the app is
 *   foregrounded (the pattern Supabase recommends for React Native).
 *
 * Accounts stay optional: with no EXPO_PUBLIC_SUPABASE_* env the client is null
 * and every cloud surface hides itself, leaving the local-only app untouched.
 */
import 'react-native-url-polyfill/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import { mmkv } from './mmkv'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: {
            getItem: (key) => mmkv.getString(key) ?? null,
            // Block bodies: MMKV's set/remove return a boolean, but Supabase's
            // storage adapter expects void.
            setItem: (key, value) => {
              mmkv.set(key, value)
            },
            removeItem: (key) => {
              mmkv.remove(key)
            },
          },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // PKCE is the mobile-appropriate OAuth flow: the code verifier lives
          // in the MMKV auth storage above and auth.tsx exchanges the returned
          // code for a session.
          flowType: 'pkce',
        },
      })
    : null

/** True when accounts are configured (Supabase auth credentials present). */
export const cloudEnabled = supabase !== null

// Refresh tokens only while the app is in the foreground. Supabase advises
// against a background refresh timer on mobile; AppState drives it instead.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
