import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
// Importing the tracker installs its global error listeners early.
import './lib/track'
import App from './App.tsx'

const SENTRY_DSN = ((import.meta as unknown as { env?: Record<string, string> }).env || {})
  .VITE_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    // This app handles people's finances: keep request/response bodies and
    // console output (which can echo transaction data) out of crash reports.
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'console' || crumb.category === 'fetch' || crumb.category === 'xhr') {
        return null
      }
      return crumb
    },
  })
}

function CrashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Something went wrong.</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your data is safe. Reload the page to keep going.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
