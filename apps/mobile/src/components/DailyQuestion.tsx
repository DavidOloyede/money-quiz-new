/**
 * One question a day — the streak's habit hook, ported from the web's
 * DailyQuestionCard. Personalized from the user's own transactions when
 * there's data; a general financial-literacy question when there isn't, so
 * the daily habit starts before any account is connected. Answering earns XP
 * (a little more when correct); the same question stays up all day and a new
 * one arrives at midnight. Once answered it shows the same receipts the quiz
 * does — the transactions the figure came from.
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@moneyquiz/core'
import { answerDaily, dailyQuestionXp, getDailyState } from '@moneyquiz/core/lib/dailyQuestion'

import { AnswerOption } from '@/components/AnswerOption'
import { QuizEvidence } from '@/components/QuizEvidence'
import { Card, CardTitle } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function DailyQuestion() {
  const { colors } = useAppTheme()
  const { transactions, budgets, aliases, dismissedRecurring, recurringKinds, awardXp, game } =
    useStore()
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
    <Card tone="warm">
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: colors.accentDeep }}>
            🔥 {game.streak}-day streak
          </Text>
        }
      >
        📅 Question of the day
      </CardTitle>
      {daily.source === 'general' && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
          A general one — connect your data to make it personal.
        </Text>
      )}

      <Text style={{ fontFamily: fonts.rounded, fontSize: 15, lineHeight: 21, color: colors.ink }}>
        {q.prompt}
      </Text>

      <View style={{ gap: spacing.sm }}>
        {q.options.map((opt, i) => (
          <AnswerOption
            key={i}
            label={opt}
            answered={answered}
            isCorrect={i === q.correctIndex}
            isChosen={i === daily.answer}
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
            +{dailyQuestionXp(correct)} XP · come back tomorrow for a new one
          </Text>
        </View>
      )}
    </Card>
  )
}
