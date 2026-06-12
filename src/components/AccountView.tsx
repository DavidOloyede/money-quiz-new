/**
 * The Account screen: sign in / create account (email+password or Google)
 * when signed out; profile, sync status, and sign-out when signed in.
 */
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { useSync } from './SyncGate'
import { ShieldIcon, UserIcon } from './icons'

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"
      />
    </svg>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none'

function SignInCard() {
  const { signUpWithPassword, signInWithPassword, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const err = await signUpWithPassword(email.trim(), password)
        if (err) setError(err)
        else
          setInfo(
            'Account created. If a confirmation email is required, check your inbox — otherwise you are now signed in.',
          )
      } else {
        const err = await signInWithPassword(email.trim(), password)
        if (err) setError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
        {(
          [
            { id: 'signin', label: 'Sign in' },
            { id: 'signup', label: 'Create account' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setMode(opt.id)
              setError(null)
              setInfo(null)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === opt.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {mode === 'signin'
          ? 'Welcome back. Your data syncs to this device when you sign in.'
          : 'An account keeps your data backed up and lets you use it on any device.'}
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="text-sm text-emerald-700 dark:text-emerald-300">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <button
        onClick={() => {
          setError(null)
          void signInWithGoogle().then((err) => err && setError(err))
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <GoogleMark className="h-4 w-4" />
        Continue with Google
      </button>
    </section>
  )
}

function ProfileCard() {
  const { session, profile, isAdmin, signOut } = useAuth()
  const sync = useSync()
  const [resyncing, setResyncing] = useState(false)

  const email = profile?.email ?? session?.user.email ?? ''
  const since = profile ? new Date(profile.created_at).toLocaleDateString() : null

  const syncLabel = !sync.active
    ? 'Not syncing on this device'
    : sync.status === 'error'
      ? 'Sync error — will retry on your next change'
      : sync.pendingCount > 0 || sync.status === 'pushing'
        ? 'Saving changes…'
        : sync.lastSyncAt
          ? `Synced ${new Date(sync.lastSyncAt).toLocaleTimeString()}`
          : 'Synced'

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {email}
              </span>
              {isAdmin && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  <ShieldIcon className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            {since && (
              <div className="text-xs text-slate-400 dark:text-slate-500">Member since {since}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="mt-4 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sync</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Changes save to your account automatically. {syncLabel}.
        </p>
        <button
          onClick={() => {
            setResyncing(true)
            void sync.resync().finally(() => setResyncing(false))
          }}
          disabled={!sync.active || resyncing}
          className="mt-3 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          {resyncing ? 'Syncing…' : 'Sync now'}
        </button>
      </section>
    </div>
  )
}

export function AccountView() {
  const { enabled, loading, session } = useAuth()

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Account</h2>
      {!enabled ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500 dark:text-slate-400">
          Accounts aren&apos;t configured in this build. The app runs fully on this device.
        </section>
      ) : loading ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm text-slate-400 dark:text-slate-500">
          Loading…
        </section>
      ) : session ? (
        <ProfileCard />
      ) : (
        <SignInCard />
      )}
    </div>
  )
}
