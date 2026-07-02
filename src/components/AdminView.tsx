/**
 * Admin panel (role = admin only): metrics, users, activity log, and the
 * support-ticket queue. Everything goes through the Node API's /api/admin
 * routes, which are gated by requireAdmin — the nav gate is just cosmetics.
 * There is no admin endpoint for user_slices, so admins never see anyone's
 * financial data.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth, type Profile } from '../auth'
import { api } from '@moneyquiz/core/lib/api'
import { StatusBadge, TicketThread, type Ticket, type TicketStatus } from './SupportCard'
import { PlaidDebugTab } from './PlaidDebugTab'

type Tab = 'metrics' | 'users' | 'activity' | 'tickets' | 'plaid'

interface Metrics {
  users: number
  dau: number
  wau: number
  open_tickets: number
  events_24h: number
}

interface ActivityRow {
  id: number
  user_id: string
  session_id: string
  name: string
  props: Record<string, unknown>
  client_ts: string
  created_at: string
}

const PAGE = 100

const cardCls =
  'rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5'

function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  useEffect(() => {
    void api
      .get<{ users: Profile[] }>('/admin/users')
      .then(({ users }) => setProfiles(users ?? []))
      .catch(() => setProfiles([]))
  }, [])
  const emailOf = useCallback(
    (id: string) => profiles.find((p) => p.id === id)?.email ?? id.slice(0, 8),
    [profiles],
  )
  return { profiles, emailOf }
}

function MetricsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .get<Metrics>('/admin/metrics')
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load metrics'))
  }, [])

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (!metrics) return <p className="text-sm text-linen-400">Loading…</p>

  const items: [string, number][] = [
    ['Users', metrics.users],
    ['Active today', metrics.dau],
    ['Active this week', metrics.wau],
    ['Open tickets', metrics.open_tickets],
    ['Events (24h)', metrics.events_24h],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className={cardCls}>
          <div className="font-display text-[26px] font-semibold text-linen-800 dark:text-linen-100">{value}</div>
          <div className="mt-1 text-xs text-linen-500 dark:text-linen-400">{label}</div>
        </div>
      ))}
    </div>
  )
}

function UsersTab({ profiles }: { profiles: Profile[] }) {
  return (
    <div className={cardCls}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
            <th className="pb-2">Email</th>
            <th className="pb-2">Role</th>
            <th className="pb-2">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linen-100 dark:divide-linen-800">
          {profiles.map((p) => (
            <tr key={p.id}>
              <td className="py-2 text-linen-700 dark:text-linen-200">{p.email}</td>
              <td className="py-2">
                {p.role === 'admin' ? (
                  <span className="rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                    admin
                  </span>
                ) : (
                  <span className="text-linen-400 dark:text-linen-500">user</span>
                )}
              </td>
              <td className="py-2 text-linen-500 dark:text-linen-400">
                {new Date(p.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-linen-400">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ActivityTab({
  profiles,
  emailOf,
}: {
  profiles: Profile[]
  emailOf: (id: string) => string
}) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [userFilter, setUserFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const [done, setDone] = useState(false)

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextPage * PAGE) })
      if (userFilter) params.set('user', userFilter)
      if (nameFilter) params.set('name', nameFilter)
      const { events } = await api.get<{ events: ActivityRow[] }>(`/admin/events?${params}`)
      const batch = events ?? []
      setDone(batch.length < PAGE)
      setRows((prev) => (replace ? batch : [...prev, ...batch]))
      setPage(nextPage)
    },
    [userFilter, nameFilter],
  )

  useEffect(() => {
    void load(0, true)
  }, [load])

  const selectCls =
    'rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none'

  return (
    <div className={cardCls}>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={selectCls}>
          <option value="">All users</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.email}
            </option>
          ))}
        </select>
        <input
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Event name (e.g. quiz.)"
          className={selectCls}
        />
      </div>
      <ul className="divide-y divide-linen-100 dark:divide-linen-800 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
            <span className="font-mono text-xs text-linen-400 dark:text-linen-500">
              {new Date(r.created_at).toLocaleString()}
            </span>
            <span className="font-medium text-linen-700 dark:text-linen-200">{r.name}</span>
            <span className="text-xs text-linen-500 dark:text-linen-400">{emailOf(r.user_id)}</span>
            {Object.keys(r.props).length > 0 && (
              <span className="font-mono text-xs text-linen-400 dark:text-linen-500">
                {JSON.stringify(r.props)}
              </span>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-linen-400">No events match.</li>}
      </ul>
      {!done && rows.length > 0 && (
        <button
          onClick={() => void load(page + 1, false)}
          className="mt-3 rounded-lg border border-linen-300 dark:border-linen-600 px-3 py-1.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800"
        >
          Load more
        </button>
      )}
    </div>
  )
}

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

function TicketsTab({ emailOf, selfId }: { emailOf: (id: string) => string; selfId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { tickets } = await api.get<{ tickets: Ticket[] }>('/admin/tickets')
    setTickets(tickets ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (id: string, status: TicketStatus) => {
    await api.patch(`/admin/tickets/${id}`, { status })
    await load()
  }

  return (
    <div className={cardCls}>
      <ul className="divide-y divide-linen-100 dark:divide-linen-800">
        {tickets.map((t) => (
          <li key={t.id} className="py-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOpenId(openId === t.id ? null : t.id)}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-linen-700 dark:text-linen-200"
              >
                {t.subject}
              </button>
              <span className="text-xs text-linen-400 dark:text-linen-500">{emailOf(t.user_id)}</span>
              {t.category && (
                <span className="rounded-full bg-linen-100 dark:bg-linen-800 px-2 py-0.5 text-[10px] font-medium text-linen-500 dark:text-linen-400">
                  {t.category}
                </span>
              )}
              <StatusBadge status={t.status} />
              <select
                value={t.status}
                onChange={(e) => void setStatus(t.id, e.target.value as TicketStatus)}
                className="rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-1.5 py-1 text-xs text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            {openId === t.id && (
              <TicketThread ticket={t} selfId={selfId} otherLabel="User" admin onReplied={load} />
            )}
          </li>
        ))}
        {tickets.length === 0 && <li className="py-3 text-sm text-linen-400">No tickets yet.</li>}
      </ul>
    </div>
  )
}

export function AdminView() {
  const { session } = useAuth()
  const [tab, setTab] = useState<Tab>('metrics')
  const { profiles, emailOf } = useProfiles()

  const tabs: [Tab, string][] = [
    ['metrics', 'Metrics'],
    ['users', 'Users'],
    ['activity', 'Activity'],
    ['tickets', 'Tickets'],
    ['plaid', 'Categorization'],
  ]

  return (
    <div>
      <h2 className="mb-4 font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">Admin</h2>

      <div className="mb-4 inline-flex rounded-lg border border-linen-200 dark:border-linen-700 p-0.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-forest-600 text-white'
                : 'text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'metrics' && <MetricsTab />}
      {tab === 'users' && <UsersTab profiles={profiles} />}
      {tab === 'activity' && <ActivityTab profiles={profiles} emailOf={emailOf} />}
      {tab === 'tickets' && session && <TicketsTab emailOf={emailOf} selfId={session.user.id} />}
      {tab === 'plaid' && <PlaidDebugTab />}
    </div>
  )
}
