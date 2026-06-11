import { useState } from 'react'
import { useStore } from '../store'
import { answerDaily, dailyQuestionXp, getDailyState } from '../lib/dailyQuestion'
import { CheckIcon, SparkIcon, XIcon } from './icons'

/**
 * One question a day — the streak's habit hook. Personalized from the user's
 * own transactions when there's data; a general financial-literacy question
 * when there isn't, so the daily habit starts before any account is connected.
 * Answering earns XP (a little more when correct); the same question stays up
 * all day and a new one arrives at midnight.
 */
export function DailyQuestionCard() {
  const {
    transactions,
    budgets,
    aliases,
    dismissedRecurring,
    recurringKinds,
    awardXp,
    game,
  } = useStore()
  const [daily, setDaily] = useState(() =>
    getDailyState(transactions, { budgets, aliases, dismissedRecurring, recurringKinds }),
  )

  const q = daily.question
  const answered = daily.answer !== null
  const correct = answered && daily.answer === q.correctIndex

  const choose = (idx: number) => {
    if (answered) return
    awardXp(dailyQuestionXp(idx === q.correctIndex))
    setDaily(answerDaily(daily, idx))
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          <span aria-hidden>📅</span> Question of the day
        </h3>
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          🔥 {game.streak}-day streak
          {daily.source === 'general' && ' · general — connect data to personalize'}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">{q.prompt}</p>

      <div className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex
          const isChosen = i === daily.answer
          let cls =
            'border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/40 text-slate-700 dark:text-slate-200'
          if (answered) {
            if (isCorrect)
              cls =
                'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            else if (isChosen)
              cls = 'border-rose-400 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
            else cls = 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between rounded-xl border bg-white/60 dark:bg-slate-900/40 px-4 py-2.5 text-left text-sm font-medium transition-colors ${cls} ${
                answered ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span>{opt}</span>
              {answered && isCorrect && <CheckIcon className="h-5 w-5 text-emerald-600" />}
              {answered && isChosen && !isCorrect && <XIcon className="h-5 w-5 text-rose-500" />}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="mt-4 space-y-2.5">
          <div
            className={`rounded-xl p-3.5 text-sm ${
              correct
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
            }`}
          >
            <span className="font-semibold">{correct ? 'Correct! ' : 'Not quite. '}</span>
            {q.answerDetail}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-white/70 dark:bg-slate-800/50 p-3.5 text-sm text-slate-600 dark:text-slate-300">
            <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{q.takeaway}</span>
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            +{dailyQuestionXp(correct)} XP · come back tomorrow for a new one
          </p>
        </div>
      )}
    </div>
  )
}
