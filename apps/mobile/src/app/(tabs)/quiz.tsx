/**
 * The quiz — up to 10 multiple-choice questions generated from the user's own
 * transactions (same engine as the web). Intro → playing → results, with the
 * receipts (evidence lists), insights, and XP awards carried over intact.
 *
 * The game moments match the web (docs/DESIGN.md): a right answer pops with
 * a chime, a success haptic, flakes and "+10 XP"; "not quite" shakes gently
 * with a soft tone; three right in a row lights a streak flame; finishing
 * counts the score up around a filling ring with confetti and a fanfare.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useStore } from '@moneyquiz/core'
import { quizXp, XP } from '@moneyquiz/core/lib/gamification'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { askedKinds, generateQuiz, quizInsights, type QuizQuestion } from '@moneyquiz/core/lib/quiz'

import { AnswerOption } from '@/components/AnswerOption'
import { BadgesCard } from '@/components/BadgesCard'
import { Omer } from '@/components/Omer'
import { QuizEvidence } from '@/components/QuizEvidence'
import { QuizStatsRow } from '@/components/QuizStatsRow'
import { SoundToggle } from '@/components/SoundToggle'
import { StreakFlame } from '@/components/StreakFlame'
import { Confetti } from '@/components/celebrate/Confetti'
import { Bar, Button, Card, CardTitle, Empty, Note, Screen, StatusLine } from '@/components/ui'
import { haptic } from '@/lib/haptics'
import { preloadSounds, useSound } from '@/lib/sound'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

type Phase = 'intro' | 'playing' | 'done'

/* A little variety in the praise, so the tenth right answer still feels fresh. */
const PRAISE = ['Correct!', 'Nice!', 'You got it!', 'Spot on!', 'Well done!']

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const RING = 2 * Math.PI * 54

export default function QuizScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const play = useSound()
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
  // The question answered in this sitting (not one revisited in review), so
  // only a fresh answer plays its moment.
  const [justAnswered, setJustAnswered] = useState<number | null>(null)
  // The results celebrate once per quiz; coming back from review stays calm.
  const [resultsFresh, setResultsFresh] = useState(true)
  const [tooSparse, setTooSparse] = useState(false)
  const recordedRef = useRef(false)

  useEffect(() => preloadSounds(), [])

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

  if (!hasData) {
    return (
      <Screen title="Quiz">
        <Card>
          <Empty
            art={<Omer {...omerFor({ kind: 'welcome' })} size={104} />}
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
      <Screen title="Quiz" right={<SoundToggle />}>
        <Card tone="warm" style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Omer {...omerFor({ kind: 'quiz-intro' })} size={120} />
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 21, color: colors.ink, textAlign: 'center' }}>
            How well do you know your money?
          </Text>
          <Note>
            Up to 10 quick questions built from your own transactions. Each one teaches you something
            about your habits, and a fresh mix appears every time you play.
          </Note>
          {tooSparse && (
            <StatusLine kind="error">
              There isn&apos;t quite enough data to build a good quiz yet. Try importing more
              transactions or loading the sample data.
            </StatusLine>
          )}
          <View style={{ alignSelf: 'stretch', marginTop: spacing.xs }}>
            <Button title="Start quiz" onPress={start} />
          </View>
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
          celebrate={resultsFresh}
          onCelebrated={() => setResultsFresh(false)}
          onRetake={start}
          onReview={() => {
            setIndex(0)
            setJustAnswered(null)
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
  const right = answered && selected === q.correctIndex
  const fresh = justAnswered === index
  const inARow = right ? runOfRight(questions, answers, index) : 0

  const choose = (optIdx: number) => {
    if (answered) return
    setAnswers((prev) => {
      const next = prev.slice()
      next[index] = optIdx
      return next
    })
    setJustAnswered(index)
    if (optIdx === q.correctIndex) {
      play('chime')
      haptic.success()
    } else {
      play('soft')
      haptic.notQuite()
    }
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
    <Screen title="Quiz" right={<SoundToggle />}>
      <View style={{ gap: spacing.xs + 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.rounded, fontSize: 13, color: colors.muted }}>
            Question {index + 1} of {questions.length}
          </Text>
          {inARow >= 3 ? (
            <Animated.View
              key={inARow}
              entering={fresh ? ZoomIn.springify().damping(13) : undefined}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <StreakFlame size={16} />
              <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 13, color: colors.accentDeep }}>{inARow} in a row!</Text>
            </Animated.View>
          ) : (
            <Text style={{ fontFamily: fonts.rounded, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] }}>
              {score(questions, answers)} right so far
            </Text>
          )}
        </View>
        <Bar pct={progress} color={colors.primary} height={10} reward />
      </View>

      <Card>
        <Animated.Text
          key={index}
          entering={FadeInDown.duration(240)}
          style={{ fontFamily: fonts.roundedHeavy, fontSize: 18, lineHeight: 24, color: colors.ink }}
        >
          {q.prompt}
        </Animated.Text>
        <View style={{ gap: spacing.sm + 2 }}>
          {q.options.map((opt, i) => (
            <AnswerOption
              key={`${index}-${i}`}
              label={opt}
              index={i}
              answered={answered}
              isCorrect={i === q.correctIndex}
              isChosen={i === selected}
              celebrate={fresh}
              xp={XP.quizPerCorrect}
              onPress={() => choose(i)}
            />
          ))}
        </View>

        {answered && (
          <Animated.View entering={fresh ? FadeInDown.duration(320) : undefined} style={{ gap: spacing.sm }}>
            <View
              accessibilityLiveRegion="polite"
              style={{
                borderRadius: radii.lg,
                borderWidth: 2,
                borderColor: right ? `${colors.primary}40` : colors.dangerBorder,
                padding: spacing.md,
                backgroundColor: right ? colors.primarySoft : colors.dangerSoft,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 19, color: right ? colors.success : colors.danger }}>
                  {right ? `✓ ${PRAISE[index % PRAISE.length]}` : '✕ Not quite.'}
                </Text>
                {right && (
                  <Animated.View
                    entering={fresh ? ZoomIn.delay(150).springify().damping(13) : undefined}
                    style={{
                      borderRadius: radii.pill,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      backgroundColor: colors.reward,
                      borderBottomWidth: 2,
                      borderBottomColor: colors.rewardEdge,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 13, color: colors.onReward }}>
                      +{XP.quizPerCorrect} XP
                    </Text>
                  </Animated.View>
                )}
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: right ? colors.success : colors.danger }}>
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
            {/* Omer reacts beside the button, away from the answer detail above, which names amounts. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Omer key={index} {...omerFor({ kind: 'answer', right })} size={52} motion={fresh ? undefined : 'still'} />
              <View style={{ flex: 1 }}>
                <Button title={isLast ? 'See results' : 'Next question'} onPress={goNext} />
              </View>
            </View>
          </Animated.View>
        )}
      </Card>

      {answered && <QuizEvidence evidence={q.evidence} />}
    </Screen>
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

/** Counts up to `target` (ease-out) when `animate`; otherwise just the number. */
function useCountUp(target: number, animate: boolean): number {
  const [value, setValue] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate) {
      setValue(target)
      return
    }
    let frame = 0
    const start = Date.now() + 150
    const tick = () => {
      const k = Math.min(1, Math.max(0, (Date.now() - start) / 900))
      setValue(Math.round((1 - Math.pow(1 - k, 3)) * target))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, animate])
  return value
}

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
  const { colors } = useAppTheme()
  const reduce = useReducedMotion()
  const play = useSound()
  const { transactions, quizHistory, aliases, dismissedRecurring, recurringKinds } = useStore()
  // Captured on arrival: the parent clears the flag straight away (so a
  // return from review stays calm), and that mustn't cut this moment short.
  const [celebrate] = useState(celebrateProp)
  const correct = score(questions, answers)
  const total = questions.length
  const pct = Math.round((correct / total) * 100)
  const perfect = correct === total
  const animate = celebrate && !reduce
  const shown = useCountUp(correct, animate)
  const insights = useMemo(
    () =>
      quizInsights(transactions, askedKinds(questions), {
        aliases,
        dismissedRecurring,
        recurringKinds,
      }),
    [transactions, questions, aliases, dismissedRecurring, recurringKinds],
  )

  const target = RING * (1 - pct / 100)
  const offset = useSharedValue(animate ? RING : target)
  useEffect(() => {
    if (animate) offset.value = withDelay(150, withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) }))
  }, [animate, target, offset])
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }))

  useEffect(() => {
    if (!celebrate) return
    // Under half right is still a finish worth marking, just softer: a drop, no party.
    play(pct >= 50 ? 'fanfare' : 'drop')
    if (pct >= 50) haptic.success()
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
    <View style={{ gap: spacing.md }}>
      <Card style={{ alignItems: 'center', overflow: 'visible' }}>
        <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 11, letterSpacing: 2, color: colors.faint }}>YOUR SCORE</Text>
        <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={140} height={140} viewBox="0 0 120 120" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={60} cy={60} r={54} fill="none" strokeWidth={10} stroke={colors.border} />
            <AnimatedCircle
              cx={60}
              cy={60}
              r={54}
              fill="none"
              strokeWidth={10}
              strokeLinecap="round"
              stroke={perfect ? colors.reward : colors.primary}
              strokeDasharray={`${RING} ${RING}`}
              animatedProps={ringProps}
            />
          </Svg>
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 44, color: colors.ink, fontVariant: ['tabular-nums'] }}>
            {shown}
            <Text style={{ fontSize: 20, color: colors.faint }}> / {total}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.rounded, fontSize: 13, color: colors.success }}>{pct}%</Text>
          {celebrate && pct >= 50 && (
            <Confetti mode="pop" count={perfect ? 40 : 26} delay={250} style={{ position: 'absolute', top: 70, left: 70 }} />
          )}
          {/* Beside the ring, so the score stays centred. */}
          <Omer
            {...omerFor({ kind: 'quiz-finished' })}
            size={84}
            motion={celebrate && pct >= 50 ? 'move' : 'none'}
            style={{ position: 'absolute', left: 144, bottom: 0 }}
          />
        </View>
        {perfect && (
          <Animated.View
            entering={celebrate ? ZoomIn.delay(1100).springify().damping(13) : undefined}
            style={{
              transform: [{ rotate: '-3deg' }],
              borderRadius: radii.md,
              borderWidth: 2,
              borderBottomWidth: 4,
              borderColor: colors.onReward,
              backgroundColor: colors.reward,
              paddingHorizontal: spacing.md,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 17, color: colors.onReward }}>PERFECT!</Text>
          </Animated.View>
        )}
        <Animated.View
          entering={celebrate ? ZoomIn.delay(900).springify().damping(9) : undefined}
          style={{
            borderRadius: 999,
            backgroundColor: colors.accentSoft,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 13, color: colors.accentDeep }}>
            +{quizXp(correct, total)} XP earned{perfect && ' · perfect bonus!'}
          </Text>
        </Animated.View>
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
