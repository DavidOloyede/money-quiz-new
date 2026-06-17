import { StatCard } from 'money-quiz'

const coins = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path strokeLinecap="round" d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
    <path strokeLinecap="round" d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
  </svg>
)

// The dashboard's KPI row — a few stat tiles side by side, with accents.
export function Overview() {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Net this month" value="+$1,284" sub="Income − spending" accent="text-emerald-600" />
      <StatCard label="Spending" value="$3,512" sub="142 transactions" />
      <StatCard label="Income" value="$4,796" sub="3 deposits" icon={coins} />
    </div>
  )
}

// Negative trend with a rose accent — the same tile reads good or bad by accent.
export function Accents() {
  return (
    <div className="grid max-w-md grid-cols-2 gap-3">
      <StatCard label="Savings rate" value="27%" sub="Up from 21%" accent="text-emerald-600" />
      <StatCard label="Over budget" value="−$148" sub="Dining + shopping" accent="text-rose-600" />
    </div>
  )
}

// Clickable variant — becomes a button that drills into the transactions.
export function Clickable() {
  return (
    <div className="max-w-xs">
      <StatCard
        label="Groceries"
        value="$612.40"
        sub="Tap to see the charges"
        accent="text-slate-800"
        onClick={() => {}}
      />
    </div>
  )
}
