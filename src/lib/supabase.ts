/**
 * Supabase client for accounts, cloud sync, support tickets, and the admin
 * panel. Cloud features are entirely optional: with no env configured the
 * client is null and every cloud surface in the app hides itself, leaving the
 * original local-only experience untouched.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {}

export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

/** True when the app was built with Supabase credentials. */
export const cloudEnabled = supabase !== null
