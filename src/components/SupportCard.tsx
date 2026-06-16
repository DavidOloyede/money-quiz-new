/**
 * Help & support: signed-in users file tickets and read replies here; admins
 * answer from the Admin panel. The Node API scopes every ticket to its owner.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { api, ApiError } from '../lib/api'
import { track } from '../lib/track'
import { LifeBuoyIcon } from './icons'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Ticket {
  id: string
  user_id: string
  subject: string
  body: string
  category: string | null
  status: TicketStatus
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
}

export const TICKET_CATEGORIES = ['Bug', 'Question', 'Feature request', 'Bank connection', 'Other']

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  in_progress: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300',
  resolved: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  closed: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none'

/** Message thread + reply box, shared with the admin panel. */
export function TicketThread({
  ticket,
  selfId,
  otherLabel = 'Support',
  admin = false,
  onReplied,
}: {
  ticket: Ticket
  selfId: string
  /** How to label messages from the other side ('Support' for users, 'User' for admins). */
  otherLabel?: string
  /** Use the admin message endpoints (sees/answers any user's ticket). */
  admin?: boolean
  onReplied?: () => void
}) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const base = admin ? `/admin/tickets/${ticket.id}` : `/tickets/${ticket.id}`

  const load = useCallback(async () => {
    const { messages } = await api.get<{ messages: TicketMessage[] }>(`${base}/messages`)
    setMessages(messages ?? [])
  }, [base])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      await api.post(`${base}/messages`, { body: reply.trim() })
      setReply('')
      await load()
      onReplied?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
        {ticket.body}
      </div>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
            m.author_id === selfId
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
          }`}
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {m.author_id === selfId ? 'You' : otherLabel} ·{' '}
            {new Date(m.created_at).toLocaleString()}
          </div>
          {m.body}
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply…"
          className={inputCls}
        />
        <button
          onClick={() => void send()}
          disabled={busy || !reply.trim()}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          Reply
        </button>
      </div>
    </div>
  )
}

export function SupportCard() {
  const { enabled, session } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(TICKET_CATEGORIES[0])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = session?.user.id

  const load = useCallback(async () => {
    if (!userId) return
    const { tickets } = await api.get<{ tickets: Ticket[] }>('/tickets')
    setTickets(tickets ?? [])
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  if (!enabled) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/tickets', { subject: subject.trim(), body: body.trim(), category })
      track('support.ticket_created', { category })
      setSubject('')
      setBody('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your ticket.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <LifeBuoyIcon className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Help &amp; support</h3>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Found a bug or need a hand? Send us a ticket and we&apos;ll reply right here.
      </p>

      {!session ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Sign in from the <span className="font-medium">Account</span> tab to submit a ticket.
        </p>
      ) : (
        <>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              New ticket
            </button>
          )}

          {showForm && (
            <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className={inputCls}
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened? What did you expect?"
                rows={4}
                className={inputCls}
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !subject.trim() || !body.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {busy ? 'Sending…' : 'Send ticket'}
                </button>
              </div>
            </form>
          )}

          {tickets.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((t) => (
                <li key={t.id} className="py-2">
                  <button
                    onClick={() => setOpenId(openId === t.id ? null : t.id)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t.subject}
                    </span>
                    <StatusBadge status={t.status} />
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {new Date(t.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                  {openId === t.id && userId && (
                    <TicketThread ticket={t} selfId={userId} onReplied={load} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
