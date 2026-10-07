/**
 * The mobile UI kit — the handful of primitives every screen builds from
 * (screen scaffold, cards, buttons, segmented control, progress bar), all
 * themed from the shared tokens so the phone matches the web's warmth.
 */
import { useEffect, type ReactNode } from 'react'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { fonts, radii, spacing, useAppTheme, type ThemeColors } from '@/theme'

/** Standard screen scaffold: safe area, scroll, big display title (with an optional control beside it). */
export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
}) {
  const { colors } = useAppTheme()
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 28, color: colors.ink }}>{title}</Text>
            {subtitle && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {subtitle}
              </Text>
            )}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

/** Card surface; `tone="warm"` is the honey-washed variant the web uses for the daily bread moments. */
export function Card({
  children,
  tone = 'plain',
  style,
}: {
  children: ReactNode
  tone?: 'plain' | 'warm'
  style?: ViewStyle
}) {
  const { colors } = useAppTheme()
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'warm' ? colors.accentSoft : colors.card,
          borderColor: tone === 'warm' ? `${colors.accent}55` : colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** Card heading in the display face. */
export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text style={{ fontFamily: fonts.rounded, fontSize: 16, color: colors.ink, flexShrink: 1 }}>
        {children}
      </Text>
      {right}
    </View>
  )
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  small,
}: {
  title: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'danger' | 'reward'
  disabled?: boolean
  small?: boolean
}) {
  const { colors } = useAppTheme()
  // Primary and reward (honey, for celebrations only) are the two filled, press-in buttons.
  const primary = variant === 'primary' || variant === 'reward'
  const reward = variant === 'reward'
  // The primary button "presses in" (docs/DESIGN.md): a darker 4pt edge along
  // the bottom that shrinks to 1pt while pressed, as the face drops 3pt.
  const edge = 4
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const down = primary && pressed && !disabled
        return {
          alignItems: 'center',
          alignSelf: small ? 'flex-start' : 'stretch',
          minHeight: small ? 36 : 44,
          justifyContent: 'center',
          paddingVertical: small ? spacing.sm : spacing.sm + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          backgroundColor: reward ? colors.reward : primary ? colors.primary : 'transparent',
          borderWidth: primary ? 0 : StyleSheet.hairlineWidth,
          borderColor: variant === 'danger' ? colors.danger : colors.borderStrong,
          borderBottomWidth: primary ? (down ? 1 : edge) : StyleSheet.hairlineWidth,
          borderBottomColor: reward
            ? colors.rewardEdge
            : primary
              ? colors.primaryEdge
            : variant === 'danger'
              ? colors.danger
              : colors.borderStrong,
          marginTop: primary && down ? edge - 1 : 0,
          opacity: disabled ? 0.4 : pressed && !primary ? 0.7 : 1,
        }
      }}
    >
      <Text
        style={{
          fontFamily: fonts.rounded,
          fontSize: small ? 14 : 16,
          color: reward
            ? colors.onReward
            : variant === 'primary'
              ? colors.card
              : variant === 'danger'
                ? colors.danger
                : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  )
}

/** Pill-style option switcher (theme picker, quiz ranges, account type…). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  const { colors } = useAppTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        padding: 2,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onChange(opt.id)}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderRadius: radii.md - 2,
            backgroundColor: value === opt.id ? colors.primary : 'transparent',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.roundedSemi,
              fontSize: 13,
              color: value === opt.id ? colors.card : colors.muted,
            }}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

/**
 * Thin progress track (XP bars, budget bars, quiz progress). Honey fill by
 * default. A change of `pct` slides the fill there: plainly on money screens,
 * with the bouncy reward overshoot when `reward` is set (XP, the quiz).
 */
export function Bar({
  pct,
  color,
  height = 6,
  reward = false,
}: {
  pct: number
  color?: string
  height?: number
  reward?: boolean
}) {
  const { colors } = useAppTheme()
  const target = Math.min(100, Math.max(0, pct))
  const width = useSharedValue(target)
  useEffect(() => {
    width.value = withTiming(target, {
      duration: reward ? 700 : 350,
      easing: reward ? Easing.bezier(0.34, 1.56, 0.64, 1) : Easing.out(Easing.cubic),
    })
  }, [target, reward, width])
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, width.value))}%` }))
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        backgroundColor: colors.border,
      }}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color ?? colors.accent }, fill]}
      />
    </View>
  )
}

/** Muted body copy. */
export function Note({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted, lineHeight: 19 }}>
      {children}
    </Text>
  )
}

/** Inline error / success line under a form or action. */
export function StatusLine({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <Text
      style={{
        fontFamily: fonts.sans,
        fontSize: 13,
        color: kind === 'error' ? colors.danger : colors.success,
      }}
    >
      {children}
    </Text>
  )
}

/** Centered empty-state block used inside a Card. `art` (Omer, where he belongs) takes the emoji's place. */
export function Empty({
  emoji,
  art,
  title,
  message,
  children,
}: {
  emoji?: string
  art?: ReactNode
  title: string
  message: string
  children?: ReactNode
}) {
  const { colors } = useAppTheme()
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm }}>
      {art ?? (emoji ? <Text style={{ fontSize: 34 }}>{emoji}</Text> : null)}
      <Text style={{ fontFamily: fonts.rounded, fontSize: 17, color: colors.ink, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 13,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 19,
          maxWidth: 300,
        }}
      >
        {message}
      </Text>
      {children && <View style={{ marginTop: spacing.sm, gap: spacing.sm, alignSelf: 'stretch' }}>{children}</View>}
    </View>
  )
}

export type { ThemeColors }

/** Search box with a magnifier (merchant and transaction lists). */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (text: string) => void
  placeholder: string
}) {
  const { colors } = useAppTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 40,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderStrong,
        backgroundColor: colors.card,
      }}
    >
      <Ionicons name="search" size={16} color={colors.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 8 }}
      />
    </View>
  )
}

/** Small pill label ("sub", "fixed", "Annual"). */
export function Badge({ label, tone = 'info' }: { label: string; tone?: 'info' | 'honey' | 'danger' }) {
  const { colors } = useAppTheme()
  const [bg, fg] =
    tone === 'honey'
      ? [colors.accentSoft, colors.accentDeep]
      : tone === 'danger'
        ? [colors.dangerSoft, colors.danger]
        : [colors.infoSoft, colors.info]
  return (
    <View style={{ borderRadius: radii.pill, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: bg }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 10, color: fg }}>{label}</Text>
    </View>
  )
}

/** A quiet text link with a chevron ("View all ›"). */
export function LinkButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontFamily: fonts.roundedSemi, fontSize: 13, color: colors.success }}>{title}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.success} />
    </Pressable>
  )
}
