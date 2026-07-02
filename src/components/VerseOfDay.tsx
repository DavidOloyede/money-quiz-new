import { verseForDay } from '../data/verses'

/**
 * The daily scripture banner — one verse on money, stewardship, or generosity,
 * rotating at local midnight (see data/verses). Shown at the top of the
 * Dashboard whether or not any data is loaded. Styled as the app's warmest
 * moment: parchment gold, serif italic — the daily bread the app is named for.
 */
export function VerseOfDay() {
  const verse = verseForDay()
  return (
    <div className="rounded-2xl border border-honey-200 dark:border-honey-500/25 bg-gradient-to-br from-honey-50 via-cream to-cream dark:from-honey-500/10 dark:via-linen-900 dark:to-linen-900 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          📖
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] italic leading-relaxed text-linen-800 dark:text-honey-100">
            “{verse.text}”
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xs font-semibold text-honey-700 dark:text-honey-300">
              {verse.reference}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-linen-400 dark:text-linen-500">
              Verse of the day
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
