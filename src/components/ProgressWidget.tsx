import { useStore } from '../store'
import { levelProgress } from '../lib/gamification'
import { BADGES } from '../lib/badges'

/**
 * The level / XP / daily-streak readout. The sidebar shows the full widget;
 * the mobile header gets the compact chip. Checking in daily keeps the 🔥
 * streak alive, and XP from check-ins, quizzes, and imports levels you up.
 */
export function ProgressWidget() {
  const { game } = useStore()
  const lp = levelProgress(game.xp)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {lp.level}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {lp.title}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {lp.into} / {lp.span} XP to level {lp.level + 1}
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${lp.pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          <span aria-hidden>🔥</span>{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {game.streak}
          </span>
          -day streak
        </span>
        <span className="tabular-nums">best {game.bestStreak}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
        <span aria-hidden>🏅</span> {Object.keys(game.badges).length} / {BADGES.length} badges
      </div>
    </div>
  )
}

/** Tiny "L3 · 🔥5" badge for the mobile top bar. */
export function ProgressChip() {
  const { game } = useStore()
  const lp = levelProgress(game.xp)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums"
      title={`Level ${lp.level} ${lp.title} · ${game.xp} XP · ${game.streak}-day streak · ${Object.keys(game.badges).length}/${BADGES.length} badges`}
    >
      Lv {lp.level}
      <span className="font-medium text-slate-500 dark:text-slate-400">🔥{game.streak}</span>
    </span>
  )
}
