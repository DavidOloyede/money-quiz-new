/**
 * Client for our Node API. Every call attaches the current auth token as a
 * bearer credential; the server verifies it and resolves the user. All app
 * data (sync, Plaid, tickets, admin, events) flows through here — the app
 * never queries a database directly.
 *
 * Platform-neutral: it knows nothing about Vite env vars or Supabase. Each
 * platform calls `configureApi` once at startup (web: src/lib/configure.ts;
 * mobile: its platform setup) to wire in the base URL and a token getter.
 * Unconfigured, it stays safely local-only: cloud off, no token, '/api'.
 */

interface ApiConfig {
  /** Prefix for every request ('/api' same-origin, or an absolute URL). */
  baseUrl: string
  /** Resolves the current auth token, or null when signed out. */
  getToken: () => Promise<string | null>
  /** True when accounts are configured on this build/platform. */
  cloudEnabled: boolean
}

let config: ApiConfig = {
  baseUrl: '/api',
  getToken: async () => null,
  cloudEnabled: false,
}

/** Wire the platform's env + auth into the API client (call once at startup). */
export function configureApi(next: Partial<ApiConfig>): void {
  config = { ...config, ...next }
}

/** True when accounts are configured (auth credentials present). */
export function isCloudEnabled(): boolean {
  return config.cloudEnabled
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await config.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = opts
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(config.baseUrl + path, {
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
 * the sync/event flushers on tab hide, where an awaited token lookup can't
 * run. Token is passed in because we can't await a session lookup here.
 */
export function beaconPost(path: string, token: string | null, body: unknown): void {
  if (!token) return
  fetch(config.baseUrl + path, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => {
    // Tab is going away; nothing sensible to do with a failure.
  })
}
