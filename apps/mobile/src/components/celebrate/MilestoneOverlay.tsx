/**
 * The milestone moment on the phone, the twin of the web's MilestoneOverlay
 * (docs/DESIGN.md: "Omer jumps and glows; the new title or badge flips in
 * with a shine"):
 *
 * - LEVEL UP: a slow sunburst turns behind Omer as he jumps, glowing, with
 *   manna falling into his rim; "LEVEL UP!" lands in a comic burst, the level
 *   number flips from old to new and the new title flips in with a shine.
 *   He's the Builder at Wise Builder and the Hero from the top titles on.
 * - NEW BADGE: the badge medals spin in, with Omer beside them, proud or in
 *   the badge's own outfit.
 *
 * A row of sparkles cheers in a wave and confetti falls. It's a full-screen
 * overlay view rather than a native Modal (iOS won't present two modals at
 * once). A tap anywhere closes it; reduce motion shows the finished picture.
 * (The day's streak has its own, quicker moment: StreakOverlay.)
 */
import { useEffect, useState } from 'react'
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
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg'
import { levelTitle, xpForLevel } from '@moneyquiz/core/lib/gamification'
import type { BadgesEarned, LevelUp } from '@moneyquiz/core/lib/milestones'
import { omerFor } from '@moneyquiz/core/lib/omerMoments'
import { coral, cream, forest, honey, linen, sky } from '@moneyquiz/core/theme'

import { Omer } from '@/components/Omer'
import { Button } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'
import { Confetti } from './Confetti'


/* The comic starburst behind the shout: 16 points around an ellipse. */
const STAR = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2
  const out = i % 2 === 0
  return `${(96 + Math.cos(a) * (out ? 92 : 74)).toFixed(1)},${(44 + Math.sin(a) * (out ? 42 : 30)).toFixed(1)}`
}).join(' ')

/* Sixteen rays for the sunburst. */
const RAYS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  const w = Math.PI / 30
  const p = (r: number, t: number) => `${(200 + Math.cos(t) * r).toFixed(1)},${(200 + Math.sin(t) * r).toFixed(1)}`
  return `M200 200 L${p(200, a - w)} L${p(200, a + w)} Z`
})

/* The cheering row: four-point sparkles in the brand colors, biggest in the middle. */
const SPARKLE = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z'
const SPARKLES = [
  { size: 26, fill: sky['400'] },
  { size: 34, fill: forest['400'] },
  { size: 46, fill: honey['400'] },
  { size: 34, fill: coral['400'] },
  { size: 26, fill: honey['300'] },
]

type BigMilestone = LevelUp | BadgesEarned

const flipIn = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ perspective: 600 }, { rotateY: '95deg' }] },
    60: { opacity: 1, transform: [{ perspective: 600 }, { rotateY: '-8deg' }] },
    100: { opacity: 1, transform: [{ perspective: 600 }, { rotateY: '0deg' }] },
  })
    .delay(delay)
    .duration(700)

const numberIn = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 400 }, { rotateX: '-90deg' }] },
  100: { opacity: 1, transform: [{ perspective: 400 }, { rotateX: '0deg' }] },
})
  .delay(1150)
  .duration(420)

export function MilestoneOverlay({ milestone, onClose }: { milestone: BigMilestone; onClose: () => void }) {
  const { theme } = useAppTheme()
  const { width } = useWindowDimensions()
  // Where the stage landed on screen, so the sunburst (drawn in its own layer
  // behind everything, or iOS can paint it over the title card) centres on Omer.
  const [stageY, setStageY] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const dark = theme === 'dark'
  const level = milestone.kind === 'level'
  const shout = level ? 'LEVEL UP!' : milestone.badges.length > 1 ? 'NEW BADGES!' : 'NEW BADGE!'

  // The slow sunburst and the glow behind Omer.
  const spin = useSharedValue(0)
  const glow = useSharedValue(0.6)
  const shown = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (reduce) return
    shown.value = withDelay(100, withTiming(1, { duration: 600 }))
    spin.value = withRepeat(withTiming(360, { duration: 30000, easing: Easing.linear }), -1)
    glow.value = withDelay(900, withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true))
  }, [reduce, spin, glow, shown])
  const raysStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ rotate: `${spin.value}deg` }] }))
  const glowStyle = useAnimatedStyle(() => ({
    opacity: shown.value * (0.25 + glow.value * 0.2),
    transform: [{ scale: 0.9 + glow.value * 0.15 }],
  }))

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(260)} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? linen['950'] : cream} stopOpacity={0.97} />
              <Stop offset="0.55" stopColor={dark ? honey['950'] : honey['100']} stopOpacity={0.97} />
              <Stop offset="1" stopColor={dark ? sky['950'] : sky['100']} stopOpacity={0.97} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dawn)" />
        </Svg>
      </Animated.View>
      {stageY !== null && (
        <View pointerEvents="none" style={{ position: 'absolute', top: stageY + 170 - 200, left: width / 2 - 200, width: 400, height: 400, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', width: 400, height: 400 }, raysStyle]}>
            <Svg width={400} height={400} viewBox="0 0 400 400">
              {RAYS.map((d, i) => (
                <Path key={i} d={d} fill={honey['300']} opacity={dark ? 0.2 : 0.32} />
              ))}
            </Svg>
          </Animated.View>
          <Animated.View style={[{ width: 170, height: 170, borderRadius: 85, backgroundColor: honey['300'] }, glowStyle]} />
        </View>
      )}
      <Confetti count={44} delay={350} style={StyleSheet.absoluteFill} />

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close the celebration"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}
      >
        {/* The stage */}
        <View
          onLayout={(e) => setStageY(e.nativeEvent.layout.y)}
          style={{ width: 300, height: 248, alignItems: 'center' }}
        >
          <Animated.View
            entering={ZoomIn.delay(250).springify().damping(10)}
            style={{ position: 'absolute', top: 0, zIndex: 2, width: 192, height: 88, transform: [{ rotate: '-6deg' }] }}
          >
            <Svg width={192} height={88} viewBox="0 0 192 88" style={StyleSheet.absoluteFill}>
              <Polygon points={STAR} fill={honey['200']} stroke={linen['900']} strokeWidth={2.5} strokeLinejoin="round" />
            </Svg>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontFamily: fonts.roundedHeavy,
                  fontSize: shout.length > 9 ? 20 : 23,
                  letterSpacing: 0.3,
                  color: forest['700'],
                  textShadowColor: cream,
                  textShadowRadius: 3,
                }}
              >
                {shout}
              </Text>
            </View>
          </Animated.View>

          {level ? <JumpingOmer level={milestone.to} reduce={reduce} /> : <Medals milestone={milestone} />}
        </View>

        {level ? <LevelText milestone={milestone} /> : <BadgeText milestone={milestone} />}

        <SparkleWave reduce={reduce} />

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

/** Omer jumps where the bowl once stood, manna falling into his rim. */
function JumpingOmer({ level, reduce }: { level: number; reduce: boolean }) {
  return (
    <View style={{ position: 'absolute', bottom: 0, width: 150, height: 150 }}>
      <Omer {...omerFor({ kind: 'level-up', level })} size={150} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 0, right: 0 }}>
        {!reduce && [42, 52, 47, 57].map((x, i) => <FallingFlake key={i} x={x} delay={300 + i * 280} />)}
      </View>
    </View>
  )
}

function FallingFlake({ x, delay }: { x: number; delay: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1100, easing: Easing.in(Easing.quad) }), 2, false))
  }, [t, delay])
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : t.value < 0.2 ? t.value / 0.2 : t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [{ translateY: -70 + t.value * 88 }],
  }))
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: `${x}%`,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: honey['400'],
          borderWidth: 2,
          borderColor: `${honey['500']}66`,
        },
        style,
      ]}
    />
  )
}

/* Omer and the medals share one row, so both shrink as the medals multiply
   (the sample data earns three at once) and the row still fits the phone. */
const OMER_BESIDE: Record<number, number> = { 1: 112, 2: 96, 3: 80 }
const MEDAL: Record<number, { size: number; emoji: number }> = {
  1: { size: 96, emoji: 46 },
  2: { size: 84, emoji: 40 },
  3: { size: 68, emoji: 32 },
}

function Medals({ milestone }: { milestone: BadgesEarned }) {
  const medals = milestone.badges.slice(0, 3)
  const m = MEDAL[medals.length]
  return (
    <View style={{ position: 'absolute', bottom: 4, flexDirection: 'row', alignItems: 'flex-end', gap: medals.length > 2 ? spacing.sm : spacing.sm + 4 }}>
      <Omer {...omerFor({ kind: 'badges', ids: milestone.badges.map((b) => b.id) })} size={OMER_BESIDE[medals.length]} />
      {medals.map((b, i) => (
        <Animated.View
          key={b.id}
          entering={new Keyframe({
            0: { opacity: 0, transform: [{ perspective: 600 }, { rotateY: '-540deg' }, { scale: 0.4 }] },
            40: { opacity: 1 },
            100: { opacity: 1, transform: [{ perspective: 600 }, { rotateY: '0deg' }, { scale: 1 }] },
          })
            .delay(300 + i * 180)
            .duration(1100)}
          style={{
            marginBottom: 6,
            width: m.size,
            height: m.size,
            borderRadius: m.size / 2,
            borderWidth: 4,
            borderColor: honey['400'],
            borderBottomWidth: 8,
            borderBottomColor: honey['600'],
            backgroundColor: honey['200'],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: m.emoji }}>{b.emoji}</Text>
        </Animated.View>
      ))}
    </View>
  )
}

function TitleCard({ children, delay }: { children: string; delay: number }) {
  const { colors } = useAppTheme()
  return (
    <Animated.View
      entering={flipIn(delay)}
      style={{
        marginTop: spacing.sm + 4,
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
        {children}
      </Text>
    </Animated.View>
  )
}

function LevelText({ milestone }: { milestone: LevelUp }) {
  const { colors } = useAppTheme()
  const next = milestone.to + 1
  return (
    <>
      <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 13, letterSpacing: 2.5, color: colors.accentDeep }}>LEVEL</Text>
        <Animated.View
          entering={numberIn}
          style={{
            minWidth: 40,
            paddingHorizontal: 10,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: colors.markRight,
            borderBottomWidth: 3,
            borderBottomColor: colors.primaryEdge,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 20, color: 'white', fontVariant: ['tabular-nums'] }}>
            {milestone.to}
          </Text>
        </Animated.View>
      </View>
      <TitleCard delay={1250}>{milestone.title}</TitleCard>
      <Animated.Text
        entering={FadeInDown.delay(1700).duration(420)}
        style={{ marginTop: spacing.sm + 4, maxWidth: 300, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.text }}
      >
        You reached level {milestone.to}. Next up:{' '}
        <Text style={{ fontFamily: fonts.sansSemiBold }}>{levelTitle(next)}</Text> at {xpForLevel(next).toLocaleString()} XP.
      </Animated.Text>
    </>
  )
}

function BadgeText({ milestone }: { milestone: BadgesEarned }) {
  const { colors } = useAppTheme()
  const [first] = milestone.badges
  const one = milestone.badges.length === 1
  return (
    <>
      <TitleCard delay={1100}>{one ? first.label : `${milestone.badges.length} new badges`}</TitleCard>
      <Animated.Text
        entering={FadeInDown.delay(1600).duration(420)}
        style={{ marginTop: spacing.sm + 4, maxWidth: 300, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.text }}
      >
        {one ? first.description : milestone.badges.map((b) => b.label).join(' · ')}
      </Animated.Text>
      {one && first.verse && (
        <Animated.Text
          entering={FadeInDown.delay(1750).duration(420)}
          style={{ marginTop: spacing.xs + 2, maxWidth: 300, textAlign: 'center', fontFamily: fonts.displayItalic, fontSize: 13, color: colors.muted }}
        >
          {first.verse}
        </Animated.Text>
      )}
    </>
  )
}

/** Five sparkles pop in one after another, then hop in a wave. */
function SparkleWave({ reduce }: { reduce: boolean }) {
  return (
    <View style={{ marginTop: spacing.md, height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 }} accessible={false}>
      {SPARKLES.map((s, i) => (
        <Hopper key={i} delay={1400 + i * 110} reduce={reduce}>
          <Animated.View entering={ZoomIn.delay(950 + i * 110).springify().damping(8)}>
            <Svg width={s.size} height={s.size} viewBox="-2 -2 28 28">
              <Path d={SPARKLE} fill={s.fill} stroke={linen['900']} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </Hopper>
      ))}
    </View>
  )
}

function Hopper({ delay, reduce, children }: { delay: number; reduce: boolean; children: React.ReactNode }) {
  const y = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    const hop = withSequence(
      withTiming(-14, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 420, easing: Easing.bounce }),
    )
    y.value = withDelay(delay, withRepeat(hop, 4, false))
  }, [delay, reduce, y])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  return <Animated.View style={style}>{children}</Animated.View>
}
