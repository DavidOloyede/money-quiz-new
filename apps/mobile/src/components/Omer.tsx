/**
 * Omer on the phone, the twin of the web's Omer (docs/DESIGN.md "Omer, the
 * mascot"): core's drawing (lib/omer.ts) rendered by react-native-svg's
 * SvgXml, so both apps draw the very same Omer. When the commissioned art
 * arrives it swaps in here, behind the same props. Below 64pt an outfit gives
 * way to plain Omer in his `pose`.
 *
 * He pops in, then moves to suit the pose: a slow breath at rest, three hops
 * for a cheer or a jump, a wobble for "oops". Reduce motion keeps him still.
 */
import { useEffect, useMemo } from 'react'
import type { ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SvgXml } from 'react-native-svg'
import { omerSvg, type OmerOutfit, type OmerPose } from '@moneyquiz/core/lib/omer'

export type OmerMotion = 'breathe' | 'hop' | 'wobble' | 'none'

function motionFor(pose: OmerPose): OmerMotion {
  if (pose === 'cheer' || pose === 'jump') return 'hop'
  if (pose === 'oops') return 'wobble'
  return 'breathe'
}

export function Omer({
  pose = 'idle',
  outfit,
  size = 120,
  motion,
  label,
  style,
}: {
  pose?: OmerPose
  outfit?: OmerOutfit
  size?: number
  /** Defaults to what suits the pose; 'none' still pops in. */
  motion?: OmerMotion
  /** Read aloud by VoiceOver when he carries meaning; leave unset when he's decoration. */
  label?: string
  style?: ViewStyle
}) {
  const reduce = useReducedMotion()
  const xml = useMemo(() => omerSvg({ pose, outfit, size }), [pose, outfit, size])
  const kind = motion ?? motionFor(pose)
  const enter = useSharedValue(reduce ? 1 : 0)
  const loop = useSharedValue(0)

  useEffect(() => {
    if (reduce) return
    // The reward overshoot (DESIGN.md), so he lands with a little bounce.
    enter.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.34, 1.56, 0.64, 1) })
    const ease = Easing.inOut(Easing.sin)
    if (kind === 'breathe') {
      loop.value = withDelay(500, withRepeat(withTiming(1, { duration: 1600, easing: ease }), -1, true))
    } else if (kind === 'hop') {
      loop.value = withDelay(
        450,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }),
          ),
          3,
        ),
      )
    } else if (kind === 'wobble') {
      loop.value = withDelay(
        400,
        withSequence(
          withTiming(-1, { duration: 175, easing: ease }),
          withTiming(0.8, { duration: 210, easing: ease }),
          withTiming(-0.4, { duration: 175, easing: ease }),
          withTiming(0, { duration: 140, easing: ease }),
        ),
      )
    }
  }, [reduce, kind, enter, loop])

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.7),
    transform: [
      { translateY: (1 - enter.value) * size * 0.1 - (kind === 'hop' ? loop.value * size * 0.09 : 0) },
      { scale: 0.6 + 0.4 * enter.value },
      { scaleX: kind === 'breathe' ? 1 + loop.value * 0.015 : 1 },
      { scaleY: kind === 'breathe' ? 1 - loop.value * 0.025 : 1 },
      { rotate: `${kind === 'wobble' ? loop.value * 5 : 0}deg` },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
      style={[{ width: size, height: size, transformOrigin: 'bottom' }, style, animated]}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  )
}
