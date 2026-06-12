import { useEffect, useState } from 'react'
import type { AccountType } from '../types'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { openPlaidLink, plaidApi, plaidNeedsSignIn, type PlaidHealth } from '../lib/plaid'
import { CheckIcon, LinkIcon, XIcon } from './icons'

type Status =
  | { kind: 'loading' }
  | { kind: 'signin' }
  | { kind: 'down' }
  | { kind: 'ready'; health: PlaidHealth }

export function ConnectBank({ onNavigate }: { onNavigate?: (v: 'account') => void }) {
  const { addPlaidSource, syncPlaidSource } = useStore()
  const { loading: authLoading, session } = useAuth()
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('bank')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const signedIn = !!session
  useEffect(() => {
    if (plaidNeedsSignIn) {
      if (authLoading) return
      if (!signedIn) {
        setStatus({ kind: 'signin' })
        return
      }
    }
    let alive = true
    setStatus({ kind: 'loading' })
    plaidApi
      .health()
      .then((health) => alive && setStatus({ kind: 'ready', health }))
      .catch(() => alive && setStatus({ kind: 'down' }))
    return () => {
      alive = false
    }
  }, [authLoading, signedIn])

  const afterConnect = async (itemId: string, name: string) => {
    const n = await syncPlaidSource(itemId)
    setDone(`Connected ${name} — imported ${n} transaction${n === 1 ? '' : 's'}.`)
  }

  const connectMock = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const { item } = await plaidApi.mockConnect(institution, accountType)
      addPlaidSource(item)
      await afterConnect(item.id, item.institution)
      setInstitution('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.')
    } finally {
      setBusy(false)
    }
  }

  const connectPlaid = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const { link_token } = await plaidApi.createLinkToken()
      openPlaidLink(
        link_token,
        async (publicToken, metadata) => {
          try {
            const name = metadata?.institution?.name || 'Bank'
            const { item } = await plaidApi.exchange(publicToken, name, accountType)
            addPlaidSource(item)
            await afterConnect(item.id, item.institution)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not finish connecting.')
          } finally {
            setBusy(false)
          }
        },
        (err) => {
          setBusy(false)
          if (err) setError('Plaid Link was closed before finishing.')
        },
      )
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not start Plaid.')
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
          <LinkIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Connect a bank or card</h3>
            {status.kind === 'ready' && status.health.mode === 'mock' && (
              <span className="rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                Demo mode — sample data
              </span>
            )}
            {status.kind === 'ready' && status.health.mode === 'plaid' && (
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                Plaid · {status.health.env}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Link an account with Plaid to pull in and auto-categorize transactions. You log in with
            your bank inside Plaid — this app never sees your credentials.
          </p>

          {status.kind === 'loading' && (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Checking for the Plaid server…</p>
          )}

          {status.kind === 'signin' && (
            <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
              Bank connections are tied to your account so they can follow you across devices.{' '}
              {onNavigate ? (
                <button
                  onClick={() => onNavigate('account')}
                  className="font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  Sign in or create an account
                </button>
              ) : (
                'Sign in from the Account tab'
              )}{' '}
              to connect one. CSV import below works without an account.
            </div>
          )}

          {status.kind === 'down' && (
            <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
              {plaidNeedsSignIn ? (
                <>
                  The connection service isn’t reachable right now — try again in a moment. CSV
                  import below works regardless.
                </>
              ) : (
                <>
                  The connection server isn’t running. Start it with{' '}
                  <code className="rounded bg-slate-200 dark:bg-slate-700 px-1">npm run server</code>{' '}
                  (it runs in demo mode with no setup, or add Plaid keys in <code>.env</code>). CSV
                  import below works without it.
                </>
              )}
            </div>
          )}

          {status.kind === 'ready' && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {status.health.mode === 'mock' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Institution (optional)
                  </span>
                  <input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Chase"
                    className="w-40 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Account type
                </span>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="bank">Bank / checking</option>
                  <option value="credit">Credit card</option>
                </select>
              </label>
              <button
                onClick={status.health.mode === 'mock' ? connectMock : connectPlaid}
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'Connecting…' : status.health.mode === 'mock' ? 'Connect (demo)' : 'Connect with Plaid'}
              </button>
            </div>
          )}

          {done && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckIcon className="h-4 w-4 shrink-0" /> {done}
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
              <XIcon className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
