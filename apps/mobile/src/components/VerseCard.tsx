/**
 * The daily scripture card — same verse rotation as the web (one verse on
 * money, stewardship, or generosity, rolling at local midnight). The app's
 * warmest moment: honey wash, serif italic.
 */
import { Text, View } from 'react-native'
import { verseForDay } from '@moneyquiz/core/data/verses'

import { Card } from '@/components/ui'
import { fonts, spacing, useAppTheme } from '@/theme'

export function VerseCard() {
  const { colors } = useAppTheme()
  const verse = verseForDay()
  return (
    <Card tone="warm">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Text style={{ fontSize: 18 }}>📖</Text>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text
            style={{
              fontFamily: fonts.displayItalic,
              fontSize: 15,
              lineHeight: 22,
              color: colors.ink,
            }}
          >
            “{verse.text}”
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.accentDeep }}>
              {verse.reference}
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.faint,
              }}
            >
              Verse of the day
            </Text>
          </View>
        </View>
      </View>
    </Card>
  )
}
