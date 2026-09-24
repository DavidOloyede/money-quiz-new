/**
 * Where the money went, by merchant: the Dashboard's Top merchants card and
 * the rows the "All merchants" screen reuses, the phone's twins of the web's
 * TopMerchantsCard / AllMerchantsModal. Totals are net of refunds (core
 * expenseGroups), and every row opens that merchant's charges.
 */
import { Pressable, Text, View } from 'react-native'
import type { ExpenseGroup, RecurringPayment } from '@moneyquiz/core/lib/analysis'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency } from '@moneyquiz/core/lib/format'

import { MerchantLogo } from '@/components/MerchantLogo'
import { Bar, Card, CardTitle, LinkButton, Note } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function MerchantRow({
  m,
  rank,
  max,
  detail = 'count',
  onPress,
}: {
  m: ExpenseGroup
  rank: number
  /** The biggest total in the list, so the bar shows scale. */
  max: number
  /** "9×" on the compact card; "9 charges · Groceries" on the full list. */
  detail?: 'count' | 'full'
  onPress: () => void
}) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.muted }}>{rank}</Text>
      </View>
      <MerchantLogo brand={m.brand} logoUrl={m.logoUrl} fallback={categoryMeta(m.category).emoji} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
            {m.label}
          </Text>
          <Text
            style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: colors.ink }}
          >
            {formatCurrency(m.total)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Bar pct={max > 0 ? (m.total / max) * 100 : 0} color={colors.primary} />
          </View>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
            {detail === 'count'
              ? `${m.count}×`
              : `${m.count === 1 ? 'one charge' : `${m.count} charges`} · ${categoryLabel(m.category)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export function HabitRow({ r, onPress }: { r: RecurringPayment; onPress: () => void }) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MerchantLogo brand={r.brand} logoUrl={r.logoUrl} fallback={categoryMeta(r.category).emoji} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
          {r.merchant}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
          {r.count} charges over {r.months} mo · ~{formatCurrency(r.avgAmount)} each
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: colors.ink }}>
        {formatCurrency(r.monthlyEstimate)}
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>/mo</Text>
      </Text>
    </Pressable>
  )
}

/** The Dashboard card: the top six, a "View all" link, and a footer that names the habits too. */
export function TopMerchantsCard({
  groups,
  habitCount,
  onOpen,
  onViewAll,
}: {
  /** Every merchant in the range, biggest first (core expenseGroups). */
  groups: ExpenseGroup[]
  habitCount: number
  onOpen: (m: ExpenseGroup) => void
  onViewAll: () => void
}) {
  const { colors } = useAppTheme()
  const top = groups.slice(0, 6)
  const max = top[0]?.total ?? 0
  return (
    <Card>
      <CardTitle right={groups.length > 0 ? <LinkButton title="View all" onPress={onViewAll} /> : undefined}>
        Top merchants
      </CardTitle>
      {top.length === 0 ? (
        <Note>No spending in this range yet.</Note>
      ) : (
        <View>
          {top.map((m, i) => (
            <MerchantRow key={m.groupKey} m={m} rank={i + 1} max={max} onPress={() => onOpen(m)} />
          ))}
        </View>
      )}
      {groups.length > 0 && (
        <Pressable
          onPress={onViewAll}
          style={({ pressed }) => ({
            alignItems: 'center',
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.roundedSemi, fontSize: 14, color: colors.text, textAlign: 'center' }}>
            See all {groups.length} merchant{groups.length === 1 ? '' : 's'}
            {habitCount > 0 ? ` & your ${habitCount} spending habit${habitCount === 1 ? '' : 's'}` : ''} ›
          </Text>
        </Pressable>
      )}
    </Card>
  )
}
