import { EmptyState } from 'money-quiz'

const bank = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-7 w-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-5 9 5M4 10v8m16-8v8M8 10v8m4-8v8m4-8v8M3 21h18" />
  </svg>
)

// The dashboard before any data is loaded — icon, headline, explanation, and a
// pair of call-to-action buttons passed as children.
export function NoData() {
  return (
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white">
      <EmptyState
        icon={bank}
        title="No transactions yet"
        message="Connect a bank or import a CSV and we'll break down your spending by category, surface recurring bills, and track your giving."
      >
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Connect a bank
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Import a CSV
        </button>
      </EmptyState>
    </div>
  )
}

// The minimal form — no icon, no actions — for an empty section inside a card.
export function Minimal() {
  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white">
      <EmptyState
        title="No subscriptions found"
        message="We didn't spot any recurring charges yet. They'll show up here once a merchant bills you on a regular cadence."
      />
    </div>
  )
}
