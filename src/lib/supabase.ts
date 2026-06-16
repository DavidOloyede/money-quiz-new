/**
 * Supabase is used ONLY for authentication — login, session/token refresh, the
 * Google OAuth redirect, and password-reset emails. All app data goes through
 * our own Node API (see src/lib/api.ts); this client never touches the
 * database directly. Accounts are optional: with no env configured the client
 * is null and every cloud surface hides itself, leaving the original
 * local-only experience untouched.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {}

export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

/** True when accounts are configured (Supabase auth credentials present). */
export const cloudEnabled = supabase !== null
