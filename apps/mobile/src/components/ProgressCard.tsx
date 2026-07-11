/**
 * Level / XP / streak readout — the mobile ProgressWidget. Checking in daily
 * keeps the 🔥 streak alive; XP from check-ins, the daily question, quizzes,
 * and imports levels you up through the stewardship titles.
 */
import { Text, View } from 'react-native'
import { useStore } from '@moneyquiz/core'
import { BADGES } from '@moneyquiz/core/lib/badges'
import { levelProgress } from '@moneyquiz/core/lib/gamification'

import { Bar, Card } from '@/components/ui'
import { fonts, spacing, useAppTheme } from '@/theme'

export function ProgressCard() {
  const { colors } = useAppTheme()
  const { game } = useStore()
  const lp = levelProgress(game.xp)
  const earned = Object.keys(game.badges).length

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: colors.card }}>
            {lp.level}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}
          >
            {lp.title}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
            {lp.into} / {lp.span} XP to level {lp.level + 1}
          </Text>
        </View>
      </View>

      <Bar pct={lp.pct} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
          🔥 <Text style={{ fontFamily: fonts.sansSemiBold, color: colors.ink }}>{game.streak}</Text>
          -day streak
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
          best {game.bestStreak}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
        🏅 {earned} / {BADGES.length} badges
      </Text>
    </Card>
  )
}
