/**
 * Client for the optional Plaid backend (server/plaidServer.mjs). The browser
 * never sees Plaid secrets; it only talks to our local server, which holds the
 * access token and proxies Plaid. Transactions still end up in localStorage.
 */
import type { AccountType } from '../types'

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

const BASE =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PLAID_API) ||
  'http://localhost:8787'

async function req<T>(path: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(BASE + path, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed (${res.status})`)
    return json as T
  } finally {
    clearTimeout(timer)
  }
}

export const plaidApi = {
  health: () => req<PlaidHealth>('/api/health', {}, 2500),
  createLinkToken: () =>
    req<{ link_token: string; mode: string }>('/api/plaid/create_link_token', {
      method: 'POST',
      body: '{}',
    }),
  mockConnect: (institution: string, accountType: AccountType) =>
    req<{ item: PlaidItemSummary }>('/api/plaid/mock_connect', {
      method: 'POST',
      body: JSON.stringify({ institution, accountType }),
    }),
  exchange: (public_token: string, institution: string, accountType: AccountType) =>
    req<{ item: PlaidItemSummary }>('/api/plaid/exchange_public_token', {
      method: 'POST',
      body: JSON.stringify({ public_token, institution, accountType }),
    }),
  sync: (itemId: string) =>
    req<{ item: PlaidItemSummary; transactions: PlaidTxn[] }>(
      '/api/plaid/sync',
      { method: 'POST', body: JSON.stringify({ itemId }) },
      20000,
    ),
  items: () => req<{ items: PlaidItemSummary[] }>('/api/plaid/items'),
  removeItem: (id: string) =>
    req<{ ok: boolean }>(`/api/plaid/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
