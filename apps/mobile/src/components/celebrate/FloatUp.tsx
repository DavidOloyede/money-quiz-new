/**
 * Floats its children up and away once (the web's .xp-tick): for "+N XP"
 * beside a bar. Nothing under "reduce motion".
 */
import { useEffect, type ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'

export function FloatUp({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const reduce = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })
  }, [t])
  const motion = useAnimatedStyle(() => ({
    opacity: t.value < 0.2 ? t.value / 0.2 : 1 - (t.value - 0.2) / 0.8,
    transform: [{ translateY: 4 - t.value * 26 }],
  }))
  if (reduce) return null
  return <Animated.View pointerEvents="none" style={[style, motion]}>{children}</Animated.View>
}
