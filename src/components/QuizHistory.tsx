import type { QuizResult } from '../types'

function dayStreak(history: QuizResult[]): number {
  if (history.length === 0) return 0
  const days = new Set(history.map((h) => h.at.slice(0, 10)))
  const d = new Date()
  const today = d.toISOString().slice(0, 10)
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1)
  let streak = 0
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      d.setUTCDate(d.getUTCDate() - 1)
    } else break
  }
  return streak
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-16">
      <div className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </div>
    </div>
  )
}

export function QuizHistory({ history }: { history: QuizResult[] }) {
  if (history.length === 0) return null
  const attempts = history.length
  const bestPct = Math.round(Math.max(...history.map((h) => (h.total ? h.correct / h.total : 0))) * 100)
  const last = history[attempts - 1]
  const lastPct = Math.round(last.total ? (last.correct / last.total) * 100 : 0)
  const streak = dayStreak(history)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <Stat label="Attempts" value={attempts} />
        <Stat label="Best" value={`${bestPct}%`} />
        <Stat label="Last" value={`${lastPct}%`} />
        <Stat label="Day streak" value={streak} />
      </div>
    </div>
  )
}
