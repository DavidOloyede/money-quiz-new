/**
 * Client for the Plaid backend. With Supabase configured it talks to the
 * multi-tenant `plaid` Edge Function (per-user, sign-in required); otherwise
 * it falls back to the local single-user dev server (server/plaidServer.mjs).
 * Either way the browser never sees Plaid secrets or access tokens;
 * transactions still end up in localStorage.
 */
import type { AccountType } from '../types'
import { cloudEnabled, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'

export interface PlaidHealth {
  mode: 'mock' | 'plaid'
  env: string
}

export interface PlaidItemSummary {
  id: string
  institution: string
  accountType: AccountType
  kind: 'plaid'
  mock: boolean
  count: number
}

/** Plaid's transaction shape (the subset we use). amount > 0 = money out. */
export interface PlaidTxn {
  transaction_id: string
  account_id?: string
  date: string
  name?: string
  merchant_name?: string | null
  amount: number
  pending?: boolean
  personal_finance_category?: { primary?: string; detailed?: string }
}

const LOCAL_BASE =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PLAID_API) ||
  'http://localhost:8787'

/** True when bank connections go through the cloud (and require sign-in). */
export const plaidNeedsSignIn = cloudEnabled

/** `path` uses the Edge Function shape ('/health', '/sync', '/items/:id'). */
async function req<T>(path: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  let url: string
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cloudEnabled && supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Sign in to connect a bank.')
    url = `${SUPABASE_URL}/functions/v1/plaid${path}`
    headers.apikey = SUPABASE_ANON_KEY
    headers.Authorization = `Bearer ${token}`
  } else {
    // Local dev server keeps its original route shape.
    url = LOCAL_BASE + (path === '/health' ? '/api/health' : `/api/plaid${path}`)
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { ...headers, ...(opts.headers || {}) },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed (${res.status})`)
    return json as T
  } finally {
    clearTimeout(timer)
  }
}

export const plaidApi = {
  // Cold-started edge functions can take a moment; give health a bit longer.
  health: () => req<PlaidHealth>('/health', {}, cloudEnabled ? 6000 : 2500),
  createLinkToken: () =>
    req<{ link_token: string; mode: string }>('/create_link_token', {
      method: 'POST',
      body: '{}',
    }),
  mockConnect: (institution: string, accountType: AccountType) =>
    req<{ item: PlaidItemSummary }>('/mock_connect', {
      method: 'POST',
      body: JSON.stringify({ institution, accountType }),
    }),
  exchange: (public_token: string, institution: string, accountType: AccountType) =>
    req<{ item: PlaidItemSummary }>('/exchange_public_token', {
      method: 'POST',
      body: JSON.stringify({ public_token, institution, accountType }),
    }),
  sync: (itemId: string) =>
    req<{ item: PlaidItemSummary; transactions: PlaidTxn[] }>(
      '/sync',
      { method: 'POST', body: JSON.stringify({ itemId }) },
      20000,
    ),
  items: () => req<{ items: PlaidItemSummary[] }>('/items'),
  removeItem: (id: string) =>
    req<{ ok: boolean }>(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

interface PlaidLinkMetadata {
  institution?: { name?: string } | null
}

/**
 * Load Plaid's hosted Link script from their CDN and open it. Used only in real
 * (non-mock) mode; the user authenticates with their bank inside Plaid's iframe,
 * so credentials never touch this app.
 */
export function openPlaidLink(
  token: string,
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void,
  onExit?: (err: unknown) => void,
) {
  const w = window as unknown as {
    Plaid?: { create: (opts: Record<string, unknown>) => { open: () => void } }
  }
  const start = () => {
    const handler = w.Plaid!.create({
      token,
      onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => onSuccess(publicToken, metadata),
      onExit: (err: unknown) => onExit?.(err),
    })
    handler.open()
  }
  if (w.Plaid) return start()
  const s = document.createElement('script')
  s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
  s.onload = start
  s.onerror = () => onExit?.(new Error('Failed to load Plaid Link'))
  document.head.appendChild(s)
}
