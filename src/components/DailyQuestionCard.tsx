import { useState } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { answerDaily, dailyQuestionXp, getDailyState } from '@moneyquiz/core/lib/dailyQuestion'
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
    <div className="rounded-2xl border border-honey-200 dark:border-honey-500/30 bg-gradient-to-br from-honey-50 to-cream dark:from-honey-950/30 dark:to-linen-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">
          <span aria-hidden>📅</span> Question of the day
        </h3>
        <span className="text-xs font-medium text-honey-700 dark:text-honey-300">
          🔥 {game.streak}-day streak
          {daily.source === 'general' && ' · general — connect data to personalize'}
        </span>
      </div>

      <p className="mt-3 font-display text-[15px] font-medium text-linen-800 dark:text-linen-100">{q.prompt}</p>

      <div className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex
          const isChosen = i === daily.answer
          let cls =
            'border-linen-200 dark:border-linen-700 hover:border-honey-400 hover:bg-honey-50/40 text-linen-700 dark:text-linen-200'
          if (answered) {
            if (isCorrect)
              cls =
                'border-forest-500 bg-forest-50 dark:bg-forest-500/10 text-forest-800 dark:text-forest-300'
            else if (isChosen)
              cls = 'border-rose-400 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
            else cls = 'border-linen-200 dark:border-linen-700 text-linen-400 dark:text-linen-500'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between rounded-xl border bg-cream/60 dark:bg-linen-900/40 px-4 py-2.5 text-left text-sm font-medium transition-colors ${cls} ${
                answered ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span>{opt}</span>
              {answered && isCorrect && <CheckIcon className="h-5 w-5 text-forest-600" />}
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
                ? 'bg-forest-50 dark:bg-forest-500/10 text-forest-800 dark:text-forest-300'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
            }`}
          >
            <span className="font-semibold">{correct ? 'Correct! ' : 'Not quite. '}</span>
            {q.answerDetail}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-cream/70 dark:bg-linen-800/50 p-3.5 text-sm text-linen-600 dark:text-linen-300">
            <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-500" />
            <span>{q.takeaway}</span>
          </div>
          <p className="text-center text-xs text-linen-400 dark:text-linen-500">
            +{dailyQuestionXp(correct)} XP · come back tomorrow for a new one
          </p>
        </div>
      )}
    </div>
  )
}
