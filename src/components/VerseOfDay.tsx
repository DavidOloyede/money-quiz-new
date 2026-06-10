import { verseForDay } from '../data/verses'

/**
 * The daily scripture banner — one verse on money, stewardship, or generosity,
 * rotating at local midnight (see data/verses). Shown at the top of the
 * Dashboard whether or not any data is loaded.
 */
export function VerseOfDay() {
  const verse = verseForDay()
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-500/10 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          📖
        </span>
        <div className="min-w-0">
          <p className="text-sm italic leading-relaxed text-emerald-900 dark:text-emerald-200">
            “{verse.text}”
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {verse.reference}
            </span>
            <span className="text-emerald-600/70 dark:text-emerald-500/70">Verse of the day</span>
          </div>
        </div>
      </div>
    </div>
  )
}
