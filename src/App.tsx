import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from '@moneyquiz/core/store'
import { AuthProvider, useAuth } from './auth'
import { SyncGate, useSync } from './components/SyncGate'
import { track } from './lib/track'
import { MobileTopNav, Sidebar } from './components/Nav'
import { NotFound } from './components/NotFound'
import {
  isOpenDoor,
  parsePath,
  pathFor,
  sameRoute,
  titleFor,
  viewRoute,
  type Route,
  type View,
} from './lib/routes'
import { ImportView } from './components/ImportView'
import { QuizView } from './components/QuizView'
import { SettingsView } from './components/SettingsView'
import { AccountView } from './components/AccountView'
import { TrashIcon } from './components/icons'
import { Landing } from './components/landing/Landing'
import { CelebrationHost } from './components/celebrate/CelebrationHost'

// The dashboard pulls in Recharts; load it on demand to keep the initial bundle small.
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const YearSheetView = lazy(() =>
  import('./components/YearSheetView').then((m) => ({ default: m.YearSheetView })),
)
// Admin tooling is for one person; keep it out of everyone else's bundle.
const AdminView = lazy(() =>
  import('./components/AdminView').then((m) => ({ default: m.AdminView })),
)

function ViewFallback({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center text-sm text-linen-400 dark:text-linen-500 ${
        full ? 'min-h-screen bg-linen-50 dark:bg-linen-950' : 'py-24'
      }`}
    >
      Loading…
    </div>
  )
}

function ConfirmClear({
  onCancel,
  onConfirm,
  alsoCloud,
}: {
  onCancel: () => void
  onConfirm: () => void
  alsoCloud: boolean
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-linen-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="modal-panel w-full max-w-sm rounded-2xl bg-cream dark:bg-linen-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <TrashIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-rounded text-lg font-extrabold text-linen-800 dark:text-linen-100">Clear all data?</h3>
        <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
          This permanently removes every transaction, your category edits, and your saved column
          mapping from this browser{alsoCloud ? ' and from your account' : ''}. This can&apos;t be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger px-4 py-2 text-sm">
            Clear everything
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmLeaveQuiz({
  onStay,
  onLeave,
}: {
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-linen-900/40 p-4"
      onClick={onStay}
    >
      <div
        className="modal-panel w-full max-w-sm rounded-2xl bg-cream dark:bg-linen-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-rounded text-lg font-extrabold text-linen-800 dark:text-linen-100">Leave the quiz?</h3>
        <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
          You&apos;re mid-quiz — if you leave now, your progress won&apos;t be counted toward your
          history or XP.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onStay} className="btn-primary px-4 py-2 text-sm">
            Keep playing
          </button>
          <button onClick={onLeave} className="btn-secondary px-4 py-2 text-sm">
            Leave quiz
          </button>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { clearAll, hasData, loadSample, theme, setTheme } = useStore()
  const { enabled: accountsEnabled, isAdmin, session, loading: authLoading } = useAuth()
  const sync = useSync()
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname))
  const routeRef = useRef(route)
  routeRef.current = route
  const [confirmClear, setConfirmClear] = useState(false)
  // Once a visitor steps into the app (from the landing, or straight through
  // one of its doors like /import), they move around freely for this visit
  // even though they still have no data.
  const [steppedIn, setSteppedIn] = useState(false)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  /** Show a route and put its address in the bar (replace: no new history entry). */
  const go = useCallback((next: Route, replace = false) => {
    const path = pathFor(next)
    if (path !== window.location.pathname) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
      if (!replace) window.scrollTo(0, 0)
    }
    setRoute(next)
  }, [])

  // Guard against losing a quiz in progress: QuizView reports "dirty" while
  // mid-quiz, and navigating away (a link, or the browser's Back) first asks.
  const quizDirtyRef = useRef(false)
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null)
  const leavingQuiz = (next: Route) => {
    const cur = routeRef.current
    return quizDirtyRef.current && cur.kind === 'view' && cur.view === 'quiz' && !sameRoute(next, cur)
  }
  const navigateTo = (next: Route) => {
    if (leavingQuiz(next)) setPendingRoute(next)
    else go(next)
  }
  const navigate = (v: View) => navigateTo(viewRoute(v))

  useEffect(() => {
    const onPop = () => {
      const next = parsePath(window.location.pathname)
      if (leavingQuiz(next)) {
        // Put the quiz's address back, then ask.
        window.history.pushState(null, '', pathFor(routeRef.current))
        setPendingRoute(next)
        return
      }
      setRoute(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // leavingQuiz reads only refs, so the first render's copy stays current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Where this route should really go. Someone with data (or signed in) skips
  // the landing; a brand-new visitor who opens an in-app address meets the
  // landing first, except at the doors the landing itself links to.
  const known = hasData || !!session
  const newVisitor = !known && !authLoading && !steppedIn
  let redirect: Route | null = null
  if (route.kind === 'home' && !authLoading && known) redirect = viewRoute(hasData ? 'dashboard' : 'import')
  else if (route.kind === 'view' && newVisitor && !isOpenDoor(route)) redirect = { kind: 'home' }
  const redirectPath = redirect ? pathFor(redirect) : null
  useEffect(() => {
    if (redirectPath) go(parsePath(redirectPath), true)
  }, [redirectPath, go])

  // Hold a quiet frame while the account is still being looked up, so nobody
  // sees the landing (or a screen they're about to leave) flash first.
  const waiting =
    !!redirectPath ||
    (route.kind === 'home' && authLoading) ||
    (authLoading && !hasData && route.kind === 'view' && !isOpenDoor(route))

  useEffect(() => {
    if (route.kind === 'view' && !waiting) setSteppedIn(true)
  }, [route, waiting])

  // Tidy other spellings (/year-sheet, /Quiz/) to the one canonical address.
  useEffect(() => {
    if (route.kind !== 'notFound' && !redirectPath && window.location.pathname !== pathFor(route)) {
      window.history.replaceState(null, '', pathFor(route))
    }
  }, [route, redirectPath])

  const showLanding = route.kind === 'home' && !known && !authLoading
  useEffect(() => {
    document.title = titleFor(route)
  }, [route])
  useEffect(
    () => track('nav.view', { view: showLanding ? 'landing' : route.kind === 'view' ? route.view : route.kind }),
    [route, showLanding],
  )

  if (waiting) return <ViewFallback full />

  if (showLanding) {
    return (
      <Landing
        onTrySample={() => {
          loadSample()
          go(viewRoute('dashboard'))
        }}
        onImport={() => {
          setSteppedIn(true)
          go(viewRoute('import'))
        }}
        onSignUp={accountsEnabled ? () => go(viewRoute('account', 'signup')) : undefined}
        onSignIn={accountsEnabled ? () => go(viewRoute('account', 'signin')) : undefined}
      />
    )
  }

  if (route.kind === 'notFound' && !known && !steppedIn) {
    return <NotFound standalone path={route.path} onHome={() => go({ kind: 'home' })} />
  }

  const view: View | null = route.kind === 'view' ? route.view : null
  const accountMode = route.kind === 'view' && route.mode ? route.mode : 'signin'

  return (
    <div className="flex min-h-screen flex-col bg-linen-50 dark:bg-linen-950 text-linen-900 dark:text-linen-100 md:flex-row">
      <Sidebar
        view={view}
        onNavigate={navigate}
        onClear={() => setConfirmClear(true)}
        hasData={hasData}
        theme={theme}
        onToggleTheme={toggleTheme}
        showAccount={accountsEnabled}
        showAdmin={isAdmin}
        syncActive={sync.active}
      />
      <MobileTopNav
        view={view}
        onNavigate={navigate}
        onClear={() => setConfirmClear(true)}
        hasData={hasData}
        theme={theme}
        onToggleTheme={toggleTheme}
        showAccount={accountsEnabled}
        showAdmin={isAdmin}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<ViewFallback />}>
            {/* Keyed by address, so each screen settles in fresh as it arrives. */}
            <div key={pathFor(route)} className="view-in">
              {view === 'import' && <ImportView onNavigate={navigate} />}
              {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
              {view === 'yearly' && <YearSheetView onNavigate={navigate} />}
              {view === 'quiz' && (
                <QuizView
                  onNavigate={navigate}
                  onDirtyChange={(d) => {
                    quizDirtyRef.current = d
                  }}
                />
              )}
              {view === 'settings' && <SettingsView onClear={() => setConfirmClear(true)} />}
              {view === 'account' && <AccountView initialMode={accountMode} />}
              {view === 'admin' && (isAdmin ? <AdminView /> : <AccountView initialMode="signin" />)}
              {route.kind === 'notFound' && (
                <NotFound path={route.path} onHome={() => navigateTo({ kind: 'home' })} />
              )}
            </div>
          </Suspense>
        </div>
      </main>

      {confirmClear && (
        <ConfirmClear
          alsoCloud={sync.active}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearAll()
            void sync.clearCloud()
            setConfirmClear(false)
            go(viewRoute('import'))
          }}
        />
      )}

      {pendingRoute && (
        <ConfirmLeaveQuiz
          onStay={() => setPendingRoute(null)}
          onLeave={() => {
            quizDirtyRef.current = false
            go(pendingRoute)
            setPendingRoute(null)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SyncGate>
        {(epoch) => (
          // Remounting on epoch change makes the store re-read localStorage
          // after a login pull, account switch, or sign-out wipe.
          <StoreProvider key={epoch}>
            <Shell />
            {/* Level-ups and new badges, wherever they're earned. */}
            <CelebrationHost />
          </StoreProvider>
        )}
      </SyncGate>
    </AuthProvider>
  )
}
