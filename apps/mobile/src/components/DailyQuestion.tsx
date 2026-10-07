/**
 * One question a day — the streak's habit hook, ported from the web's
 * DailyQuestionCard. Personalized from the user's own transactions when
 * there's data; a general financial-literacy question when there isn't, so
 * the daily habit starts before any account is connected. Answering earns XP
 * (a little more when correct); the same question stays up all day and a new
 * one arrives at midnight. Once answered it shows the same receipts the quiz
 * does — the transactions the figure came from. Answering counts today
 * toward the streak (the only thing that does) and plays the same moment as the quiz: the answer pops
 * (or shakes), a chime (or soft tone) with a haptic, and the streak flame
 * lights (it stays dim until something is answered today).
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useStore } from '@moneyquiz/core'
import { answerDaily, dailyQuestionXp, getDailyState } from '@moneyquiz/core/lib/dailyQuestion'
import { countedToday, liveStreak } from '@moneyquiz/core/lib/streak'

import { AnswerOption } from '@/components/AnswerOption'
import { QuizEvidence } from '@/components/QuizEvidence'
import { Card, CardTitle } from '@/components/ui'
import { haptic } from '@/lib/haptics'
import { useSound } from '@/lib/sound'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function DailyQuestion() {
  const { colors } = useAppTheme()
  const { transactions, budgets, aliases, dismissedRecurring, recurringKinds, awardXp, recordDailyAnswer, game } =
    useStore()
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
    if (right) haptic.success()
    else haptic.notQuite()
  }

  return (
    <Card tone="warm">
      <CardTitle
        right={
          <Animated.Text
            key={justAnswered ? 'lit' : 'still'}
            entering={justAnswered ? ZoomIn.springify().damping(7) : undefined}
            style={{ fontFamily: fonts.roundedHeavy, fontSize: 12, color: colors.accentDeep }}
          >
            <Text style={{ opacity: countedToday(game) ? 1 : 0.4 }}>🔥</Text> {liveStreak(game)}-day streak
          </Animated.Text>
        }
      >
        📅 Question of the day
      </CardTitle>
      {daily.source === 'general' && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
          A general one — connect your data to make it personal.
        </Text>
      )}

      <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 16, lineHeight: 22, color: colors.ink }}>
        {q.prompt}
      </Text>

      <View style={{ gap: spacing.sm }}>
        {q.options.map((opt, i) => (
          <AnswerOption
            key={i}
            label={opt}
            index={i}
            answered={answered}
            isCorrect={i === q.correctIndex}
            isChosen={i === daily.answer}
            celebrate={justAnswered}
            xp={dailyQuestionXp(true)}
            onPress={() => choose(i)}
          />
        ))}
      </View>

      {answered && (
        <Animated.View entering={justAnswered ? FadeInDown.duration(320) : undefined} style={{ gap: spacing.sm }}>
          <View
            style={{
              borderRadius: radii.md,
              padding: spacing.md,
              backgroundColor: correct ? colors.primarySoft : colors.dangerSoft,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                lineHeight: 19,
                color: correct ? colors.success : colors.danger,
              }}
            >
              <Text style={{ fontFamily: fonts.sansSemiBold }}>
                {correct ? 'Correct! ' : 'Not quite. '}
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
          <QuizEvidence evidence={q.evidence} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint, textAlign: 'center' }}>
            <Text style={{ fontFamily: fonts.roundedHeavy, color: colors.accentDeep }}>+{dailyQuestionXp(correct)} XP</Text> · come
            back tomorrow for a new one
          </Text>
        </Animated.View>
      )}
    </Card>
  )
}
