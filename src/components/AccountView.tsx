/**
 * The Account screen: sign in / create account (email+password, plus Google
 * where that provider is turned on for the deployment) when signed out;
 * profile, sync status, and sign-out when signed in.
 */
import { useId, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { googleAuthEnabled } from '../lib/supabase'
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

// Every field has a visible label above it (the design-system guide): a
// placeholder vanishes while you type, so it can't be the only name.
const labelCls = 'mb-1.5 block text-[13px] font-medium text-linen-700 dark:text-linen-200'
const inputCls =
  'w-full rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-3 py-2 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none'

function SignInCard({ initialMode }: { initialMode: 'signin' | 'signup' }) {
  const { signUpWithPassword, signInWithPassword, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const id = useId()

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
    <section className="card p-5">
      <div className="inline-flex rounded-lg border border-linen-200 dark:border-linen-700 p-0.5">
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
                ? 'bg-forest-600 text-white'
                : 'text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm text-linen-500 dark:text-linen-400">
        {mode === 'signin'
          ? 'Welcome back. Your data syncs to this device when you sign in.'
          : 'An account keeps your data backed up and lets you use it on any device.'}
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
        <div>
          <label htmlFor={`${id}-email`} className={labelCls}>
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={`${id}-password`} className={labelCls}>
            Password
          </label>
          <input
            id={`${id}-password`}
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-describedby={mode === 'signup' ? `${id}-password-help` : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          {mode === 'signup' && (
            <p id={`${id}-password-help`} className="mt-1.5 text-xs text-linen-500 dark:text-linen-400">
              8 or more characters.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-coral-700 dark:text-coral-300">{error}</p>}
        {info && <p className="text-sm text-forest-700 dark:text-forest-300">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full px-4 py-2 text-sm"
        >
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {googleAuthEnabled && (
        <>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-linen-400 dark:text-linen-500">
            <span className="h-px flex-1 bg-linen-200 dark:bg-linen-700" />
            or
            <span className="h-px flex-1 bg-linen-200 dark:bg-linen-700" />
          </div>

          <button
            onClick={() => {
              setError(null)
              void signInWithGoogle().then((err) => err && setError(err))
            }}
            className="btn-secondary flex w-full items-center justify-center gap-2 px-4 py-2 text-sm"
          >
            <GoogleMark className="h-4 w-4" />
            Continue with Google
          </button>
        </>
      )}
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
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 dark:bg-forest-500/10 text-forest-700 dark:text-forest-300">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-linen-800 dark:text-linen-100">
                {email}
              </span>
              {isAdmin && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  <ShieldIcon className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            {since && (
              <div className="text-xs text-linen-400 dark:text-linen-500">Member since {since}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="btn-secondary mt-4 px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </section>

      <section className="card p-5">
        <h3 className="font-rounded text-[17px] font-extrabold text-linen-800 dark:text-linen-100">Sync</h3>
        <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
          Changes save to your account automatically. {syncLabel}.
        </p>
        <button
          onClick={() => {
            setResyncing(true)
            void sync.resync().finally(() => setResyncing(false))
          }}
          disabled={!sync.active || resyncing}
          className="btn-secondary mt-3 px-3 py-1.5 text-sm"
        >
          {resyncing ? 'Syncing…' : 'Sync now'}
        </button>
      </section>
    </div>
  )
}

/** `initialMode` lets the landing page's "Create a free account" open straight to sign-up. */
export function AccountView({ initialMode = 'signin' }: { initialMode?: 'signin' | 'signup' }) {
  const { enabled, loading, session } = useAuth()

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 font-rounded text-[26px] font-extrabold text-linen-900 dark:text-linen-50">Account</h2>
      {!enabled ? (
        <section className="card p-5 text-sm text-linen-500 dark:text-linen-400">
          Accounts aren&apos;t configured in this build. The app runs fully on this device.
        </section>
      ) : loading ? (
        <section className="card p-5 text-sm text-linen-400 dark:text-linen-500">
          Loading…
        </section>
      ) : session ? (
        <ProfileCard />
      ) : (
        <SignInCard initialMode={initialMode} />
      )}
    </div>
  )
}
