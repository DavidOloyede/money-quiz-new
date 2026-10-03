/**
 * A slow, gentle sway for the illustrated people (the web's .person-bob), so
 * a row of them feels alive. Each gets its own pace and phase; nothing moves
 * under "reduce motion".
 */
import { useEffect, type ReactNode } from 'react'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

export function Sway({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const reduce = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    const pace = 1600 + (index % 3) * 200
    t.value = withDelay((index * 450) % 1800, withRepeat(withTiming(1, { duration: pace, easing: Easing.inOut(Easing.sin) }), -1, true))
  }, [reduce, index, t])
  const tilt = index % 2 ? -1.5 : 1.5
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * t.value }, { rotate: `${tilt * t.value}deg` }],
  }))
  return <Animated.View style={style}>{children}</Animated.View>
}
