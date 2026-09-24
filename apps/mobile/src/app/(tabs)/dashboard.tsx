/**
 * Dashboard — the phone-sized read on your money: totals, category breakdown,
 * monthly trend, top expenses, recurring bills, budgets, and giving. Cards
 * are view-only ports of the web's (edits — budgets, renames, recategorizing
 * — stay on the web's bigger screen); charts are lightweight View-based bars.
 */
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useStore, type Category, type Transaction } from '@moneyquiz/core'
import {
  currentMonthKey,
  filterByRange,
  headlineStats,
  monthKey,
  monthlyTrend,
  prevMonthKey,
  rangeLabel,
  recurringPayments,
  spendingByCategory,
  expenseGroups,
  type TimeRange,
} from '@moneyquiz/core/lib/analysis'
import { categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatDate, formatMonth, formatPercent } from '@moneyquiz/core/lib/format'

import { useChargesSheet } from '@/components/ChargesSheet'
import { TopMerchantsCard } from '@/components/Merchants'
import { BudgetsCard, GivingCard } from '@/components/MoneyCards'
import { DebtCard, TransfersCard, TrendsCard } from '@/components/MoreCards'
import { RecurringCard } from '@/components/RecurringCard'
import { useTransactionEditor } from '@/components/TransactionSheet'
import { TxListModal } from '@/components/TxListModal'
import { VerseCard } from '@/components/VerseCard'
import { Bar, Button, Card, CardTitle, Empty, Note, Screen, Segmented } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear', label: 'This year' },
]

type Drill =
  | { kind: 'category'; category: Category }
  | { kind: 'month'; month: string }
  | null

export default function DashboardScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const {
    transactions,
    hasData,
    loadSample,
    aliases,
    dismissedRecurring,
    recurringKinds,
  } = useStore()
  const [range, setRange] = useState<TimeRange>('thisYear')
  const [drill, setDrill] = useState<Drill>(null)

  const filtered = useMemo(() => filterByRange(transactions, range), [transactions, range])
  const stats = useMemo(() => headlineStats(filtered), [filtered])
  const cats = useMemo(() => spendingByCategory(filtered), [filtered])
  const merchants = useMemo(() => expenseGroups(filtered, aliases), [filtered, aliases])
  const trend = useMemo(() => monthlyTrend(transactions), [transactions])
  // One grouping pass shared by the recurring bills and the spending habits.
  const recurring = useMemo(
    () => recurringPayments(transactions, aliases, dismissedRecurring, recurringKinds),
    [transactions, aliases, dismissedRecurring, recurringKinds],
  )
  const bills = useMemo(() => recurring.filter((r) => r.kind === 'bill'), [recurring])
  const habits = useMemo(() => recurring.filter((r) => r.kind === 'habit'), [recurring])
  const charges = useChargesSheet()
  const editor = useTransactionEditor()
  const budgetMonth = range === 'lastMonth' ? prevMonthKey() : currentMonthKey()

  if (!hasData) {
    return (
      <Screen title="Dashboard">
        <VerseCard />
        <Card>
          <Empty
            emoji="📊"
            title="No data to analyze yet"
            message="Connect an account or load the sample dataset to see your spending broken down."
          >
            <Button title="Load sample data" onPress={loadSample} />
            <Button title="Go to Import" variant="outline" onPress={() => router.push('/import')} />
          </Empty>
        </Card>
      </Screen>
    )
  }

  const drillTx: Transaction[] =
    drill?.kind === 'category'
      ? filtered.filter((t) => t.category === drill.category)
      : drill?.kind === 'month'
        ? transactions.filter((t) => monthKey(t.date) === drill.month)
        : []

  return (
    <Screen title="Dashboard" subtitle={capitalize(rangeLabel(range))}>
      <Segmented options={RANGES} value={range} onChange={setRange} />

      {filtered.length === 0 ? (
        <Card>
          <Note>No transactions in this time range. Try a different range.</Note>
        </Card>
      ) : (
        <>
          {/* Totals */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatTile label="Income" value={formatCurrency(stats.totalIncome)} tone="success" />
            <StatTile label="Spending" value={formatCurrency(stats.totalSpending)} tone="accent" />
            <StatTile
              label="Net"
              value={formatCurrency(stats.net)}
              tone={stats.net >= 0 ? 'success' : 'danger'}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatTile
              label="Biggest category"
              value={stats.biggestCategory ? categoryLabel(stats.biggestCategory.category) : '—'}
              sub={stats.biggestCategory ? formatCurrency(stats.biggestCategory.total) : undefined}
            />
            <StatTile
              label="Largest expense"
              value={stats.largestExpense ? formatCurrency(stats.largestExpense.amount) : '—'}
              sub={stats.largestExpense?.description}
            />
            <StatTile label="Transactions" value={String(stats.count)} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button variant="outline" title="All transactions" onPress={() => router.push('/transactions')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="outline" title="Year Sheet" onPress={() => router.push('/year')} />
            </View>
          </View>

          {/* Spending by category */}
          <Card>
            <CardTitle>Spending by category</CardTitle>
            {cats.length === 0 ? (
              <Note>No spending in this range.</Note>
            ) : (
              cats.map((c) => {
                const pct = stats.totalSpending > 0 ? (c.total / stats.totalSpending) * 100 : 0
                const meta = categoryMeta(c.category)
                return (
                  <Pressable
                    key={c.category}
                    onPress={() => setDrill({ kind: 'category', category: c.category })}
                    style={{ gap: 3 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                      <Text style={{ fontSize: 13 }}>{meta.emoji}</Text>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}
                      >
                        {categoryLabel(c.category)}
                        <Text style={{ color: colors.faint }}> · {c.count}</Text>
                      </Text>
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text }}>
                        {formatCurrency(c.total)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 11,
                          color: colors.faint,
                          width: 38,
                          textAlign: 'right',
                        }}
                      >
                        {formatPercent(pct)}
                      </Text>
                    </View>
                    <Bar pct={pct} color={meta.color} />
                  </Pressable>
                )
              })
            )}
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardTitle
              right={
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
                  all time · tap a month
                </Text>
              }
            >
              Monthly trend
            </CardTitle>
            <TrendBars data={trend.slice(-8)} onSelect={(m) => setDrill({ kind: 'month', month: m })} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <LegendDot color={colors.primary} label="income" />
              <LegendDot color={colors.accent} label="spending" />
            </View>
          </Card>

          {/* Top merchants (tap for charges; View all = every merchant + spending habits) */}
          <TopMerchantsCard
            groups={merchants}
            habitCount={habits.length}
            onOpen={(m) =>
              charges.open(
                m.label,
                m.ids,
                `${m.count === 1 ? 'one charge' : `${m.count} charges`} · ${rangeLabel(range)}`,
              )
            }
            onViewAll={() => router.push({ pathname: '/merchants', params: { range } })}
          />

          {/* Recurring & subscriptions */}
          <RecurringCard items={bills} onOpen={(title, ids) => charges.open(title, ids)} />

          <BudgetsCard monthKey={budgetMonth} />
          <GivingCard filtered={filtered} monthKey={budgetMonth} />

          <DebtCard onOpen={(title, ids) => charges.open(title, ids)} />
          <TrendsCard transactions={transactions} />
          <TransfersCard
            filtered={filtered}
            onOpenCategory={(category) => setDrill({ kind: 'category', category })}
            onOpen={(title, ids) => charges.open(title, ids)}
          />
        </>
      )}

      {charges.node}
      {drill && (
        <TxListModal
          title={drill.kind === 'category' ? categoryLabel(drill.category) : formatMonth(drill.month)}
          subtitle={`${drillTx.length} transaction${drillTx.length === 1 ? '' : 's'} · ${
            drill.kind === 'category' ? rangeLabel(range) : 'all accounts'
          }`}
          transactions={drillTx}
          onClose={() => setDrill(null)}
          onPressRow={editor.open}
        >
          {editor.node}
        </TxListModal>
      )}
    </Screen>
  )
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'success' | 'accent' | 'danger'
}) {
  const { colors } = useAppTheme()
  const valueColor =
    tone === 'success'
      ? colors.success
      : tone === 'accent'
        ? colors.accentDeep
        : tone === 'danger'
          ? colors.danger
          : colors.ink
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.sm + 2,
        gap: 2,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: colors.faint,
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: valueColor }}
      >
        {value}
      </Text>
      {sub && (
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.muted }}>
          {sub}
        </Text>
      )}
    </View>
  )
}

/** Paired income/spending bars per month — a dependency-free mini chart. */
function TrendBars({
  data,
  onSelect,
}: {
  data: { monthKey: string; spending: number; income: number }[]
  onSelect: (monthKey: string) => void
}) {
  const { colors } = useAppTheme()
  const max = Math.max(1, ...data.flatMap((d) => [d.spending, d.income]))
  const CHART_H = 96
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
      {data.map((d) => (
        <Pressable
          key={d.monthKey}
          onPress={() => onSelect(d.monthKey)}
          style={{ flex: 1, alignItems: 'center', gap: 3 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_H }}>
            <View
              style={{
                width: 8,
                height: Math.max(2, (d.income / max) * CHART_H),
                borderRadius: 2,
                backgroundColor: colors.primary,
              }}
            />
            <View
              style={{
                width: 8,
                height: Math.max(2, (d.spending / max) * CHART_H),
                borderRadius: 2,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.faint }}>
            {formatMonth(d.monthKey).slice(0, 3)}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.muted }}>{label}</Text>
    </View>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
