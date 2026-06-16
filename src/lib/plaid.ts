/**
 * Client for the Plaid backend — our Node API's /api/plaid routes. Bank
 * connections are per-user and require sign-in; the browser never sees Plaid
 * secrets or access tokens, and transactions still end up in localStorage.
 */
import type { AccountType } from '../types'
import { api } from './api'
import { cloudEnabled } from './supabase'

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

/** True when bank connections are available (accounts configured) and need sign-in. */
export const plaidNeedsSignIn = cloudEnabled

export const plaidApi = {
  health: () => api.get<PlaidHealth>('/plaid/health'),
  createLinkToken: () => api.post<{ link_token: string; mode: string }>('/plaid/create_link_token'),
  mockConnect: (institution: string, accountType: AccountType) =>
    api.post<{ item: PlaidItemSummary }>('/plaid/mock_connect', { institution, accountType }),
  exchange: (public_token: string, institution: string, accountType: AccountType) =>
    api.post<{ item: PlaidItemSummary }>('/plaid/exchange_public_token', {
      public_token,
      institution,
      accountType,
    }),
  sync: (itemId: string) =>
    api.post<{ item: PlaidItemSummary; transactions: PlaidTxn[] }>('/plaid/sync', { itemId }, 20000),
  items: () => api.get<{ items: PlaidItemSummary[] }>('/plaid/items'),
  removeItem: (id: string) => api.del<{ ok: boolean }>(`/plaid/items/${encodeURIComponent(id)}`),
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
