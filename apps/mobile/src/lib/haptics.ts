/**
 * The iPhone haptics for each moment, per docs/DESIGN.md's table: success
 * for a right answer, a quiz finished or a level-up; a light warning for
 * "not quite"; a light tap for a streak; heavy for a debt paid off. iOS's
 * own "System Haptics" setting governs whether they're felt at all.
 */
import * as Haptics from 'expo-haptics'

const quietly = (p: Promise<void>) => void p.catch(() => {})

export const haptic = {
  success: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  notQuite: () => quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  tap: () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  heavy: () => quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
}
