/**
 * The badge case — every earnable badge, lit when earned (with the date) and
 * dimmed with its how-to-earn hint when locked. Mobile port of the web card.
 */
import { StyleSheet, Text, View } from 'react-native'
import { BADGES } from '@moneyquiz/core/lib/badges'
import { formatDate } from '@moneyquiz/core/lib/format'

import { Card, CardTitle } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function BadgesCard({ badges }: { badges: Record<string, string> }) {
  const { colors } = useAppTheme()
  const earnedCount = BADGES.filter((b) => badges[b.id]).length

  return (
    <Card>
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
            {earnedCount} / {BADGES.length} earned
          </Text>
        }
      >
        Badges
      </CardTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {BADGES.map((b) => {
          const earnedAt = badges[b.id]
          return (
            <View
              key={b.id}
              style={{
                width: '48%',
                flexGrow: 1,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: earnedAt ? colors.primary : colors.border,
                backgroundColor: earnedAt ? colors.primarySoft : 'transparent',
                borderRadius: radii.md,
                padding: spacing.sm + 2,
                opacity: earnedAt ? 1 : 0.55,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 18 }}>{b.emoji}</Text>
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink }}>
                {b.label}
              </Text>
              {earnedAt ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.success }}>
                  Earned {formatDate(earnedAt.slice(0, 10))}
                </Text>
              ) : (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 15, color: colors.muted }}>
                  {b.description}
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </Card>
  )
}
