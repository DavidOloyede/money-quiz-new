import { useState } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { answerDaily, dailyQuestionXp, getDailyState } from '@moneyquiz/core/lib/dailyQuestion'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { countedToday, liveStreak } from '@moneyquiz/core/lib/streak'
import { useSound } from '../lib/sound'
import { AnswerChoice } from './AnswerChoice'
import { Omer } from './Omer'
import { QuizEvidence } from './QuizEvidence'
import { StreakFlame } from './StreakFlame'
import { CheckIcon, SparkIcon, XIcon } from './icons'

/**
 * One question a day — the streak's habit hook. Personalized from the user's
 * own transactions when there's data; a general financial-literacy question
 * when there isn't, so the daily habit starts before any account is connected.
 * Answering earns XP (a little more when correct), counts today toward the
 * streak (the only thing that does), and plays the same moment as the quiz: the answer pops (or
 * shakes), a chime (or soft tone), and the streak flame lights (it stays grey
 * until something is answered today). The same question stays up all day and a new one
 * arrives at midnight. Once answered it shows the same receipts the quiz
 * does — the transactions the figure came from — so the day's number is
 * never something to take on faith.
 */
export function DailyQuestionCard() {
  const {
    transactions,
    budgets,
    aliases,
    dismissedRecurring,
    recurringKinds,
    awardXp,
    recordDailyAnswer,
    game,
  } = useStore()
  const play = useSound()
  const [daily, setDaily] = useState(() =>
    getDailyState(transactions, { budgets, aliases, dismissedRecurring, recurringKinds }),
  )
  // Answered in this visit (not earlier today): only then does the moment play.
  const [justAnswered, setJustAnswered] = useState(false)

  const q = daily.question
  const answered = daily.answer !== null
  const correct = answered && daily.answer === q.correctIndex

  const choose = (idx: number) => {
    if (answered) return
    const right = idx === q.correctIndex
    awardXp(dailyQuestionXp(right))
    recordDailyAnswer()
    setDaily(answerDaily(daily, idx))
    setJustAnswered(true)
    play(right ? 'chime' : 'soft')
  }

  return (
    <div className="rounded-2xl border border-honey-200 bg-linear-to-br from-honey-50 to-cream p-5 dark:border-honey-500/30 dark:from-honey-950/30 dark:to-linen-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-rounded text-lg font-extrabold text-linen-800 dark:text-linen-100">
          <span aria-hidden>📅</span> Question of the day
        </h3>
        <span className="rounded-full bg-honey-100 px-2.5 py-1 font-rounded text-xs font-extrabold text-honey-700 dark:bg-honey-500/15 dark:text-honey-300">
          <StreakFlame lit={countedToday(game)} grow={justAnswered} /> {liveStreak(game)}-day streak
        </span>
      </div>
      {daily.source === 'general' && (
        <p className="mt-1 text-xs text-linen-500 dark:text-linen-400">
          A general one for now. Connect your data to make it personal.
        </p>
      )}

      <p className="mt-3 font-rounded text-[17px] font-bold text-linen-900 dark:text-linen-50">{q.prompt}</p>

      <div className="mt-3 space-y-2.5">
        {q.options.map((opt, i) => (
          <AnswerChoice
            key={i}
            compact
            label={opt}
            index={i}
            answered={answered}
            isCorrect={i === q.correctIndex}
            isChosen={i === daily.answer}
            celebrate={justAnswered}
            xp={dailyQuestionXp(true)}
            onChoose={() => choose(i)}
          />
        ))}
      </div>

      {answered && (
        <div className="mt-4 space-y-2.5">
          <div
            role="status"
            className={`rounded-xl p-3.5 text-sm ${justAnswered ? 'feedback-in' : ''} ${
              correct
                ? 'bg-forest-50 text-forest-800 dark:bg-forest-500/10 dark:text-forest-300'
                : 'bg-coral-50 text-coral-800 dark:bg-coral-500/10 dark:text-coral-300'
            }`}
          >
            <span className="inline-flex items-center gap-1 font-rounded font-black">
              {correct ? <CheckIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
              {correct ? 'Correct! ' : 'Not quite. '}
            </span>{' '}
            {q.answerDetail}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-cream/70 p-3.5 text-sm text-linen-600 dark:bg-linen-800/50 dark:text-linen-300">
            <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-500" />
            <span>{q.takeaway}</span>
          </div>
          <QuizEvidence evidence={q.evidence} compact />
          {/* Done for today: the Dreamer naps at the foot, apart from the receipts above. */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Omer {...omerFor({ kind: 'daily-done' })} size={64} />
            <p className="text-xs text-linen-500 dark:text-linen-400">
              <span
                className={`mr-1 inline-block rounded-full bg-honey-400 px-2 py-0.5 font-rounded font-black text-linen-900 ${justAnswered ? 'chip-pop' : ''}`}
              >
                +{dailyQuestionXp(correct)} XP
              </span>
              Come back tomorrow for a new one
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
