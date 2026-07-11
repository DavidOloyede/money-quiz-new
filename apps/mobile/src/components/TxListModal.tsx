/**
 * Drill-down sheet: the transactions behind a tapped dashboard figure
 * (a category's spending, a month's activity). Read-only on mobile —
 * recategorizing and renaming stay on the web's bigger screen.
 */
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Transaction } from '@moneyquiz/core'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'

import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function TxListModal({
  title,
  subtitle,
  transactions,
  onClose,
}: {
  title: string
  subtitle?: string
  transactions: Transaction[]
  onClose: () => void
}) {
  const { colors } = useAppTheme()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View
        style={{
          maxHeight: '75%',
          backgroundColor: colors.card,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          paddingTop: spacing.sm,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.ink }}>
              {title}
            </Text>
            {subtitle && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                {subtitle}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.primary }}>
              Done
            </Text>
          </Pressable>
        </View>
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item: t }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15 }}>{categoryMeta(t.category).emoji}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}
                >
                  {t.description}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
                  {formatDate(t.date)}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: t.amount > 0 ? colors.success : colors.text,
                }}
              >
                {formatCurrency(t.amount)}
              </Text>
            </View>
          )}
        />
      </View>
    </Modal>
  )
}
