/**
 * Account context: who is signed in and how to sign in/out. Sits ABOVE the
 * StoreProvider so the data store can be remounted (re-read from localStorage)
 * when the signed-in user changes. With Supabase unconfigured this renders
 * children with a permanently signed-out context.
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
import { cloudEnabled, supabase } from './lib/supabase'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'user' | 'admin'
  created_at: string
}

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
    supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile | null) ?? null)
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error ? error.message : null
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
