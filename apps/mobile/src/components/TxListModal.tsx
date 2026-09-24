/**
 * Drill-down sheet: the transactions behind a tapped figure (a category's
 * spending, a month's activity, one merchant's charges). Each row shows its
 * company logo when we have one; tapping a row opens it for editing when the
 * caller passes `onPressRow`.
 */
import type { ReactNode } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useStore, type Transaction } from '@moneyquiz/core'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { displayDescription } from '@moneyquiz/core/lib/merchant'

import { MerchantLogo, brandForRow } from '@/components/MerchantLogo'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function TxListModal({
  title,
  subtitle,
  transactions,
  onClose,
  onPressRow,
  header,
}: {
  title: string
  subtitle?: string
  transactions: Transaction[]
  onClose: () => void
  onPressRow?: (t: Transaction) => void
  /** Extra controls above the list (e.g. a merchant's recurring star). */
  header?: ReactNode
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
            <Text style={{ fontFamily: fonts.rounded, fontSize: 17, color: colors.ink }}>
              {title}
            </Text>
            {subtitle && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                {subtitle}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.roundedSemi, fontSize: 15, color: colors.primary }}>
              Done
            </Text>
          </Pressable>
        </View>
        {header && <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>{header}</View>}
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => <TxRow t={item} onPress={onPressRow} />}
        />
      </View>
    </Modal>
  )
}

/** One transaction line: logo, name, date, amount. Shared by every list of charges. */
export function TxRow({ t, onPress }: { t: Transaction; onPress?: (t: Transaction) => void }) {
  const { colors } = useAppTheme()
  const { aliases } = useStore()
  return (
    <Pressable
      onPress={onPress ? () => onPress(t) : undefined}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: pressed ? colors.background : 'transparent',
      })}
    >
      <MerchantLogo
        brand={brandForRow(t, aliases)}
        logoUrl={t.logoUrl}
        fallback={categoryMeta(t.category).emoji}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
          {displayDescription(t.description, aliases)}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
          {formatDate(t.date)}
          {t.recurring ? '  ★' : ''}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          fontVariant: ['tabular-nums'],
          color: t.amount > 0 ? colors.success : colors.text,
        }}
      >
        {formatCurrency(t.amount)}
      </Text>
    </Pressable>
  )
}
