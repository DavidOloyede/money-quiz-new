/**
 * Account context for mobile: who is signed in and how to sign in/out. Mounts
 * above the store so screens can read the session and profile. The web app has
 * its own auth.tsx — the OAuth redirect flow differs structurally between a
 * browser and a native app, so the providers stay separate and share only the
 * Profile type (via @moneyquiz/core). With Supabase unconfigured this renders a
 * permanently signed-out context and the app runs fully on-device.
 *
 * SyncProvider (lib/sync.tsx) watches this context: signing in pulls the
 * account's slices, signing out clears them from the device.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { api } from '@moneyquiz/core/lib/api'
import type { Profile } from '@moneyquiz/core/types'
import { cloudEnabled, supabase } from './supabase'

// Finishes any auth session that was pending when the app was backgrounded
// during the browser redirect.
WebBrowser.maybeCompleteAuthSession()

// Where Google sends the user back. This exact URL must be in the Supabase
// project's "Redirect URLs" allow-list; `mannamoney` is the scheme from
// app.json (a dev build registers it — Expo Go can't run this app anyway).
const redirectTo = makeRedirectUri({ scheme: 'mannamoney', path: 'auth' })

interface AuthValue {
  /** False when the app was built without Supabase credentials. */
  enabled: boolean
  /** True while the initial session is being restored. */
  loading: boolean
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  /** All sign-in helpers resolve to an error message, or null on success. */
  signUpWithPassword: (email: string, password: string) => Promise<string | null>
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

const SIGNED_OUT: AuthValue = {
  enabled: false,
  loading: false,
  session: null,
  profile: null,
  isAdmin: false,
  signUpWithPassword: async () => 'Accounts are not configured',
  signInWithPassword: async () => 'Accounts are not configured',
  signInWithGoogle: async () => 'Accounts are not configured',
  signOut: async () => {},
}

const AuthContext = createContext<AuthValue>(SIGNED_OUT)

export function useAuth(): AuthValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(cloudEnabled)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })
    // Consumers key off session.user.id (not object identity), so passing
    // token refreshes straight through is safe and keeps API calls authorized.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    // The Node API resolves (and creates on first sign-in) the profile.
    api
      .get<Profile>('/me')
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Accounts are not configured'
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? error.message : null
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Accounts are not configured'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return 'Accounts are not configured'
    // Native OAuth: get Supabase's provider URL, open it in the system browser,
    // then exchange the code it redirects back with for a session (PKCE).
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error) return error.message
    if (!data.url) return 'Could not start Google sign-in'

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    // User dismissed the browser without finishing — not an error.
    if (result.type !== 'success') return null

    const code = new URL(result.url).searchParams.get('code')
    if (!code) return 'Google sign-in returned no session'
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    return exchangeError ? exchangeError.message : null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      enabled: cloudEnabled,
      loading,
      session,
      profile,
      isAdmin: profile?.role === 'admin',
      signUpWithPassword,
      signInWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [loading, session, profile, signUpWithPassword, signInWithPassword, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
