import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { askedKinds, generateQuiz, quizInsights, type QuizQuestion } from '@moneyquiz/core/lib/quiz'
import { quizXp } from '@moneyquiz/core/lib/gamification'
import { track } from '../lib/track'
import { QuizEvidence } from './QuizEvidence'
import { QuizHistory } from './QuizHistory'
import { BadgesCard } from './BadgesCard'
import { DailyQuestionCard } from './DailyQuestionCard'
import { EmptyState } from './EmptyState'
import { CheckIcon, QuizIcon, SparkIcon, XIcon } from './icons'
import type { View } from './Nav'

type Phase = 'intro' | 'playing' | 'done'

interface Props {
  onNavigate: (v: View) => void
  /** Tells the shell a quiz is mid-flight so navigating away can warn first. */
  onDirtyChange?: (dirty: boolean) => void
}

export function QuizView({ onNavigate, onDirtyChange }: Props) {
  const {
    transactions,
    hasData,
    loadSample,
    budgets,
    quizHistory,
    recordQuizResult,
    game,
    aliases,
    dismissedRecurring,
    recurringKinds,
  } = useStore()
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [tooSparse, setTooSparse] = useState(false)
  const recordedRef = useRef(false)

  // The quiz is "dirty" while being played and not yet recorded (reviewing a
  // finished quiz loses nothing). Cleared on unmount so leaving resets it.
  useEffect(() => {
    onDirtyChange?.(phase === 'playing' && !recordedRef.current)
  }, [phase, onDirtyChange])
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  const start = () => {
    const qs = generateQuiz(transactions, { budgets, aliases, dismissedRecurring, recurringKinds })
    if (qs.length < 3) {
      setTooSparse(true)
      return
    }
    setTooSparse(false)
    setQuestions(qs)
    setAnswers(Array(qs.length).fill(null))
    setIndex(0)
    recordedRef.current = false
    setPhase('playing')
  }

  if (!hasData) {
    return (
      <Shell>
        <div className="mb-4">
          <DailyQuestionCard />
        </div>
        <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900">
          <EmptyState
            icon={<QuizIcon className="h-7 w-7" />}
            title="Your quiz is waiting for data"
            message="The quiz is built entirely from your own transactions. Load the sample data or import a CSV, then come back to test how well you know your spending."
          >
            <button
              onClick={loadSample}
              className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
            >
              Load sample data
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="rounded-lg border border-linen-300 dark:border-linen-600 px-4 py-2 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800"
            >
              Go to Import
            </button>
          </EmptyState>
        </div>
      </Shell>
    )
  }

  if (phase === 'intro') {
    return (
      <Shell>
        <div className="mb-4">
          <DailyQuestionCard />
        </div>
        <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-gradient-to-br from-forest-50 to-cream dark:from-forest-950/40 dark:to-linen-900 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600 text-white">
            <QuizIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-5 font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">
            How well do you know your money?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-linen-500 dark:text-linen-400">
            We&apos;ll generate up to 10 multiple-choice questions from your own transactions.
            Each one teaches you something about your habits — and a fresh mix appears every time
            you play.
          </p>
          {tooSparse && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-honey-50 dark:bg-honey-500/10 p-3 text-sm text-honey-700 dark:text-honey-300">
              There isn&apos;t quite enough data to build a good quiz yet. Try importing more
              transactions or loading the sample data.
            </p>
          )}
          <button
            onClick={start}
            className="mt-6 rounded-lg bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
          >
            Start quiz
          </button>
        </div>
        {quizHistory.length > 0 && (
          <div className="mt-4">
            <QuizHistory history={quizHistory} />
          </div>
        )}
        <div className="mt-4">
          <BadgesCard badges={game.badges} />
        </div>
      </Shell>
    )
  }

  if (phase === 'done') {
    return (
      <Shell>
        <Results
          questions={questions}
          answers={answers}
          onRetake={start}
          onReview={() => {
            setIndex(0)
            setPhase('playing')
          }}
        />
      </Shell>
    )
  }

  // playing
  const q = questions[index]
  const selected = answers[index]
  const answered = selected !== null
  const isLast = index === questions.length - 1
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100

  const choose = (optIdx: number) => {
    if (answered) return
    setAnswers((prev) => {
      const next = prev.slice()
      next[index] = optIdx
      return next
    })
  }

  const goNext = () => {
    if (isLast) {
      if (!recordedRef.current) {
        const correct = score(questions, answers)
        recordQuizResult(correct, questions.length)
        track('quiz.complete', { correct, total: questions.length })
        recordedRef.current = true
      }
      setPhase('done')
    } else setIndex((i) => i + 1)
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-linen-500 dark:text-linen-400">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>{score(questions, answers)} correct so far</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-linen-200">
            <div
              className="h-full rounded-full bg-forest-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-6">
          <h3 className="font-display text-lg font-semibold text-linen-800 dark:text-linen-100">{q.prompt}</h3>

          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex
              const isChosen = i === selected
              let cls =
                'border-linen-200 dark:border-linen-700 hover:border-forest-400 hover:bg-forest-50/40 text-linen-700 dark:text-linen-200'
              if (answered) {
                if (isCorrect) cls = 'border-forest-500 bg-forest-50 dark:bg-forest-500/10 text-forest-800 dark:text-forest-300'
                else if (isChosen) cls = 'border-rose-400 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                else cls = 'border-linen-200 dark:border-linen-700 text-linen-400 dark:text-linen-500'
              }
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${cls} ${
                    answered ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && <CheckIcon className="h-5 w-5 text-forest-600" />}
                  {answered && isChosen && !isCorrect && (
                    <XIcon className="h-5 w-5 text-rose-500" />
                  )}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className="mt-5 space-y-3">
              <div
                className={`rounded-xl p-4 text-sm ${
                  selected === q.correctIndex
                    ? 'bg-forest-50 dark:bg-forest-500/10 text-forest-800 dark:text-forest-300'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="font-semibold">
                  {selected === q.correctIndex ? 'Correct!' : 'Not quite.'}
                </div>
                <div className="mt-0.5">{q.answerDetail}</div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-linen-50 dark:bg-linen-800/50 p-4 text-sm text-linen-600 dark:text-linen-300">
                <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-500" />
                <span>{q.takeaway}</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={goNext}
                  className="rounded-lg bg-forest-600 px-5 py-2 text-sm font-semibold text-white hover:bg-forest-700"
                >
                  {isLast ? 'See results' : 'Next question'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* The receipts: transactions behind the answer, shown once answered */}
        {answered && (
          <div className="mt-4">
            <QuizEvidence evidence={q.evidence} />
          </div>
        )}
      </div>
    </Shell>
  )
}

function score(questions: QuizQuestion[], answers: (number | null)[]): number {
  return questions.reduce(
    (acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc),
    0,
  )
}

function Results({
  questions,
  answers,
  onRetake,
  onReview,
}: {
  questions: QuizQuestion[]
  answers: (number | null)[]
  onRetake: () => void
  onReview: () => void
}) {
  const { transactions, quizHistory, aliases, dismissedRecurring, recurringKinds } = useStore()
  const correct = score(questions, answers)
  const total = questions.length
  const pct = Math.round((correct / total) * 100)
  const insights = useMemo(
    () =>
      quizInsights(transactions, askedKinds(questions), {
        aliases,
        dismissedRecurring,
        recurringKinds,
      }),
    [transactions, questions, aliases, dismissedRecurring, recurringKinds],
  )

  const verdict =
    pct >= 80
      ? 'Impressive — you really know your spending.'
      : pct >= 50
        ? 'Not bad! A few numbers surprised you.'
        : 'Your money had some surprises in store — now you know them.'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-8 text-center">
        <div className="text-sm font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
          Your score
        </div>
        <div className="mt-1 text-5xl font-bold text-linen-800 dark:text-linen-100">
          {correct}
          <span className="text-2xl text-linen-400 dark:text-linen-500"> / {total}</span>
        </div>
        <div className="mt-1 text-sm font-medium text-forest-600">{pct}%</div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-honey-50 dark:bg-honey-500/10 px-3 py-1 text-xs font-semibold text-honey-700 dark:text-honey-300">
          +{quizXp(correct, total)} XP earned
          {correct === total && ' · perfect bonus!'}
        </div>
        <p className="mx-auto mt-3 max-w-sm text-sm text-linen-500 dark:text-linen-400">{verdict}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onRetake}
            className="rounded-lg bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
          >
            Retake with new questions
          </button>
          <button
            onClick={onReview}
            className="rounded-lg border border-linen-300 dark:border-linen-600 px-4 py-2.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800"
          >
            Review answers
          </button>
        </div>
      </div>

      {quizHistory.length > 0 && <QuizHistory history={quizHistory} />}

      {insights.length > 0 && (
        <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-6">
          <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">What this quiz revealed</h3>
          <ul className="mt-3 space-y-2">
            {insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-linen-600 dark:text-linen-300">
                <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-500" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-6">
        <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Question review</h3>
        <ul className="mt-3 space-y-3">
          {questions.map((q, i) => {
            const right = answers[i] === q.correctIndex
            return (
              <li key={q.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    right ? 'bg-forest-100 text-forest-600' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {right ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <div className="font-medium text-linen-700 dark:text-linen-200">{q.prompt}</div>
                  <div className="text-linen-500 dark:text-linen-400">{q.answerDetail}</div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">Quiz</h2>
      {children}
    </div>
  )
}
