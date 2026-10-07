/**
 * The speaker button on the quiz (docs/DESIGN.md "Sound": always mutable).
 * It flips the same per-device setting as the Sounds switch in Settings.
 */
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '@moneyquiz/core'

import { useAppTheme } from '@/theme'

export function SoundToggle() {
  const { colors } = useAppTheme()
  const { sound, setSound } = useStore()
  return (
    <Pressable
      onPress={() => setSound(!sound)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: sound }}
      accessibilityLabel="Sounds"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.border : 'transparent',
      })}
    >
      <Ionicons name={sound ? 'volume-medium' : 'volume-mute'} size={22} color={colors.muted} />
    </Pressable>
  )
}
