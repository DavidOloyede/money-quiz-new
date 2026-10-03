/**
 * Confetti in the brand's five colours (honey, forest, cream, sky, coral),
 * the phone's twin of the web's Confetti. "fall" rains from the top of the
 * screen; "pop" bursts out from a point and tumbles down. Pieces are placed
 * by a fixed pseudo-random sequence so a render is pure. Nothing at all under
 * "reduce motion".
 */
import { useEffect } from 'react'
import { useWindowDimensions, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { coral, cream, forest, honey, sky } from '@moneyquiz/core/theme'

const COLORS = [honey['400'], forest['500'], cream, sky['400'], coral['400'], honey['300'], forest['300']]

/** A repeatable 0–1 "random" number for piece i (classic shader hash). */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function Piece({ i, mode, delay, fall }: { i: number; mode: 'fall' | 'pop'; delay: number; fall: number }) {
  const t = useSharedValue(0)
  const w = 6 + Math.round(rand(i, 1) * 6)
  const h = rand(i, 2) > 0.5 ? w * 1.6 : w
  const round = i % 3 === 1
  const spin = (rand(i, 5) - 0.5) * 1080
  const dur = mode === 'fall' ? 2200 + rand(i, 6) * 1600 : 1300 + rand(i, 7) * 900
  const start = delay + (mode === 'fall' ? rand(i, 7) * 900 : rand(i, 8) * 160)
  // fall: spread across the width; pop: a direction and distance from the origin.
  const x0 = rand(i, 3)
  const bx = Math.cos(rand(i, 3) * Math.PI * 2) * (80 + rand(i, 4) * 140)
  const by = -60 - rand(i, 5) * 160
  const drift = (rand(i, 4) - 0.5) * 160

  useEffect(() => {
    t.value = withDelay(start, withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }))
  }, [t, start, dur])

  const style = useAnimatedStyle(() => {
    const p = t.value
    const fade = p < 0.85 ? 1 : Math.max(0, (1 - p) / 0.15)
    if (mode === 'fall') {
      return {
        opacity: p === 0 ? 0 : fade,
        transform: [{ translateY: -40 + p * (fall + 80) }, { translateX: drift * p }, { rotate: `${spin * p}deg` }],
      }
    }
    // Out to (bx, by) in the first 45%, then tumble down.
    const out = Math.min(1, p / 0.45)
    const down = Math.max(0, (p - 0.45) / 0.55)
    return {
      opacity: p === 0 ? 0 : fade,
      transform: [
        { translateX: bx * (out + down * 0.2) },
        { translateY: by * out + down * 180 },
        { rotate: `${spin * p}deg` },
        { scale: 0.3 + 0.7 * out },
      ],
    }
  })

  const base: ViewStyle = {
    position: 'absolute',
    width: w,
    height: h,
    borderRadius: round ? w : 2,
    backgroundColor: COLORS[i % COLORS.length],
    borderWidth: COLORS[i % COLORS.length] === cream ? 1 : 0,
    borderColor: honey['400'],
  }
  return <Animated.View style={[base, mode === 'fall' ? { left: `${x0 * 100}%`, top: 0 } : null, style]} />
}

export function Confetti({
  count = 40,
  mode = 'fall',
  delay = 0,
  style,
}: {
  count?: number
  mode?: 'fall' | 'pop'
  delay?: number
  /** Where the pieces start: the whole box for "fall", its top-left corner for "pop". */
  style?: ViewStyle
}) {
  const reduce = useReducedMotion()
  const { height } = useWindowDimensions()
  if (reduce) return null
  return (
    <View pointerEvents="none" style={style}>
      {Array.from({ length: count }, (_, i) => (
        <Piece key={i} i={i} mode={mode} delay={delay} fall={height} />
      ))}
    </View>
  )
}
