/**
 * The quiz: up to 10 questions built from the person's own transactions.
 * Intro → playing → results, and the place the game moments live
 * (docs/DESIGN.md): a right answer pops with a chime, flakes and "+10 XP";
 * "not quite" shakes gently with a soft tone; three right in a row lights a
 * streak flame; finishing counts the score up around a filling ring with
 * confetti and a fanfare. Number keys 1–4 answer and Enter moves on.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { askedKinds, generateQuiz, quizInsights, type QuizQuestion } from '@moneyquiz/core/lib/quiz'
import { quizXp, XP } from '@moneyquiz/core/lib/gamification'
import { track } from '../lib/track'
import { preloadSounds, useSound } from '../lib/sound'
import { AnswerChoice } from './AnswerChoice'
import { QuizEvidence } from './QuizEvidence'
import { QuizHistory } from './QuizHistory'
import { BadgesCard } from './BadgesCard'
import { DailyQuestionCard } from './DailyQuestionCard'
import { EmptyState } from './EmptyState'
import { SoundToggle } from './SoundToggle'
import { StreakFlame } from './StreakFlame'
import { Confetti } from './celebrate/Confetti'
import { useCountUp } from './celebrate/useCountUp'
import { CheckIcon, QuizIcon, SparkIcon, XIcon } from './icons'
import type { View } from './Nav'

type Phase = 'intro' | 'playing' | 'done'

/* A little variety in the praise, so the tenth right answer still feels fresh. */
const PRAISE = ['Correct!', 'Nice!', 'You got it!', 'Spot on!', 'Well done!']

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
  const play = useSound()
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  // The question answered in this sitting (not one revisited in review), so
  // only a fresh answer plays its moment.
  const [justAnswered, setJustAnswered] = useState<number | null>(null)
  const [tooSparse, setTooSparse] = useState(false)
  const recordedRef = useRef(false)
  // The results celebrate once per quiz; coming back from "Review answers" stays calm.
  const [resultsFresh, setResultsFresh] = useState(true)

  useEffect(() => preloadSounds(), [])

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
    setJustAnswered(null)
    setResultsFresh(true)
    recordedRef.current = false
    setPhase('playing')
  }

  const q = questions[index]
  const selected = phase === 'playing' ? answers[index] : null
  const answered = selected !== null && selected !== undefined
  const isLast = index === questions.length - 1

  const choose = (optIdx: number) => {
    if (answered || !q) return
    setAnswers((prev) => {
      const next = prev.slice()
      next[index] = optIdx
      return next
    })
    setJustAnswered(index)
    play(optIdx === q.correctIndex ? 'chime' : 'soft')
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

  // Keyboard: 1–4 answer, Enter moves on (unless a button has focus and will
  // take the Enter itself, or a dialog is open).
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (document.querySelector('[aria-modal="true"]')) return
      const n = Number(e.key)
      if (q && Number.isInteger(n) && n >= 1 && n <= q.options.length) {
        e.preventDefault()
        choose(n - 1)
      } else if (e.key === 'Enter' && answered && t?.tagName !== 'BUTTON') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!hasData) {
    return (
      <Shell>
        <div className="mb-4">
          <DailyQuestionCard />
        </div>
        <div className="card">
          <EmptyState
            icon={<QuizIcon className="h-7 w-7" />}
            title="Your quiz is waiting for data"
            message="The quiz is built entirely from your own transactions. Load the sample data or import a CSV, then come back to test how well you know your spending."
          >
            <button onClick={loadSample} className="btn-primary px-4 py-2 text-sm">
              Load sample data
            </button>
            <button onClick={() => onNavigate('import')} className="btn-secondary px-4 py-2 text-sm">
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
        <div className="rounded-2xl border border-linen-200 bg-linear-to-b from-cream via-honey-50 to-sky-50 px-6 pt-6 pb-8 text-center dark:border-linen-700 dark:from-linen-900 dark:via-linen-900 dark:to-sky-950/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-[0_4px_0_var(--color-forest-800)]">
            <QuizIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-rounded text-2xl font-extrabold text-linen-900 dark:text-linen-50">
            How well do you know your money?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-linen-600 dark:text-linen-400">
            Up to 10 quick questions built from your own transactions. Each one teaches you something
            about your habits, and a fresh mix appears every time you play.
          </p>
          {tooSparse && (
            <p className="mx-auto mt-4 max-w-md rounded-xl bg-honey-50 p-3 text-sm text-honey-700 dark:bg-honey-500/10 dark:text-honey-300">
              There isn&apos;t quite enough data to build a good quiz yet. Try importing more
              transactions or loading the sample data.
            </p>
          )}
          <button onClick={start} className="btn-primary mt-6 h-12 px-8 text-base">
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
          celebrate={resultsFresh}
          onCelebrated={() => setResultsFresh(false)}
          onRetake={start}
          onReview={() => {
            setIndex(0)
            setJustAnswered(null)
            setPhase('playing')
          }}
        />
      </Shell>
    )
  }

  // playing
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100
  const right = answered && selected === q.correctIndex
  const fresh = justAnswered === index
  const inARow = right ? runOfRight(questions, answers, index) : 0

  return (
    <Shell right={<SoundToggle />}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between font-rounded text-sm font-bold text-linen-500 dark:text-linen-400">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            {inARow >= 3 ? (
              <span key={inARow} className="text-honey-700 dark:text-honey-300">
                <StreakFlame grow={fresh} />{' '}
                {inARow} in a row!
              </span>
            ) : (
              <span className="tabular-nums">{score(questions, answers)} right so far</span>
            )}
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-linen-200 dark:bg-linen-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={index + (answered ? 1 : 0)}
            aria-label="Quiz progress"
          >
            <div
              className="relative h-full rounded-full bg-forest-500 transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/35" />
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 key={index} className="view-in font-rounded text-xl font-extrabold text-linen-900 dark:text-linen-50">
            {q.prompt}
          </h3>

          <div className="mt-4 space-y-3">
            {q.options.map((opt, i) => (
              <AnswerChoice
                key={`${index}-${i}`}
                label={opt}
                index={i}
                answered={answered}
                isCorrect={i === q.correctIndex}
                isChosen={i === selected}
                celebrate={fresh}
                xp={XP.quizPerCorrect}
                onChoose={() => choose(i)}
              />
            ))}
          </div>

          {answered && (
            <div className="mt-5 space-y-3">
              <div
                role="status"
                className={`rounded-2xl border-2 p-4 ${fresh ? 'feedback-in' : ''} ${
                  right
                    ? 'border-forest-200 bg-forest-50 dark:border-forest-500/30 dark:bg-forest-500/10'
                    : 'border-coral-200 bg-coral-50 dark:border-coral-500/30 dark:bg-coral-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`flex items-center gap-2 font-rounded text-xl font-black ${
                      right ? 'text-forest-700 dark:text-forest-300' : 'text-coral-700 dark:text-coral-300'
                    }`}
                  >
                    {right ? <CheckIcon className="h-6 w-6" /> : <XIcon className="h-6 w-6" />}
                    {right ? PRAISE[index % PRAISE.length] : 'Not quite.'}
                  </div>
                  {right && (
                    <span
                      className={`rounded-full bg-honey-400 px-3 py-1 font-rounded text-sm font-black text-linen-900 shadow-[0_2px_0_var(--color-honey-600)] ${fresh ? 'chip-pop' : ''}`}
                    >
                      +{XP.quizPerCorrect} XP
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${right ? 'text-forest-800 dark:text-forest-200' : 'text-coral-800 dark:text-coral-200'}`}>
                  {q.answerDetail}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-2xl bg-linen-50 p-4 text-sm text-linen-600 dark:bg-linen-800/50 dark:text-linen-300">
                <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-500" />
                <span>{q.takeaway}</span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="hidden text-xs text-linen-400 sm:inline dark:text-linen-500">Press Enter</span>
                <button onClick={goNext} className="btn-primary h-11 px-6 text-sm">
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
  return questions.reduce((acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc), 0)
}

/** Right answers in a row, ending at question `upTo`. */
function runOfRight(questions: QuizQuestion[], answers: (number | null)[], upTo: number): number {
  let run = 0
  for (let i = upTo; i >= 0 && answers[i] === questions[i].correctIndex; i--) run++
  return run
}

const RING = 2 * Math.PI * 54

function Results({
  questions,
  answers,
  celebrate: celebrateProp,
  onCelebrated,
  onRetake,
  onReview,
}: {
  questions: QuizQuestion[]
  answers: (number | null)[]
  /** First time on this quiz's results: count up, confetti, fanfare. */
  celebrate: boolean
  onCelebrated: () => void
  onRetake: () => void
  onReview: () => void
}) {
  const { transactions, quizHistory, aliases, dismissedRecurring, recurringKinds } = useStore()
  const play = useSound()
  // Captured on arrival: the parent clears the flag straight away (so a
  // return from review stays calm), and that mustn't cut this moment short.
  const [celebrate] = useState(celebrateProp)
  const correct = score(questions, answers)
  const total = questions.length
  const pct = Math.round((correct / total) * 100)
  const perfect = correct === total
  const party = celebrate && pct >= 50
  const shown = useCountUp(correct, celebrate ? 900 : 0)
  const insights = useMemo(
    () =>
      quizInsights(transactions, askedKinds(questions), {
        aliases,
        dismissedRecurring,
        recurringKinds,
      }),
    [transactions, questions, aliases, dismissedRecurring, recurringKinds],
  )

  useEffect(() => {
    if (!celebrate) return
    // Under half right is still a finish worth marking, just softer: a drop, no party.
    play(pct >= 50 ? 'fanfare' : 'drop')
    onCelebrated()
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verdict =
    pct >= 80
      ? 'Impressive. You really know your spending.'
      : pct >= 50
        ? 'Not bad! A few numbers surprised you.'
        : 'Your money had some surprises in store, and now you know them.'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card relative p-8 text-center">
        {party && (
          <Confetti mode="pop" count={perfect ? 46 : 30} className="absolute top-[6.5rem] left-1/2 z-10 h-0 w-0" delay={250} />
        )}
        <div className="font-rounded text-xs font-extrabold tracking-[0.2em] text-linen-400 uppercase dark:text-linen-500">
          Your score
        </div>
        <div className="relative mx-auto mt-3 h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" className="stroke-linen-200 dark:stroke-linen-700" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING}
              className={`${perfect ? 'stroke-honey-400' : 'stroke-forest-500'} ${celebrate ? 'ring-fill' : ''}`}
              style={
                {
                  strokeDashoffset: RING * (1 - pct / 100),
                  '--ring-from': RING,
                  '--ring-to': RING * (1 - pct / 100),
                } as CSSProperties
              }
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-rounded text-5xl font-black text-linen-900 tabular-nums dark:text-linen-50">
              {shown}
              <span className="text-2xl font-extrabold text-linen-400 dark:text-linen-500"> / {total}</span>
            </div>
            <div className="font-rounded text-sm font-bold text-forest-600 dark:text-forest-400">{pct}%</div>
          </div>
        </div>
        {perfect && (
          <div className={`mx-auto mt-3 w-fit -rotate-3 rounded-xl border-2 border-linen-900 bg-honey-300 px-4 py-1 font-rounded text-lg font-black text-linen-900 shadow-[0_3px_0_var(--color-linen-900)] ${celebrate ? 'chip-pop' : ''}`} style={{ animationDelay: '1100ms' }}>
            PERFECT!
          </div>
        )}
        <div
          className={`mt-3 inline-flex items-center gap-1 rounded-full bg-honey-50 px-3 py-1 font-rounded text-sm font-extrabold text-honey-700 dark:bg-honey-500/10 dark:text-honey-300 ${celebrate ? 'chip-pop' : ''}`}
          style={{ animationDelay: '900ms' }}
        >
          +{quizXp(correct, total)} XP earned
          {perfect && ' · perfect bonus!'}
        </div>
        <p className="mx-auto mt-3 max-w-sm text-sm text-linen-600 dark:text-linen-400">{verdict}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={onRetake} className="btn-primary h-11 px-6 text-sm">
            Retake with new questions
          </button>
          <button onClick={onReview} className="btn-secondary h-11 px-4 text-sm">
            Review answers
          </button>
        </div>
      </div>

      {quizHistory.length > 0 && <QuizHistory history={quizHistory} />}

      {insights.length > 0 && (
        <div className="card p-6">
          <h3 className="font-rounded text-lg font-extrabold text-linen-800 dark:text-linen-100">What this quiz revealed</h3>
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

      <div className="card p-6">
        <h3 className="font-rounded text-lg font-extrabold text-linen-800 dark:text-linen-100">Question review</h3>
        <ul className="mt-3 space-y-3">
          {questions.map((q, i) => {
            const right = answers[i] === q.correctIndex
            return (
              <li key={q.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    right
                      ? 'bg-forest-100 text-forest-700 dark:bg-forest-500/15 dark:text-forest-300'
                      : 'bg-coral-100 text-coral-700 dark:bg-coral-500/15 dark:text-coral-300'
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

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-rounded text-[26px] font-extrabold text-linen-900 dark:text-linen-50">Quiz</h2>
        {right}
      </div>
      {children}
    </div>
  )
}
