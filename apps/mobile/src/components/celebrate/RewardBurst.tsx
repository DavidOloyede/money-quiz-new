/**
 * The right-answer payoff on the phone (docs/DESIGN.md): manna flakes burst
 * out of the answer and "+10 XP" floats up and away. Absolutely positioned
 * inside the answer; plays once on mount; nothing under "reduce motion".
 */
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { honey } from '@moneyquiz/core/theme'

import { fonts, useAppTheme } from '@/theme'

const FLAKES = [
  { x: -46, y: -30, s: 11, d: 0 },
  { x: -18, y: -46, s: 9, d: 40 },
  { x: 14, y: -50, s: 12, d: 20 },
  { x: 40, y: -32, s: 10, d: 60 },
  { x: -32, y: -8, s: 8, d: 90 },
  { x: 30, y: -8, s: 9, d: 110 },
]

function Flake({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(d, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [t, d])
  const style = useAnimatedStyle(() => {
    const p = t.value
    const out = Math.min(1, p / 0.55)
    const fall = Math.max(0, (p - 0.55) / 0.45)
    return {
      opacity: p === 0 ? 0 : p < 0.15 ? p / 0.15 : 1 - fall,
      transform: [{ translateX: x * (out + fall * 0.15) }, { translateY: y * out + fall * 34 }, { scale: 0.2 + 0.8 * out }],
    }
  })
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: -s / 2,
          top: -s / 2,
          width: s,
          height: s,
          borderRadius: s,
          backgroundColor: honey['400'],
          borderWidth: 2,
          borderColor: `${honey['500']}66`,
        },
        style,
      ]}
    />
  )
}

export function RewardBurst({ xp }: { xp?: number }) {
  const { colors } = useAppTheme()
  const reduce = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
  }, [t])
  const chip = useAnimatedStyle(() => {
    const p = t.value
    return {
      opacity: p < 0.25 ? p / 0.25 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1,
      transform: [{ translateY: 6 - p * 46 }, { scale: p < 0.25 ? 0.6 + (p / 0.25) * 0.48 : 1.08 - (p - 0.25) * 0.1 }],
    }
  })
  if (reduce) return null
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: 28, top: '50%', width: 0, height: 0 }}>
      {FLAKES.map((f, i) => (
        <Flake key={i} {...f} />
      ))}
      {xp ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -28,
              right: 10,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 2,
              backgroundColor: colors.reward,
              borderBottomWidth: 2,
              borderBottomColor: colors.rewardEdge,
            },
            chip,
          ]}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 14, color: colors.onReward }}>+{xp} XP</Text>
        </Animated.View>
      ) : null}
    </View>
  )
}
