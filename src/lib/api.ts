/**
 * Client for our Node API. Every call attaches the current Supabase auth token
 * as a bearer credential; the server verifies it and resolves the user. All
 * app data (sync, Plaid, tickets, admin, events) flows through here — the app
 * never queries a database directly.
 */
import { supabase } from './supabase'

const env = ((import.meta as unknown as { env?: Record<string, string> }).env) || {}
/** Same-origin '/api' in dev (Vite proxy) and prod; override for split deploys. */
export const API_BASE = env.VITE_API_URL || '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = opts
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(API_BASE + path, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        ...(rest.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeader()),
        ...(headers as Record<string, string> | undefined),
      },
    })
    const text = await res.text()
    const json = text ? (JSON.parse(text) as unknown) : null
    if (!res.ok) {
      throw new ApiError(res.status, (json as { error?: string })?.error || `Request failed (${res.status})`)
    }
    return json as T
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string, timeoutMs?: number) => request<T>(path, { method: 'GET', timeoutMs }),
  post: <T>(path: string, body?: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), timeoutMs }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * Fire-and-forget POST that survives the page unloading (keepalive). Used by
 * the sync/event flushers on tab hide, where supabase-js / awaited fetch can't
 * run. Token is passed in because we can't await a session lookup here.
 */
export function beaconPost(path: string, token: string | null, body: unknown): void {
  if (!token) return
  fetch(API_BASE + path, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => {
    // Tab is going away; nothing sensible to do with a failure.
  })
}
