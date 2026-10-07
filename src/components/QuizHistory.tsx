/**
 * Past quiz scores at a glance. The day streak is the app's one streak (kept
 * by the question of the day), so it matches the flame everywhere else.
 */
import { useStore } from '@moneyquiz/core/store'
import { liveStreak } from '@moneyquiz/core/lib/streak'
import type { QuizResult } from '@moneyquiz/core/types'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-16">
      <div className="font-rounded text-xl font-extrabold tabular-nums text-linen-800 dark:text-linen-100">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-linen-400 dark:text-linen-500">
        {label}
      </div>
    </div>
  )
}

export function QuizHistory({ history }: { history: QuizResult[] }) {
  const { game } = useStore()
  if (history.length === 0) return null
  const attempts = history.length
  const bestPct = Math.round(Math.max(...history.map((h) => (h.total ? h.correct / h.total : 0))) * 100)
  const last = history[attempts - 1]
  const lastPct = Math.round(last.total ? (last.correct / last.total) * 100 : 0)
  const streak = liveStreak(game)

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <Stat label="Attempts" value={attempts} />
        <Stat label="Best" value={`${bestPct}%`} />
        <Stat label="Last" value={`${lastPct}%`} />
        <Stat label="Day streak" value={streak} />
      </div>
    </div>
  )
}
