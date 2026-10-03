/**
 * Level / XP / streak readout — the mobile ProgressWidget. Checking in daily
 * keeps the 🔥 streak alive; XP from check-ins, the daily question, quizzes,
 * and imports levels you up through the stewardship titles. Like the web's
 * widget it answers every gain: the bar fills with the reward overshoot and
 * "+N XP" floats up; a level-up pops the level circle.
 */
import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { FloatUp } from '@/components/celebrate/FloatUp'
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
  const gain = useRise(game.xp)
  const levelUp = useRise(lp.level)

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Animated.View
          key={levelUp.key}
          entering={levelUp.key ? ZoomIn.springify().damping(7) : undefined}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.markRight,
          }}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 17, color: 'white' }}>{lp.level}</Text>
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.roundedHeavy, fontSize: 16, color: colors.ink }}
          >
            {lp.title}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
            {lp.into} / {lp.span} XP to level {lp.level + 1}
          </Text>
        </View>
      </View>

      <View>
        <Bar pct={lp.pct} reward />
        {gain.key > 0 && (
          <FloatUp key={gain.key} style={{ position: 'absolute', right: 0, top: -14 }}>
            <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 12, color: colors.accentDeep }}>+{gain.by} XP</Text>
          </FloatUp>
        )}
      </View>

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

/** Bumps a counter each time `value` rises (never on first render), plus by how much. */
function useRise(value: number): { key: number; by: number } {
  const prev = useRef(value)
  const [rise, setRise] = useState({ key: 0, by: 0 })
  useEffect(() => {
    const by = value - prev.current
    prev.current = value
    if (by > 0) setRise((r) => ({ key: r.key + 1, by }))
  }, [value])
  return rise
}
