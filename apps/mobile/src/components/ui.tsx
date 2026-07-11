/**
 * The mobile UI kit — the handful of primitives every screen builds from
 * (screen scaffold, cards, buttons, segmented control, progress bar), all
 * themed from the shared tokens so the phone matches the web's warmth.
 */
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { fonts, radii, spacing, useAppTheme, type ThemeColors } from '@/theme'

/** Standard screen scaffold: safe area, scroll, big display title. */
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const { colors } = useAppTheme()
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink }}>{title}</Text>
          {subtitle && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
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
      <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, flexShrink: 1 }}>
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
  variant?: 'primary' | 'outline' | 'danger'
  disabled?: boolean
  small?: boolean
}) {
  const { colors } = useAppTheme()
  const outline = variant !== 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        alignItems: 'center',
        alignSelf: small ? 'flex-start' : 'stretch',
        paddingVertical: small ? spacing.sm : spacing.sm + 2,
        paddingHorizontal: small ? spacing.md : spacing.md,
        borderRadius: radii.md,
        backgroundColor: variant === 'primary' ? colors.primary : 'transparent',
        borderWidth: outline ? StyleSheet.hairlineWidth : 0,
        borderColor: variant === 'danger' ? colors.danger : colors.borderStrong,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: small ? 14 : 15,
          color: variant === 'primary' ? colors.card : variant === 'danger' ? colors.danger : colors.text,
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
              fontFamily: fonts.sansMedium,
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

/** Thin progress track (XP bars, budget bars). Honey fill by default. */
export function Bar({ pct, color }: { pct: number; color?: string }) {
  const { colors } = useAppTheme()
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: colors.border,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, pct))}%`,
          borderRadius: 3,
          backgroundColor: color ?? colors.accent,
        }}
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

/** Centered empty-state block used inside a Card. */
export function Empty({
  emoji,
  title,
  message,
  children,
}: {
  emoji: string
  title: string
  message: string
  children?: ReactNode
}) {
  const { colors } = useAppTheme()
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm }}>
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.ink, textAlign: 'center' }}>
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
