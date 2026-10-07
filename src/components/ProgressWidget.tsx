import { useEffect, useRef, useState } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { levelProgress } from '@moneyquiz/core/lib/gamification'
import { countedToday, liveStreak } from '@moneyquiz/core/lib/streak'
import { BADGES } from '@moneyquiz/core/lib/badges'
import { StreakFlame } from './StreakFlame'

/**
 * The level / XP / daily-streak readout. The sidebar shows the full widget;
 * the mobile header gets the compact chip. Answering the question of the day
 * keeps the streak alive; its flame stays grey until today's is answered.
 * XP from the streak, quizzes, and imports levels you up.
 *
 * It answers every gain wherever it happened: the bar fills with the reward
 * overshoot, "+N XP" floats up, the level circle pops on a level-up, and the
 * flame flickers when the streak grows.
 */

/** Bumps a counter each time `value` rises (never on first render), plus by how much. */
function useRise(value: number): { key: number; by: number } {
  const prev = useRef(value)
  const [rise, setRise] = useState({ key: 0, by: 0 })
  useEffect(() => {
    const by = value - prev.current
    prev.current = value
    if (by > 0) setRise((r) => ({ key: r.key + 1, by }))
  }, [value])
  return rise
}

export function ProgressWidget() {
  const { game } = useStore()
  const lp = levelProgress(game.xp)
  const gain = useRise(game.xp)
  const levelUp = useRise(lp.level)
  const streak = liveStreak(game)
  const lit = countedToday(game)
  const streakUp = useRise(streak)

  return (
    <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-linen-50 dark:bg-linen-800/50 p-3">
      <div className="flex items-center gap-2.5">
        <span
          key={levelUp.key}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 font-rounded text-sm font-black text-white ${
            levelUp.key ? 'level-pop' : ''
          }`}
        >
          {lp.level}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-rounded text-sm font-extrabold text-linen-700 dark:text-linen-200">
            {lp.title}
          </div>
          <div className="text-[11px] text-linen-400 dark:text-linen-500 tabular-nums">
            {lp.into} / {lp.span} XP to level {lp.level + 1}
          </div>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-linen-200 dark:bg-linen-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-honey-400 to-honey-500 transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ width: `${lp.pct}%` }}
          />
        </div>
        {gain.key > 0 && (
          <span
            key={gain.key}
            aria-hidden
            className="xp-tick pointer-events-none absolute -top-3 right-0 font-rounded text-xs font-black text-honey-600 dark:text-honey-300"
          >
            +{gain.by} XP
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-linen-500 dark:text-linen-400">
        <span title={lit ? undefined : "Answer today's question to keep your streak going"}>
          <StreakFlame key={streakUp.key} lit={lit} grow={streakUp.key > 0} />{' '}
          <span className="font-semibold text-linen-700 dark:text-linen-200 tabular-nums">
            {streak}
          </span>
          -day streak
        </span>
        <span className="tabular-nums">best {game.bestStreak}</span>
      </div>
      <div className="mt-1 text-[11px] text-linen-500 dark:text-linen-400 tabular-nums">
        <span aria-hidden>🏅</span> {Object.keys(game.badges).length} / {BADGES.length} badges
      </div>
    </div>
  )
}

/** Tiny "Lv 3 · (flame) 5" badge for the mobile top bar. */
export function ProgressChip() {
  const { game } = useStore()
  const lp = levelProgress(game.xp)
  const levelUp = useRise(lp.level)
  const streak = liveStreak(game)
  return (
    <span
      key={levelUp.key}
      className={`inline-flex items-center gap-1.5 rounded-full bg-forest-50 dark:bg-forest-500/10 px-2.5 py-1 font-rounded text-xs font-extrabold text-forest-700 dark:text-forest-300 tabular-nums ${
        levelUp.key ? 'level-pop' : ''
      }`}
      title={`Level ${lp.level} ${lp.title} · ${game.xp} XP · ${streak}-day streak · ${Object.keys(game.badges).length}/${BADGES.length} badges`}
    >
      Lv {lp.level}
      <span className="font-medium text-linen-500 dark:text-linen-400">
        <StreakFlame lit={countedToday(game)} />
        {streak}
      </span>
    </span>
  )
}
