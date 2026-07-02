/**
 * Web-only startup wiring: points the platform-neutral API client at the Vite
 * env and the Supabase session. Imported FIRST in main.tsx (before anything
 * that could fire a request) so the client never runs unconfigured. Mobile has
 * its own equivalent; this file must not be imported from shared code.
 */
import { configureApi } from '@moneyquiz/core/lib/api'
import { cloudEnabled, supabase } from './supabase'

const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {}

configureApi({
  // Same-origin '/api' in dev (Vite proxy) and prod; override for split deploys.
  baseUrl: env.VITE_API_URL || '/api',
  getToken: async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
  cloudEnabled,
})
