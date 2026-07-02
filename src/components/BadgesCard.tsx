import { BADGES } from '@moneyquiz/core/lib/badges'
import { formatDate } from '@moneyquiz/core/lib/format'

interface Props {
  /** Earned badge ids -> ISO date earned (from GameState.badges). */
  badges: Record<string, string>
}

/**
 * The badge case — every earnable badge, lit when earned (with the date) and
 * grayed out with its how-to-earn hint when locked.
 */
export function BadgesCard({ badges }: Props) {
  const earnedCount = BADGES.filter((b) => badges[b.id]).length

  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Badges</h3>
        <span className="text-xs tabular-nums text-linen-400 dark:text-linen-500">
          {earnedCount} / {BADGES.length} earned
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b) => {
          const earnedAt = badges[b.id]
          return (
            <div
              key={b.id}
              className={`rounded-lg border p-3 ${
                earnedAt
                  ? 'border-forest-200 dark:border-forest-900/50 bg-forest-50/60 dark:bg-forest-500/10'
                  : 'border-linen-200 dark:border-linen-700 opacity-40 grayscale'
              }`}
            >
              <div className="text-xl" aria-hidden>
                {b.emoji}
              </div>
              <div className="mt-1 text-sm font-semibold text-linen-800 dark:text-linen-100">
                {b.label}
              </div>
              {earnedAt ? (
                <>
                  <div className="text-[11px] text-forest-700 dark:text-forest-400">
                    Earned {formatDate(earnedAt.slice(0, 10))}
                  </div>
                  {b.verse && (
                    <div className="mt-1 text-[11px] italic leading-snug text-linen-500 dark:text-linen-400">
                      {b.verse}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] leading-snug text-linen-500 dark:text-linen-400">
                  {b.description}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
