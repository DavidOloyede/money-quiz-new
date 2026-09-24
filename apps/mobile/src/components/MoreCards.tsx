/**
 * The Dashboard's lower cards, ported from the web: Debt freedom (with the
 * "possibly paid off?" confirmation, which earns the Debt Slayer badge),
 * Trends & anomalies, and Transfers & Zelle (the money that's tracked but
 * not counted, plus same-amount transfers that repeat). Deciding what a
 * transfer was, or whether a repeating one counts, stays on the web.
 */
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useStore, type Category, type Transaction } from '@moneyquiz/core'
import { excludedSummary, recurringTransfers, spendingTrends } from '@moneyquiz/core/lib/analysis'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { debtRecurring, monthlyDebtTrend, paidOffCandidates } from '@moneyquiz/core/lib/debt'
import { formatCurrency, formatDate, formatMonth, formatPercent } from '@moneyquiz/core/lib/format'
import { unreviewedTransferCount } from '@moneyquiz/core/lib/transferReview'

import { Badge, Button, Card, CardTitle, Note } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

type Open = (title: string, ids: string[]) => void

export function DebtCard({ onOpen }: { onOpen: Open }) {
  const { colors } = useAppTheme()
  const { transactions, aliases, dismissedRecurring, paidOffDebts, setDebtPaidOff } = useStore()
  const debts = useMemo(
    () => debtRecurring(transactions, aliases, dismissedRecurring),
    [transactions, aliases, dismissedRecurring],
  )
  const trend = useMemo(() => monthlyDebtTrend(transactions).slice(-12), [transactions])
  const candidates = useMemo(
    () => paidOffCandidates(transactions, aliases, dismissedRecurring, paidOffDebts),
    [transactions, aliases, dismissedRecurring, paidOffDebts],
  )
  const candidateKeys = new Set(candidates.map((c) => c.payment.groupKey))
  const active = debts.filter((d) => !candidateKeys.has(d.groupKey) && !paidOffDebts[d.groupKey])
  const confirmed = debts.filter((d) => paidOffDebts[d.groupKey])
  const monthlyTotal = active.reduce((a, d) => a + d.monthlyEstimate, 0)
  const maxMonth = Math.max(1, ...trend.map((m) => m.total))

  // Debt-free people shouldn't see an empty card.
  if (debts.length === 0 && trend.length === 0 && confirmed.length === 0) return null

  return (
    <Card>
      <CardTitle
        right={
          monthlyTotal > 0 ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
              ~{formatCurrency(monthlyTotal)} / month
            </Text>
          ) : undefined
        }
      >
        Debt freedom
      </CardTitle>
      {trend.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          {trend.map((m) => (
            <View key={m.monthKey} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ height: 48, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View
                  style={{
                    width: '80%',
                    height: `${Math.max(m.total > 0 ? 6 : 0, (m.total / maxMonth) * 100)}%`,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.faint }}>
                {formatMonth(m.monthKey).slice(0, 1)}
              </Text>
            </View>
          ))}
        </View>
      )}
      {active.map((d) => (
        <Pressable
          key={d.groupKey}
          onPress={() => onOpen(d.merchant, d.ids)}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 16 }}>🏦</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
              {d.merchant}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
              last payment {formatDate(d.lastDate)}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: colors.ink }}>
            {formatCurrency(d.monthlyEstimate)}
            <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}> /mo</Text>
          </Text>
        </Pressable>
      ))}
      {candidates.map(({ payment: d, daysSince }) => (
        <View
          key={d.groupKey}
          style={{ gap: spacing.sm, borderRadius: radii.md, padding: spacing.sm + 4, backgroundColor: colors.accentSoft }}
        >
          <Text style={{ fontFamily: fonts.rounded, fontSize: 14, color: colors.accentDeep }}>
            {d.merchant}: possibly paid off?
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.accentDeep }}>
            No payment in {daysSince} days (was {formatCurrency(d.monthlyEstimate)}/mo)
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button small title="Confirm paid off" onPress={() => setDebtPaidOff(d.groupKey, true)} />
            <Button small variant="outline" title="Review" onPress={() => onOpen(d.merchant, d.ids)} />
          </View>
        </View>
      ))}
      {confirmed.map((d) => {
        const confirmedAt = paidOffDebts[d.groupKey]
        // New charges after the confirmation mean it wasn't done after all.
        const resumed = confirmedAt && d.lastDate > confirmedAt.slice(0, 10)
        return (
          <View
            key={d.groupKey}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              borderRadius: radii.md,
              padding: spacing.sm + 4,
              backgroundColor: colors.primarySoft,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.rounded, fontSize: 14, color: colors.success }}>
                🎉 {d.merchant}: paid off {confirmedAt ? formatDate(confirmedAt.slice(0, 10)) : ''}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.success }}>
                {resumed
                  ? 'New payments appeared after this was confirmed.'
                  : `${formatCurrency(d.monthlyEstimate)}/mo freed for saving and giving`}
              </Text>
            </View>
            <Pressable onPress={() => setDebtPaidOff(d.groupKey, false)} hitSlop={8}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.success }}>Undo</Text>
            </Pressable>
          </View>
        )
      })}
      <Text style={{ fontFamily: fonts.displayItalic, fontSize: 13, color: colors.faint }}>
        “Owe no one anything, except to love one another.” (Romans 13:8)
      </Text>
    </Card>
  )
}

export function TrendsCard({ transactions }: { transactions: Transaction[] }) {
  const { colors } = useAppTheme()
  const trends = useMemo(() => spendingTrends(transactions), [transactions])
  if (trends.length === 0) return null
  return (
    <Card>
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
            {formatMonth(trends[0].monthKey)} vs before
          </Text>
        }
      >
        Trends & anomalies
      </CardTitle>
      {trends.slice(0, 5).map((t) => {
        const up = t.delta >= 0
        const meta = categoryMeta(t.category)
        return (
          <View key={t.category} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: up ? colors.dangerSoft : colors.primarySoft,
              }}
            >
              <Text style={{ fontSize: 10, color: up ? colors.danger : colors.success }}>{up ? '▲' : '▼'}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.text }}>
              <Text style={{ fontFamily: fonts.sansMedium }}>
                {meta.emoji} {meta.label}
              </Text>{' '}
              {up ? 'up' : 'down'} {formatPercent(Math.abs(t.deltaPct))}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, fontVariant: ['tabular-nums'], color: colors.muted }}>
              {formatCurrency(t.current)}
              <Text style={{ fontSize: 11, color: colors.faint }}> vs {formatCurrency(t.baseline)}</Text>
            </Text>
          </View>
        )
      })}
    </Card>
  )
}

export function TransfersCard({
  filtered,
  onOpenCategory,
  onOpen,
}: {
  /** The Dashboard's date-filtered rows. */
  filtered: Transaction[]
  onOpenCategory: (category: Category) => void
  onOpen: Open
}) {
  const { colors } = useAppTheme()
  const { transactions, aliases, transferRules, ignoredTransfers } = useStore()
  const excluded = useMemo(() => excludedSummary(filtered), [filtered])
  const repeating = useMemo(() => recurringTransfers(transactions, aliases), [transactions, aliases])
  // Counted over all transactions: an old transfer still needs deciding.
  const unreviewed = useMemo(() => unreviewedTransferCount(transactions, transferRules), [transactions, transferRules])
  if (excluded.length === 0 && repeating.length === 0) return null

  return (
    <Card>
      <CardTitle>Transfers & Zelle</CardTitle>
      <Note>
        Money moved between your own accounts (or paying off a card) is tracked here so it doesn&apos;t
        distort your spending.
      </Note>
      {unreviewed > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderRadius: radii.md,
            padding: spacing.sm + 4,
            backgroundColor: colors.accentSoft,
          }}
        >
          <Text style={{ fontSize: 18 }}>👀</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.rounded, fontSize: 14, color: colors.accentDeep }}>
              {unreviewed} transfer{unreviewed === 1 ? '' : 's'} to review
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.accentDeep }}>
              Money to and from other people. Decide what each one was on the website.
            </Text>
          </View>
        </View>
      )}
      {excluded.map((e) => {
        const meta = categoryMeta(e.category)
        return (
          <Pressable
            key={e.category}
            onPress={() => onOpenCategory(e.category)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.md - 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${meta.color}1a`,
              }}
            >
              <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
                {categoryLabel(e.category)}
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}> · {e.count}</Text>
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, fontVariant: ['tabular-nums'], color: colors.muted }}>
                {formatCurrency(e.out)} out{e.in > 0 ? ` · ${formatCurrency(e.in)} in` : ''}
              </Text>
            </View>
          </Pressable>
        )
      })}
      {repeating.length > 0 && (
        <>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text, marginTop: spacing.xs }}>
            Repeating transfers
          </Text>
          <Note>Same amount, same time each month. These count as real spending or income unless you say otherwise on the website.</Note>
          {repeating.slice(0, 7).map((rt) => (
            <Pressable
              key={rt.key}
              onPress={() => onOpen(rt.label, rt.ids)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
            >
              <Badge label={rt.direction.toUpperCase()} tone={rt.direction === 'out' ? 'honey' : 'info'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
                  {rt.label}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
                  {formatCurrency(rt.amount)} · {rt.count}× over {rt.months} mo · ~day {rt.day}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                {ignoredTransfers[rt.key] ? 'Not counted' : 'Counts'}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </Card>
  )
}
