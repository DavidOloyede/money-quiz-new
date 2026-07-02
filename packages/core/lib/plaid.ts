/**
 * Client for the Plaid backend — our Node API's /api/plaid routes. Bank
 * connections are per-user and require sign-in; the browser never sees Plaid
 * secrets or access tokens, and transactions still end up in localStorage.
 */
import type { AccountType } from '../types'
import { api, isCloudEnabled } from './api'

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

/** An item plus its stored raw transactions, for the categorization debug panel. */
export interface RawPlaidItem {
  id: string
  institution: string
  accountType: AccountType
  mock: boolean
  transactions: PlaidTxn[]
}

/** True when bank connections are available (accounts configured) and need sign-in. */
export function plaidNeedsSignIn(): boolean {
  return isCloudEnabled()
}

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
  // Read-only: stored raw transactions per item (no Plaid call). Debug only.
  raw: () => api.get<{ items: RawPlaidItem[] }>('/plaid/raw'),
}
