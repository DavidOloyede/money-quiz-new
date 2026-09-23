/**
 * The receipts under an answered question: the transactions the figure was
 * computed from. Shared by the quiz screen and the question of the day —
 * wherever a question is answered, the rows behind it are right there, so no
 * number has to be taken on faith. Mirrors the web's QuizEvidence.
 */
import { Text, View } from 'react-native'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import type { EvidenceCard } from '@moneyquiz/core/lib/quiz'

import { Card } from '@/components/ui'
import { fonts, spacing, useAppTheme } from '@/theme'

export function QuizEvidence({ evidence }: { evidence: EvidenceCard[] | undefined }) {
  const { colors } = useAppTheme()
  if (!evidence || evidence.length === 0) return null
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: colors.faint,
        }}
      >
        The numbers behind this answer
      </Text>
      {evidence.map((card, i) => (
        <EvidenceList key={i} card={card} />
      ))}
    </View>
  )
}

function EvidenceList({ card }: { card: EvidenceCard }) {
  const { colors } = useAppTheme()
  return (
    <Card style={{ gap: 0, padding: 0 }}>
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 12,
          color: colors.text,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        {card.title}
      </Text>
      {card.items.map((it, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.text }}
          >
            {it.label}
            {it.detail && <Text style={{ color: colors.faint }}> {it.detail}</Text>}
          </Text>
          {it.amount !== undefined && (
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 12,
                color: it.amount > 0 ? colors.success : colors.text,
              }}
            >
              {formatCurrency(it.amount)}
            </Text>
          )}
        </View>
      ))}
    </Card>
  )
}
