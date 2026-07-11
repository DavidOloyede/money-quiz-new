/**
 * One multiple-choice answer row, with the shared after-answer states: green
 * for the right option, rose for a wrong pick, faded for the rest. Used by
 * the daily question and the quiz.
 */
import { Pressable, StyleSheet, Text } from 'react-native'

import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function AnswerOption({
  label,
  answered,
  isCorrect,
  isChosen,
  onPress,
}: {
  label: string
  answered: boolean
  isCorrect: boolean
  isChosen: boolean
  onPress: () => void
}) {
  const { colors } = useAppTheme()
  let border = colors.borderStrong
  let bg = colors.card
  let fg = colors.text
  if (answered) {
    if (isCorrect) {
      border = colors.primary
      bg = colors.primarySoft
      fg = colors.success
    } else if (isChosen) {
      border = colors.danger
      bg = colors.dangerSoft
      fg = colors.danger
    } else {
      border = colors.border
      fg = colors.faint
    }
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={answered}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: border,
        backgroundColor: bg,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
      }}
    >
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: fg }}>{label}</Text>
      {answered && isCorrect && (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.success }}>✓</Text>
      )}
      {answered && isChosen && !isCorrect && (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.danger }}>✕</Text>
      )}
    </Pressable>
  )
}
