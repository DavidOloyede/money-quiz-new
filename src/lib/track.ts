/**
 * Lightweight product analytics: batched events into the activity_events
 * table, readable from the in-app Admin panel. Signed out (or with Supabase
 * unconfigured) events are dropped — we only ever record activity for people
 * with accounts.
 *
 * PRIVACY RULE: event props must never contain transaction descriptions,
 * merchant names, or amounts. Counts, categories of action, and durations
 * are fine; financial data is not.
 */
import { cloudEnabled, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'

interface ActivityEvent {
  session_id: string
  name: string
  props: Record<string, unknown>
  client_ts: string
}

const FLUSH_AT = 20
const FLUSH_MS = 10_000
const QUEUE_CAP = 200

let queue: ActivityEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let accessToken: string | null = null
let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  try {
    const existing = sessionStorage.getItem('moneyquiz.session')
    if (existing) return (sessionId = existing)
    const fresh = crypto.randomUUID()
    sessionStorage.setItem('moneyquiz.session', fresh)
    return (sessionId = fresh)
  } catch {
    return (sessionId = crypto.randomUUID())
  }
}

// Keep a token handy so flushes (incl. keepalive on tab close) are sync-safe.
if (supabase) {
  void supabase.auth.getSession().then(({ data }) => {
    accessToken = data.session?.access_token ?? null
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null
    if (!accessToken) queue = [] // signed out: drop anything unsent
  })
}

function send(events: ActivityEvent[], keepalive: boolean) {
  if (!accessToken || events.length === 0) return
  fetch(`${SUPABASE_URL}/rest/v1/activity_events`, {
    method: 'POST',
    keepalive,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(events),
  }).catch(() => {
    // Re-queue on network failure, newest first wins under the cap.
    queue = [...events, ...queue].slice(0, QUEUE_CAP)
  })
}

function flush(keepalive = false) {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (queue.length === 0) return
  const batch = queue
  queue = []
  send(batch, keepalive)
}

/** Record a product event. No-op when signed out or cloud is unconfigured. */
export function track(name: string, props: Record<string, unknown> = {}): void {
  if (!cloudEnabled || !accessToken) return
  queue.push({
    session_id: getSessionId(),
    name,
    props,
    client_ts: new Date().toISOString(),
  })
  if (queue.length > QUEUE_CAP) queue = queue.slice(-QUEUE_CAP)
  if (queue.length >= FLUSH_AT) {
    flush()
  } else if (!timer) {
    timer = setTimeout(() => flush(), FLUSH_MS)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  // Errors become events too, so the admin activity log shows them in context
  // (Sentry separately captures the full stack trace).
  window.addEventListener('error', (e) => {
    track('app.error', { message: String(e.message ?? 'unknown').slice(0, 300) })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason)
    track('app.error', { message: reason.slice(0, 300), unhandledRejection: true })
  })
}
