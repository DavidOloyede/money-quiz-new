import { lazy, Suspense, useRef, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { MobileTopNav, Sidebar, type View } from './components/Nav'
import { ImportView } from './components/ImportView'
import { QuizView } from './components/QuizView'
import { SettingsView } from './components/SettingsView'
import { TrashIcon } from './components/icons'

// The dashboard pulls in Recharts; load it on demand to keep the initial bundle small.
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const YearSheetView = lazy(() =>
  import('./components/YearSheetView').then((m) => ({ default: m.YearSheetView })),
)

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-slate-400 dark:text-slate-500">
      Loading…
    </div>
  )
}

function ConfirmClear({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TrashIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Clear all data?</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This permanently removes every transaction, your category edits, and your saved column
          mapping from this browser. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onStay}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Leave the quiz?</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          You&apos;re mid-quiz — if you leave now, your progress won&apos;t be counted toward your
          history or XP.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onStay}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Keep playing
          </button>
          <button
            onClick={onLeave}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Leave quiz
          </button>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { clearAll, hasData, theme, setTheme } = useStore()
  const [view, setView] = useState<View>(() => (hasData ? 'dashboard' : 'import'))
  const [confirmClear, setConfirmClear] = useState(false)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // Guard against losing a quiz in progress: QuizView reports "dirty" while
  // mid-quiz, and navigating away first asks for confirmation.
  const quizDirtyRef = useRef(false)
  const [pendingView, setPendingView] = useState<View | null>(null)
  const navigate = (v: View) => {
    if (quizDirtyRef.current && view === 'quiz' && v !== 'quiz') setPendingView(v)
    else setView(v)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar
        view={view}
        onNavigate={navigate}
        onClear={() => setConfirmClear(true)}
        hasData={hasData}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <MobileTopNav
        view={view}
        onNavigate={navigate}
        onClear={() => setConfirmClear(true)}
        hasData={hasData}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<ViewFallback />}>
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
          </Suspense>
        </div>
      </main>

      {confirmClear && (
        <ConfirmClear
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearAll()
            setConfirmClear(false)
            setView('import')
          }}
        />
      )}

      {pendingView && (
        <ConfirmLeaveQuiz
          onStay={() => setPendingView(null)}
          onLeave={() => {
            quizDirtyRef.current = false
            setView(pendingView)
            setPendingView(null)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
