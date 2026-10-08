/**
 * The streak moment on the phone, the twin of the web's StreakOverlay:
 * answering the daily question, right or wrong. Quicker than a level-up:
 *
 * - a flame ignites and flickers while embers rise, and the day count flips
 *   from yesterday's number to today's;
 * - the day's streak XP pops in;
 * - the way to the next goal fills: one pip per day on the way to a week (and
 *   from one week to two), a bar for the longer stretches after that.
 *
 * It never vanishes unannounced: "Keep going" or a tap anywhere closes it,
 * and on an ordinary day a bar under the button drains over ten seconds and
 * the moment closes when it empties. The day a goal is reached (a week, two
 * weeks, a month…) adds a shout, a sunburst, confetti and Omer as the
 * Coach beside the flame, and simply waits.
 * Reduce motion shows the finished picture and drops the countdown, so it
 * waits too. An overlay view, not a native Modal (iOS won't present two at
 * once).
 */
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
import Svg, { Defs, Ellipse, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useStore } from '@moneyquiz/core'
import type { StreakDay } from '@moneyquiz/core/lib/milestones'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { FLAME_PATHS, FLAME_VIEWBOX, streakProgress } from '@moneyquiz/core/lib/streak'
import { coral, cream, honey, linen } from '@moneyquiz/core/theme'

import { Omer } from '@/components/Omer'
import { Button } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'
import { Confetti } from './Confetti'

/** The countdown under "Keep going" on an ordinary day: it starts as the button arrives. */
const COUNTDOWN_DELAY_MS = 1900
const COUNTDOWN_MS = 10000

/* The comic starburst behind the goal-day shout. */
const STAR = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2
  const out = i % 2 === 0
  return `${(110 + Math.cos(a) * (out ? 106 : 86)).toFixed(1)},${(44 + Math.sin(a) * (out ? 42 : 30)).toFixed(1)}`
}).join(' ')

/* Sixteen rays for the goal-day sunburst. */
const RAYS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  const w = Math.PI / 30
  const p = (r: number, t: number) => `${(200 + Math.cos(t) * r).toFixed(1)},${(200 + Math.sin(t) * r).toFixed(1)}`
  return `M200 200 L${p(200, a - w)} L${p(200, a + w)} Z`
})

/* Embers rising off the flame, each on its own beat and drift. */
const EMBERS = [
  { x: 38, dx: -18, d: 500, s: 7 },
  { x: 58, dx: 14, d: 750, s: 5 },
  { x: 47, dx: -6, d: 1000, s: 6 },
  { x: 64, dx: 20, d: 1300, s: 4 },
  { x: 33, dx: -12, d: 1550, s: 5 },
  { x: 52, dx: 8, d: 1800, s: 6 },
]

const FLAME_W = 112
const FLAME_H = 140

const ignite = new Keyframe({
  0: { opacity: 0, transform: [{ scaleX: 0.2 }, { scaleY: 0.01 }] },
  60: { opacity: 1, transform: [{ scaleX: 1.08 }, { scaleY: 1.12 }] },
  100: { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }] },
})
  .delay(150)
  .duration(650)

const numberIn = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 400 }, { rotateX: '-90deg' }] },
  100: { opacity: 1, transform: [{ perspective: 400 }, { rotateX: '0deg' }] },
})
  .delay(850)
  .duration(420)

export function StreakOverlay({ milestone, onClose }: { milestone: StreakDay; onClose: () => void }) {
  const { colors, theme } = useAppTheme()
  const { game } = useStore()
  const reduce = useReducedMotion()
  const dark = theme === 'dark'
  const p = streakProgress(milestone.to)
  const goalDay = p.reached
  const coach = omerFor({ kind: 'streak', day: milestone.to })

  const countdown = !goalDay && !reduce
  useEffect(() => {
    if (!countdown) return
    const t = setTimeout(onClose, COUNTDOWN_DELAY_MS + COUNTDOWN_MS)
    return () => clearTimeout(t)
  }, [countdown, onClose])

  const caption = goalDay
    ? `${milestone.to} days of showing up. Next stop: ${streakProgress(milestone.to + 1).goal.name}.`
    : milestone.to === 1
      ? game.bestStreak > 1
        ? `A fresh start. Your best run is ${game.bestStreak} days.`
        : 'Day one. Come back tomorrow for day two.'
      : `${p.toGo} more ${p.toGo === 1 ? 'day' : 'days'} to ${p.goal.prose}.`

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(260)} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="ember-dawn" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? linen['950'] : cream} stopOpacity={0.97} />
              <Stop offset="0.55" stopColor={dark ? honey['950'] : honey['100']} stopOpacity={0.97} />
              <Stop offset="1" stopColor={dark ? coral['950'] : coral['100']} stopOpacity={0.97} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#ember-dawn)" />
        </Svg>
      </Animated.View>
      {goalDay && <Confetti count={40} delay={500} style={StyleSheet.absoluteFill} />}

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`${milestone.to}-day streak. ${caption} Tap to continue.`}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}
      >
        {/* The stage: glow, embers and the flame (plus the shout on a goal day) */}
        <View style={{ width: 260, height: goalDay ? 224 : 160, alignItems: 'center', justifyContent: 'flex-end' }}>
          {goalDay && <Sunburst reduce={reduce} dark={dark} />}
          {/* The tilt sits inside the entrance, which would otherwise overwrite it. */}
          {goalDay && (
            <Animated.View
              entering={ZoomIn.delay(250).springify().damping(10)}
              style={{ position: 'absolute', top: 0, zIndex: 2, width: 220, height: 88 }}
            >
              <View style={{ flex: 1, transform: [{ rotate: '-6deg' }] }}>
                <Svg width={220} height={88} viewBox="0 0 220 88" style={StyleSheet.absoluteFill}>
                  <Polygon points={STAR} fill={honey['200']} stroke={linen['900']} strokeWidth={2.5} strokeLinejoin="round" />
                </Svg>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.roundedHeavy,
                      fontSize: p.goal.shout.length > 10 ? 20 : 23,
                      letterSpacing: 0.3,
                      color: coral['700'],
                      textShadowColor: cream,
                      textShadowRadius: 3,
                    }}
                  >
                    {p.goal.shout}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
          <View style={{ width: FLAME_W, height: FLAME_H }}>
            <Glow reduce={reduce} dark={dark} />
            {!reduce && EMBERS.map((e, i) => <Ember key={i} {...e} color={i % 2 ? coral['400'] : honey['400']} />)}
            <Animated.View entering={ignite} style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }]}>
              <Flicker reduce={reduce}>
                <Svg width={FLAME_W} height={FLAME_H} viewBox={FLAME_VIEWBOX}>
                  <Defs>
                    <LinearGradient id="flame-outer" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={honey['500']} />
                      <Stop offset="0.55" stopColor={coral['500']} />
                      <Stop offset="1" stopColor={coral['600']} />
                    </LinearGradient>
                  </Defs>
                  <Path d={FLAME_PATHS.outer} fill="url(#flame-outer)" stroke={coral['800']} strokeOpacity={0.6} strokeWidth={1.5} strokeLinejoin="round" />
                  <Path d={FLAME_PATHS.middle} fill={honey['400']} />
                  <Path d={FLAME_PATHS.core} fill={honey['100']} />
                </Svg>
              </Flicker>
            </Animated.View>
          </View>
          {/* Goal days only: an ordinary day stays the quick, flame-only moment. */}
          {coach && <Omer {...coach} size={96} style={{ position: 'absolute', bottom: 0, left: 260 / 2 + FLAME_W / 2 - 12 }} />}
        </View>

        {/* The count: yesterday's number flips to today's */}
        <View style={{ marginTop: spacing.sm, height: 68, alignItems: 'center', justifyContent: 'center' }}>
          {milestone.from > 0 && <OldCount value={milestone.from} reduce={reduce} />}
          <Animated.Text
            entering={numberIn}
            style={{ fontFamily: fonts.roundedHeavy, fontSize: 68, lineHeight: 72, color: dark ? coral['400'] : coral['600'], fontVariant: ['tabular-nums'] }}
          >
            {milestone.to}
          </Animated.Text>
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.roundedHeavy, fontSize: 13, letterSpacing: 2.6, color: colors.accentDeep }}>
          DAY STREAK
        </Text>
        <Animated.View
          entering={ZoomIn.delay(1050).springify().damping(9)}
          style={{
            marginTop: spacing.sm + 4,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.reward,
            borderBottomWidth: 2,
            borderBottomColor: colors.rewardEdge,
          }}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 14, color: colors.onReward }}>+{milestone.xp} XP</Text>
        </Animated.View>

        <GoalTrack to={milestone.to} />

        <Animated.Text
          entering={FadeInDown.delay(1500).duration(420)}
          style={{ marginTop: spacing.sm + 4, maxWidth: 300, textAlign: 'center', fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink }}
        >
          {caption}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(1900).duration(420)} style={{ marginTop: spacing.lg, alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
          <Button title="Keep going" variant="reward" onPress={onClose} />
          {countdown && <Countdown />}
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(1800)}
          style={{ marginTop: spacing.sm + 2, fontFamily: fonts.sans, fontSize: 12, color: dark ? linen['400'] : linen['500'] }}
        >
          Tap anywhere to continue
        </Animated.Text>
      </Pressable>
    </View>
  )
}

/** The bar under "Keep going" that drains over ten seconds; the moment closes as it empties. */
function Countdown() {
  const { theme } = useAppTheme()
  const left = useSharedValue(1)
  useEffect(() => {
    left.value = withDelay(COUNTDOWN_DELAY_MS, withTiming(0, { duration: COUNTDOWN_MS, easing: Easing.linear }))
  }, [left])
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }))
  return (
    <View
      accessible={false}
      style={{
        marginTop: spacing.sm + 2,
        height: 6,
        borderRadius: radii.pill,
        overflow: 'hidden',
        backgroundColor: theme === 'dark' ? linen['700'] : `${linen['300']}99`,
      }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: radii.pill, backgroundColor: honey['400'], transformOrigin: 'left' }, style]} />
    </View>
  )
}

/** A gentle, uneven flicker on the lit flame. */
function Flicker({ reduce, children }: { reduce: boolean; children: React.ReactNode }) {
  const t = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    t.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: Easing.inOut(Easing.sin) }),
          withTiming(-0.6, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 260, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 260, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    )
  }, [reduce, t])
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + t.value * 0.04 }, { scaleX: 1 - t.value * 0.025 }, { skewX: `${t.value * -2}deg` }],
  }))
  return <Animated.View style={[{ transformOrigin: 'bottom' }, style]}>{children}</Animated.View>
}

/** The warm glow behind the flame, breathing slowly (a radial fade: the phone has no blur). */
function Glow({ reduce, dark }: { reduce: boolean; dark: boolean }) {
  const t = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (reduce) return
    t.value = withDelay(
      200,
      withSequence(
        withTiming(1, { duration: 500 }),
        withRepeat(withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true),
      ),
    )
  }, [reduce, t])
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.9 + t.value * 0.15 }] }))
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -70, right: -70, top: 0, bottom: -40 }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="flame-glow" cx="50%" cy="58%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={dark ? coral['400'] : honey['300']} stopOpacity={dark ? 0.45 : 0.8} />
            <Stop offset="1" stopColor={dark ? coral['400'] : honey['300']} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="58%" rx="50%" ry="50%" fill="url(#flame-glow)" />
      </Svg>
    </Animated.View>
  )
}

function Ember({ x, dx, d, s, color }: { x: number; dx: number; d: number; s: number; color: string }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(d, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), 2, false))
  }, [t, d])
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateX: dx * t.value }, { translateY: -90 * t.value }, { scale: 0.6 - 0.4 * t.value }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: `${x}%`, bottom: '42%', width: s, height: s, borderRadius: s, backgroundColor: color }, style]}
    />
  )
}

function Sunburst({ reduce, dark }: { reduce: boolean; dark: boolean }) {
  const spin = useSharedValue(0)
  const shown = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (reduce) return
    shown.value = withDelay(100, withTiming(1, { duration: 600 }))
    spin.value = withRepeat(withTiming(360, { duration: 30000, easing: Easing.linear }), -1)
  }, [reduce, spin, shown])
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ rotate: `${spin.value}deg` }] }))
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: FLAME_H / 2 - 200, width: 400, height: 400 }, style]}>
      <Svg width={400} height={400} viewBox="0 0 400 400">
        {RAYS.map((d, i) => (
          <Path key={i} d={d} fill={honey['300']} opacity={dark ? 0.2 : 0.32} />
        ))}
      </Svg>
    </Animated.View>
  )
}

/** Yesterday's number, flipping away before today's arrives. */
function OldCount({ value, reduce }: { value: number; reduce: boolean }) {
  const { theme } = useAppTheme()
  const t = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) t.value = withDelay(650, withTiming(1, { duration: 260, easing: Easing.in(Easing.quad) }))
  }, [reduce, t])
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ perspective: 400 }, { rotateX: `${t.value * 90}deg` }],
  }))
  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          fontFamily: fonts.roundedHeavy,
          fontSize: 68,
          lineHeight: 72,
          color: theme === 'dark' ? linen['500'] : linen['400'],
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {value}
    </Animated.Text>
  )
}

/**
 * The way to the next goal. A stretch of a week or less gets one pip per day,
 * today's popping in; a longer one gets a bar that fills from yesterday to today.
 */
function GoalTrack({ to }: { to: number }) {
  const { colors, theme } = useAppTheme()
  const dark = theme === 'dark'
  const p = streakProgress(to)
  const span = p.goal.days - p.from
  const labels = (
    <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 11, letterSpacing: 0.8, color: colors.muted }}>
        {(p.passed ? `${p.passed.name} ✓` : 'Day 1').toUpperCase()}
      </Text>
      <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 11, letterSpacing: 0.8, color: p.reached ? colors.danger : colors.muted }}>
        {p.goal.name.toUpperCase()}
      </Text>
    </View>
  )

  if (span <= 7) {
    return (
      <Animated.View entering={FadeInDown.delay(700).duration(420)} style={{ marginTop: spacing.lg, width: 288 }} accessible={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: span }, (_, i) => {
            const day = p.from + i + 1
            const done = day <= to
            const goal = day === p.goal.days
            const pip = (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderStyle: done || goal ? 'solid' : 'dashed',
                  borderColor: done ? coral['500'] : goal ? honey['400'] : dark ? linen['600'] : linen['300'],
                  borderBottomWidth: done ? 4 : 2,
                  borderBottomColor: done ? coral['700'] : undefined,
                  backgroundColor: done ? coral['400'] : goal ? (dark ? `${honey['500']}1a` : honey['50']) : 'transparent',
                }}
              >
                {done ? (
                  <Svg width={18} height={22} viewBox={FLAME_VIEWBOX}>
                    <Path d={FLAME_PATHS.outer} fill={cream} />
                  </Svg>
                ) : (
                  <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 12, color: goal ? colors.accentDeep : colors.faint }}>
                    {goal ? '★' : day}
                  </Text>
                )}
              </View>
            )
            return day === to ? (
              <Animated.View key={day} entering={ZoomIn.delay(1150).springify().damping(8)}>
                {pip}
              </Animated.View>
            ) : (
              <View key={day}>{pip}</View>
            )
          })}
        </View>
        {labels}
      </Animated.View>
    )
  }

  const before = streakProgress(to - 1)
  const fromPct = before.goal.days === p.goal.days ? before.fraction * 100 : 0
  return (
    <Animated.View entering={FadeInDown.delay(700).duration(420)} style={{ marginTop: spacing.lg, width: 288 }} accessible={false}>
      <View style={{ height: 16, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: dark ? linen['700'] : linen['200'] }}>
        <BarFill from={fromPct} to={p.fraction * 100} />
      </View>
      {labels}
    </Animated.View>
  )
}

function BarFill({ from, to }: { from: number; to: number }) {
  const reduce = useReducedMotion()
  const w = useSharedValue(reduce ? to : from)
  useEffect(() => {
    if (!reduce) w.value = withDelay(1100, withTiming(to, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [reduce, w, to])
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }))
  return (
    <Animated.View style={[{ height: '100%', borderRadius: radii.pill, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="streak-bar" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={honey['400']} />
            <Stop offset="1" stopColor={coral['500']} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#streak-bar)" />
      </Svg>
    </Animated.View>
  )
}
