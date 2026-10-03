/**
 * One multiple-choice answer, shared by the daily question and the quiz, and
 * the phone's version of the web's AnswerChoice (docs/DESIGN.md "Celebration
 * moments"):
 *
 * - right: the tile pops green, the ✓ springs in, manna bursts out and
 *   "+10 XP" floats up (only for the answer just picked, so reviewing stays
 *   calm);
 * - not quite: a gentle shake, a coral outline and a ✕, while the right
 *   answer lights up beside it.
 *
 * Tiles press in on a thicker bottom edge, like the primary button. Every
 * state carries a mark or words, not colour alone.
 */
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { RewardBurst } from '@/components/celebrate/RewardBurst'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function AnswerOption({
  label,
  index,
  answered,
  isCorrect,
  isChosen,
  celebrate = false,
  xp,
  onPress,
}: {
  label: string
  index: number
  answered: boolean
  isCorrect: boolean
  isChosen: boolean
  /** True only for the question just answered: play the pop / shake / burst. */
  celebrate?: boolean
  /** XP to float up from a right pick. */
  xp?: number
  onPress: () => void
}) {
  const { colors } = useAppTheme()
  const reduce = useReducedMotion()
  const right = answered && isCorrect
  const wrong = answered && isChosen && !isCorrect
  const scale = useSharedValue(1)
  const shake = useSharedValue(0)

  useEffect(() => {
    if (!celebrate || reduce) return
    if (right) {
      scale.value = withSequence(
        withTiming(1.045, { duration: 180, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      )
    } else if (wrong) {
      shake.value = withSequence(
        ...[-6, 5, -3, 2, 0].map((x) => withTiming(x, { duration: 80, easing: Easing.inOut(Easing.quad) })),
      )
    }
  }, [celebrate, right, wrong, reduce, scale, shake])

  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shake.value }] }))

  let border = colors.border
  let bg = colors.card
  let fg = colors.ink
  if (right) {
    border = colors.primary
    bg = colors.primarySoft
    fg = colors.success
  } else if (wrong) {
    border = colors.dangerBorder
    bg = colors.dangerSoft
    fg = colors.danger
  } else if (answered) {
    fg = colors.faint
  }

  return (
    <Animated.View style={motion}>
      <Pressable
        onPress={onPress}
        disabled={answered}
        accessibilityRole="button"
        accessibilityState={{ disabled: answered, selected: isChosen }}
        accessibilityLabel={
          right ? `${label}, ${isChosen ? 'your answer, correct' : 'the correct answer'}` : wrong ? `${label}, your answer, not quite` : label
        }
        style={({ pressed }) => {
          const down = pressed && !answered
          return {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm + 2,
            borderWidth: 2,
            // The press-in edge: 4pt along the bottom that drops to 2pt (face moves down 2pt).
            borderBottomWidth: down ? 2 : 4,
            marginTop: down ? 2 : 0,
            borderColor: border,
            backgroundColor: bg,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md - 4,
            paddingVertical: spacing.sm + 3,
          }
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: right ? colors.primary : wrong ? colors.dangerBorder : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 12, color: right ? colors.success : wrong ? colors.danger : colors.faint }}>
            {index + 1}
          </Text>
        </View>
        <Text style={{ flex: 1, fontFamily: fonts.rounded, fontSize: 15, color: fg }}>{label}</Text>
        {(right || wrong) && (
          <Animated.View
            entering={celebrate ? ZoomIn.springify().damping(9).delay(80) : undefined}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: right ? colors.markRight : colors.markWrong,
            }}
          >
            <Ionicons name={right ? 'checkmark' : 'close'} size={17} color="white" />
          </Animated.View>
        )}
      </Pressable>
      {celebrate && right && isChosen && <RewardBurst xp={xp} />}
    </Animated.View>
  )
}
