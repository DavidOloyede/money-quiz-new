/**
 * The debt-paid-off party on the phone, the twin of the web's PaidOffOverlay
 * (docs/DESIGN.md: "Debt paid off: the biggest party, Omer in a cape and a
 * comic PAID OFF! burst"; the design guide's 5.2). The Hero swoops in and
 * flies through a dawn sky while clouds drift, wind streams and manna tumbles
 * past, "PAID OFF!" lands in a comic burst and confetti pops out of it. It
 * plays when a loan is confirmed paid off; the first one brings the Debt
 * Slayer badge here instead of in a second moment after.
 *
 * Like MilestoneOverlay it's a full-screen overlay view, not a Modal (iOS
 * won't present two), and a tap anywhere closes it. Reduce motion shows the
 * sky still, the Hero on his pose, and no particles.
 */
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg'
import type { PaidOff } from '@moneyquiz/core/lib/milestones'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { cream, forest, honey, linen, sky } from '@moneyquiz/core/theme'

import { Omer } from '@/components/Omer'
import { Button } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'
import { Confetti } from './Confetti'

/* A wide comic burst: 18 points around an ellipse. */
const BURST = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2
  const out = i % 2 === 0
  return `${(130 + Math.cos(a) * (out ? 124 : 96)).toFixed(1)},${(56 + Math.sin(a) * (out ? 54 : 38)).toFixed(1)}`
}).join(' ')

/* Clouds at three speeds, right to left: [top %, scale, seconds per crossing, how far across at the start (0–1)]. */
const CLOUDS = [
  [16, 1.25, 26, 0.18],
  [62, 0.8, 34, 0.45],
  [34, 1, 30, 0.75],
  [7, 0.65, 40, 0.93],
  [76, 1.1, 24, 0.3],
] as const
/* Wind streaks and manna, kept to the sky the Hero flies through (not behind the words): [top %, seconds per crossing, start (0–1), width or size]. */
const WIND = [
  [10, 2.3, 0.3, 77],
  [17, 2.2, 0.23, 93],
  [24, 1.8, 0.83, 129],
  [31, 2, 0.35, 102],
  [38, 2, 0.3, 127],
  [44, 2.2, 0.05, 92],
  [21, 2, 0.7, 116],
] as const
const FLAKES = [
  [14, 6.5, 0.03, 7],
  [22, 6.6, 0.05, 8],
  [30, 7.6, 0.9, 9],
  [36, 8.2, 0.59, 11],
  [42, 8.5, 0.72, 12],
  [9, 6.9, 0.86, 9],
] as const

const CLOUD = 'M20 50C8 50 4 38 14 33C11 20 28 13 37 22C41 8 64 5 72 20C84 12 102 20 98 34C110 35 112 50 98 50Z'
const CLOUD_SHADE = 'M14 44C30 48 80 49 104 44C104 48 102 50 98 50H20C16 50 14 48 14 44Z'

const titleIn = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 600 }, { rotateY: '95deg' }] },
  60: { opacity: 1, transform: [{ perspective: 600 }, { rotateY: '-8deg' }] },
  100: { opacity: 1, transform: [{ perspective: 600 }, { rotateY: '0deg' }] },
})
  .delay(1250)
  .duration(700)

export function PaidOffOverlay({ milestone, onClose }: { milestone: PaidOff; onClose: () => void }) {
  const { theme, colors } = useAppTheme()
  const reduce = useReducedMotion()
  const dark = theme === 'dark'
  const many = milestone.count > 1
  const { badge } = milestone

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(260)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Sky dark={dark} reduce={reduce} />
      </Animated.View>
      <Confetti count={44} delay={500} style={StyleSheet.absoluteFill} />

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close the celebration"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}
      >
        {/* The stage: the Hero in flight, the burst landing below him. */}
        <View style={{ width: 300, height: 250 }}>
          <FlyingHero reduce={reduce} />
          {/* The tilt sits inside the entrance, which would otherwise overwrite it. */}
          <Animated.View entering={ZoomIn.delay(350).springify().damping(10)} style={{ position: 'absolute', right: 0, bottom: 0, width: 240, height: 104 }}>
            <View style={{ flex: 1, transform: [{ rotate: '-6deg' }] }}>
              <Svg width={240} height={104} viewBox="0 0 260 112" style={StyleSheet.absoluteFill}>
                <Polygon points={BURST} fill={honey['200']} stroke={linen['900']} strokeWidth={3} strokeLinejoin="round" />
              </Svg>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 30, letterSpacing: 0.5, color: forest['700'], textShadowColor: cream, textShadowRadius: 4 }}>
                  PAID OFF!
                </Text>
              </View>
            </View>
          </Animated.View>
          <Confetti mode="pop" count={36} delay={600} style={{ position: 'absolute', right: 120, bottom: 52 }} />
        </View>

        <Animated.View
          entering={titleIn}
          style={{
            marginTop: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm + 2,
            borderRadius: radii.lg,
            borderWidth: 2,
            borderBottomWidth: 5,
            borderColor: honey['400'],
            borderBottomColor: honey['500'],
            backgroundColor: colors.card,
          }}
        >
          <Text accessibilityRole="header" style={{ fontFamily: fonts.roundedHeavy, fontSize: 24, color: colors.ink, textAlign: 'center' }}>
            {many ? `${milestone.count} loans paid in full` : 'Paid in full'}
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(1600).duration(420)}
          style={{ marginTop: spacing.sm + 4, maxWidth: 300, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.text }}
        >
          {many ? 'Those loans are' : 'That loan is'} done for good. What used to go to {many ? 'them' : 'it'} is yours to plan with now.
        </Animated.Text>
        {badge && (
          <Animated.View entering={FadeInDown.delay(1750).duration(420)} style={{ marginTop: spacing.sm + 4, alignItems: 'center', gap: spacing.xs, maxWidth: 300 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 14 }}>{badge.emoji}</Text>
              <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 14, color: colors.accentDeep }}>{badge.label} badge</Text>
            </View>
            {badge.verse && (
              <Text style={{ textAlign: 'center', fontFamily: fonts.displayItalic, fontSize: 13, color: colors.muted }}>{badge.verse}</Text>
            )}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(1900).duration(420)} style={{ marginTop: spacing.lg, alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
          <Button title="Keep going" variant="reward" onPress={onClose} />
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(2100)}
          style={{ marginTop: spacing.sm, fontFamily: fonts.sans, fontSize: 12, color: dark ? linen['400'] : linen['500'] }}
        >
          Tap anywhere to continue
        </Animated.Text>
      </Pressable>
    </View>
  )
}

/** The Hero arrives with a loop-the-loop, then drifts about the sky for a while and holds. */
function FlyingHero({ reduce }: { reduce: boolean }) {
  const swoop = useSharedValue(reduce ? 1 : 0)
  const drift = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    swoop.value = withDelay(150, withTiming(1, { duration: 1100, easing: Easing.bezier(0.45, 0, 0.3, 1) }))
    drift.value = withDelay(1300, withRepeat(withTiming(1, { duration: 4800, easing: Easing.linear }), 2, false))
  }, [reduce, swoop, drift])
  const style = useAnimatedStyle(() => {
    // The swoop: up and over (-200° by 45%), round to a full turn.
    const s = swoop.value
    const lift = s < 0.45 ? s / 0.45 : 1 - (s - 0.45) / 0.55
    // The drift: a slow figure about his spot, back where it began each time.
    const a = drift.value * Math.PI * 2
    return {
      transform: [
        { translateX: -0.06 * 200 * lift + Math.sin(a) * 8 },
        { translateY: -0.18 * 200 * lift - Math.sin(a * 2) * 6 },
        { rotate: `${-360 * s + Math.sin(a) * 2.5}deg` },
      ],
    }
  })
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 10, width: 200, height: 200 }, style]}>
      <Omer {...omerFor({ kind: 'badges', ids: ['debt-slayer'] })} size={200} />
    </Animated.View>
  )
}

/** The dawn sky: a sun, clouds at three speeds, wind and manna, all moving right to left. */
function Sky({ dark, reduce }: { dark: boolean; reduce: boolean }) {
  const { width, height } = useWindowDimensions()
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dark ? sky['950'] : sky['200']} />
            <Stop offset="1" stopColor={dark ? linen['900'] : honey['100']} />
          </LinearGradient>
          <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor={dark ? honey['400'] : honey['50']} stopOpacity={dark ? 0.22 : 1} />
            <Stop offset="1" stopColor={dark ? honey['400'] : honey['50']} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
        <Rect x={width * 0.69 - 40} y={height * 0.08} width={width * 0.22 + 40} height={width * 0.22 + 40} fill="url(#sun)" />
      </Svg>
      {CLOUDS.map(([top, scale, dur, at], i) => (
        <Crossing key={`c${i}`} top={(height * top) / 100} width={120 * scale} seconds={dur} at={at} from={1.05} to={-0.35} reduce={reduce}>
          <Svg width={120 * scale} height={56 * scale} viewBox="0 0 120 56">
            <Path d={CLOUD} fill={dark ? sky['800'] : cream} />
            <Path d={CLOUD_SHADE} fill={dark ? sky['900'] : sky['100']} />
          </Svg>
        </Crossing>
      ))}
      {!reduce &&
        WIND.map(([top, dur, at, w], i) => (
          <Crossing key={`w${i}`} top={(height * top) / 100} width={w} seconds={dur} at={at} from={1.1} to={-0.3} fade>
            <Svg width={w} height={(w * 14) / 140} viewBox="0 0 140 14">
              <Path d="M2 7H112C124 7 130 2 126 -1" stroke={dark ? sky['300'] : '#ffffff'} strokeWidth={3} strokeLinecap="round" fill="none" />
            </Svg>
          </Crossing>
        ))}
      {!reduce &&
        FLAKES.map(([top, dur, at, size], i) => (
          <Crossing key={`f${i}`} top={(height * top) / 100} width={size} seconds={dur} at={at} from={1.1} to={-0.1} tumble>
            <View
              style={{
                width: size,
                height: size / 1.4,
                borderRadius: size,
                backgroundColor: honey['300'],
                borderWidth: 1.5,
                borderColor: honey['600'],
              }}
            />
          </Crossing>
        ))}
    </View>
  )
}

/**
 * One thing crossing the screen right to left, forever: `from` and `to` are
 * fractions of the screen's width, `at` how far across it starts, so the sky
 * is full from the first frame. Wind fades in and out; manna tumbles.
 */
function Crossing({
  top,
  width,
  seconds,
  at,
  from,
  to,
  fade = false,
  tumble = false,
  reduce = false,
  children,
}: {
  top: number
  width: number
  seconds: number
  at: number
  from: number
  to: number
  fade?: boolean
  tumble?: boolean
  reduce?: boolean
  children: React.ReactNode
}) {
  const { width: screen } = useWindowDimensions()
  const p = useSharedValue(at)
  useEffect(() => {
    if (reduce) return
    const lap = seconds * 1000
    p.value = withSequence(
      withTiming(1, { duration: lap * (1 - at), easing: Easing.linear }),
      withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: lap, easing: Easing.linear })), -1, false),
    )
  }, [reduce, seconds, at, p])
  const style = useAnimatedStyle(() => {
    const t = p.value
    return {
      opacity: fade ? (t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1) * 0.9 : 1,
      transform: [
        { translateX: (from + (to - from) * t) * screen },
        { translateY: tumble ? Math.sin(t * Math.PI) * 14 - t * 6 : 0 },
        { rotate: tumble ? `${t * 340}deg` : '0deg' },
      ],
    }
  })
  return <Animated.View style={[{ position: 'absolute', left: 0, top, width }, style]}>{children}</Animated.View>
}
