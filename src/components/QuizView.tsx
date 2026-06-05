import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { generateQuiz, quizInsights, type QuizQuestion } from '../lib/quiz'
import { EmptyState } from './EmptyState'
import { CheckIcon, QuizIcon, SparkIcon, XIcon } from './icons'
import type { View } from './Nav'

type Phase = 'intro' | 'playing' | 'done'

interface Props {
  onNavigate: (v: View) => void
}

export function QuizView({ onNavigate }: Props) {
  const { transactions, hasData, loadSample } = useStore()
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [tooSparse, setTooSparse] = useState(false)

  const start = () => {
    const qs = generateQuiz(transactions)
    if (qs.length < 3) {
      setTooSparse(true)
      return
    }
    setTooSparse(false)
    setQuestions(qs)
    setAnswers(Array(qs.length).fill(null))
    setIndex(0)
    setPhase('playing')
  }

  if (!hasData) {
    return (
      <Shell>
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={<QuizIcon className="h-7 w-7" />}
            title="Your quiz is waiting for data"
            message="The quiz is built entirely from your own transactions. Load the sample data or import a CSV, then come back to test how well you know your spending."
          >
            <button
              onClick={loadSample}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Load sample data
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <QuizIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-800">
            How well do you know your money?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            We&apos;ll generate up to 10 multiple-choice questions from your own transactions.
            Each one teaches you something about your habits — and a fresh mix appears every time
            you play.
          </p>
          {tooSparse && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              There isn&apos;t quite enough data to build a good quiz yet. Try importing more
              transactions or loading the sample data.
            </p>
          )}
          <button
            onClick={start}
            className="mt-6 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Start quiz
          </button>
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
    if (isLast) setPhase('done')
    else setIndex((i) => i + 1)
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>{score(questions, answers)} correct so far</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-800">{q.prompt}</h3>

          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex
              const isChosen = i === selected
              let cls =
                'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700'
              if (answered) {
                if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
                else if (isChosen) cls = 'border-rose-400 bg-rose-50 text-rose-700'
                else cls = 'border-slate-200 text-slate-400'
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
                  {answered && isCorrect && <CheckIcon className="h-5 w-5 text-emerald-600" />}
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
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-rose-50 text-rose-800'
                }`}
              >
                <div className="font-semibold">
                  {selected === q.correctIndex ? 'Correct!' : 'Not quite.'}
                </div>
                <div className="mt-0.5">{q.answerDetail}</div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{q.takeaway}</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={goNext}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {isLast ? 'See results' : 'Next question'}
                </button>
              </div>
            </div>
          )}
        </div>
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
  const { transactions } = useStore()
  const correct = score(questions, answers)
  const total = questions.length
  const pct = Math.round((correct / total) * 100)
  const insights = useMemo(() => quizInsights(transactions), [transactions])

  const verdict =
    pct >= 80
      ? 'Impressive — you really know your spending.'
      : pct >= 50
        ? 'Not bad! A few numbers surprised you.'
        : 'Your money had some surprises in store — now you know them.'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Your score
        </div>
        <div className="mt-1 text-5xl font-bold text-slate-800">
          {correct}
          <span className="text-2xl text-slate-400"> / {total}</span>
        </div>
        <div className="mt-1 text-sm font-medium text-emerald-600">{pct}%</div>
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">{verdict}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onRetake}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Retake with new questions
          </button>
          <button
            onClick={onReview}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Review answers
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-800">What this quiz revealed</h3>
          <ul className="mt-3 space-y-2">
            {insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-800">Question review</h3>
        <ul className="mt-3 space-y-3">
          {questions.map((q, i) => {
            const right = answers[i] === q.correctIndex
            return (
              <li key={q.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    right ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {right ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <div className="font-medium text-slate-700">{q.prompt}</div>
                  <div className="text-slate-500">{q.answerDetail}</div>
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
      <h2 className="mb-4 text-xl font-bold text-slate-800">Quiz</h2>
      {children}
    </div>
  )
}
