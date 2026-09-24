/**
 * The quiz — up to 10 multiple-choice questions generated from the user's own
 * transactions (same engine as the web). Intro → playing → results, with the
 * receipts (evidence lists), insights, and XP awards carried over intact.
 */
import { useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useStore } from '@moneyquiz/core'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import { quizXp } from '@moneyquiz/core/lib/gamification'
import { askedKinds, generateQuiz, quizInsights, type QuizQuestion } from '@moneyquiz/core/lib/quiz'

import { AnswerOption } from '@/components/AnswerOption'
import { BadgesCard } from '@/components/BadgesCard'
import { QuizEvidence } from '@/components/QuizEvidence'
import { QuizStatsRow } from '@/components/QuizStatsRow'
import { Bar, Button, Card, CardTitle, Empty, Note, Screen, StatusLine } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

type Phase = 'intro' | 'playing' | 'done'

export default function QuizScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
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
      <Screen title="Quiz">
        <Card>
          <Empty
            emoji="🎓"
            title="Your quiz is waiting for data"
            message="The quiz is built entirely from your own transactions. Load the sample data or connect an account, then come back to test how well you know your spending."
          >
            <Button title="Load sample data" onPress={loadSample} />
            <Button title="Go to Import" variant="outline" onPress={() => router.push('/import')} />
          </Empty>
        </Card>
      </Screen>
    )
  }

  if (phase === 'intro') {
    return (
      <Screen title="Quiz">
        <Card>
          <Text style={{ fontSize: 34, textAlign: 'center' }}>🎓</Text>
          <Text
            style={{
              fontFamily: fonts.rounded,
              fontSize: 19,
              color: colors.ink,
              textAlign: 'center',
            }}
          >
            How well do you know your money?
          </Text>
          <Note>
            We&apos;ll generate up to 10 multiple-choice questions from your own transactions. Each
            one teaches you something about your habits — and a fresh mix appears every time you
            play.
          </Note>
          {tooSparse && (
            <StatusLine kind="error">
              There isn&apos;t quite enough data to build a good quiz yet. Try importing more
              transactions or loading the sample data.
            </StatusLine>
          )}
          <Button title="Start quiz" onPress={start} />
        </Card>
        <QuizStatsRow history={quizHistory} />
        <BadgesCard badges={game.badges} />
      </Screen>
    )
  }

  if (phase === 'done') {
    return (
      <Screen title="Quiz">
        <Results
          questions={questions}
          answers={answers}
          onRetake={start}
          onReview={() => {
            setIndex(0)
            setPhase('playing')
          }}
        />
      </Screen>
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
        recordQuizResult(score(questions, answers), questions.length)
        recordedRef.current = true
      }
      setPhase('done')
    } else setIndex((i) => i + 1)
  }

  return (
    <Screen title="Quiz">
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted }}>
            Question {index + 1} of {questions.length}
          </Text>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted }}>
            {score(questions, answers)} correct so far
          </Text>
        </View>
        <Bar pct={progress} color={colors.primary} />
      </View>

      <Card>
        <Text style={{ fontFamily: fonts.rounded, fontSize: 17, lineHeight: 23, color: colors.ink }}>
          {q.prompt}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {q.options.map((opt, i) => (
            <AnswerOption
              key={i}
              label={opt}
              answered={answered}
              isCorrect={i === q.correctIndex}
              isChosen={i === selected}
              onPress={() => choose(i)}
            />
          ))}
        </View>

        {answered && (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                borderRadius: radii.md,
                padding: spacing.md,
                backgroundColor: selected === q.correctIndex ? colors.primarySoft : colors.dangerSoft,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  lineHeight: 19,
                  color: selected === q.correctIndex ? colors.success : colors.danger,
                }}
              >
                <Text style={{ fontFamily: fonts.sansSemiBold }}>
                  {selected === q.correctIndex ? 'Correct! ' : 'Not quite. '}
                </Text>
                {q.answerDetail}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                borderRadius: radii.md,
                padding: spacing.md,
                backgroundColor: colors.background,
              }}
            >
              <Text style={{ fontSize: 13 }}>✨</Text>
              <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.text }}>
                {q.takeaway}
              </Text>
            </View>
            <Button title={isLast ? 'See results' : 'Next question'} onPress={goNext} />
          </View>
        )}
      </Card>

      {answered && <QuizEvidence evidence={q.evidence} />}
    </Screen>
  )
}

function score(questions: QuizQuestion[], answers: (number | null)[]): number {
  return questions.reduce((acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc), 0)
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
  const { colors } = useAppTheme()
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
    <View style={{ gap: spacing.md }}>
      <Card style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: colors.faint,
          }}
        >
          Your score
        </Text>
        <Text style={{ fontFamily: fonts.rounded, fontSize: 44, color: colors.ink }}>
          {correct}
          <Text style={{ fontSize: 22, color: colors.faint }}> / {total}</Text>
        </Text>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.primary }}>
          {pct}%
        </Text>
        <View
          style={{
            borderRadius: 999,
            backgroundColor: colors.accentSoft,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.accentDeep }}>
            +{quizXp(correct, total)} XP earned{correct === total && ' · perfect bonus!'}
          </Text>
        </View>
        <Note>{verdict}</Note>
        <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title="Retake with new questions" onPress={onRetake} />
          <Button title="Review answers" variant="outline" onPress={onReview} />
        </View>
      </Card>

      <QuizStatsRow history={quizHistory} />

      {insights.length > 0 && (
        <Card>
          <CardTitle>What this quiz revealed</CardTitle>
          {insights.map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text style={{ fontSize: 13 }}>✨</Text>
              <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.text }}>
                {text}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <CardTitle>Question review</CardTitle>
        {questions.map((q, i) => {
          const right = answers[i] === q.correctIndex
          return (
            <View key={q.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 13,
                  color: right ? colors.success : colors.danger,
                }}
              >
                {right ? '✓' : '✕'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}>
                  {q.prompt}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.muted }}>
                  {q.answerDetail}
                </Text>
              </View>
            </View>
          )
        })}
      </Card>
    </View>
  )
}
