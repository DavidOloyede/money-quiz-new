/**
 * Year Sheet, phone-sized: the web's spreadsheet of the year (core
 * lib/yearly), one month at a time. Step between months with the arrows or
 * the strip of twelve net bars; each month shows income, every expense
 * section, the net and (when a starting balance is set on the web) the
 * running balance. Months still ahead are projections, as on the web: a
 * category's budget if it has one, else its average so far.
 */
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { useStore, type Category } from '@moneyquiz/core'
import { formatCurrency } from '@moneyquiz/core/lib/format'
import { buildYearSheet, endBalances, yearsPresent, type SheetSection } from '@moneyquiz/core/lib/yearly'

import { useChargesSheet } from '@/components/ChargesSheet'
import { Badge, Card, CardTitle, Empty, Note } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function YearScreen() {
  const { colors } = useAppTheme()
  const { transactions, budgets, startingBalances } = useStore()
  const charges = useChargesSheet()
  const now = useMemo(() => new Date(), [])
  const years = useMemo(() => yearsPresent(transactions), [transactions])
  const [year, setYear] = useState(() =>
    years.includes(now.getFullYear()) ? now.getFullYear() : (years[years.length - 1] ?? now.getFullYear()),
  )
  const [month, setMonth] = useState(() => (year === now.getFullYear() ? now.getMonth() : 11))
  const sheet = useMemo(() => buildYearSheet(transactions, year, budgets, now), [transactions, year, budgets, now])
  const start = startingBalances[String(year)]
  const balances = useMemo(() => endBalances(start ?? 0, sheet.net), [start, sheet])

  const projected = month > sheet.lastActualMonth
  const income = sheet.income.totals[month].value
  const spent = sheet.expenseTotals[month].value
  const net = sheet.net[month].value
  const maxNet = Math.max(1, ...sheet.net.map((c) => Math.abs(c.value)))

  const step = (d: number) => {
    const m = month + d
    if (m < 0 && years.includes(year - 1)) {
      setYear(year - 1)
      setMonth(11)
    } else if (m > 11 && years.includes(year + 1)) {
      setYear(year + 1)
      setMonth(0)
    } else if (m >= 0 && m <= 11) setMonth(m)
  }

  const openCell = (category: Category, label: string) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const ids = transactions.filter((t) => t.category === category && t.date.startsWith(key)).map((t) => t.id)
    if (ids.length > 0) charges.open(label, ids, `${MONTHS[month]} ${year}`)
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Year Sheet',
          headerBackTitle: 'Dashboard',
          headerTitleStyle: { fontFamily: fonts.rounded, color: colors.ink },
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }}>
        {years.length === 0 ? (
          <Card>
            <Empty emoji="📒" title="No year to show yet" message="Import or connect an account, and each month fills in here." />
          </Card>
        ) : (
          <>
            {/* Month stepper */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={() => step(-1)} hitSlop={12} accessibilityLabel="Previous month">
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </Pressable>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontFamily: fonts.roundedHeavy, fontSize: 22, color: colors.ink }}>
                  {MONTHS[month]} {year}
                </Text>
                {projected && <Badge label="Projected" />}
              </View>
              <Pressable onPress={() => step(1)} hitSlop={12} accessibilityLabel="Next month">
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </Pressable>
            </View>

            {/* Twelve net bars: tap to jump to a month */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {sheet.net.map((c, i) => {
                const h = Math.max(3, (Math.abs(c.value) / maxNet) * 24)
                const up = c.value >= 0
                return (
                  <Pressable
                    key={i}
                    onPress={() => setMonth(i)}
                    accessibilityLabel={`${MONTHS[i]}: ${formatCurrency(c.value)} net`}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}
                  >
                    <View style={{ height: 24, justifyContent: 'flex-end' }}>
                      {up && <View style={{ width: 8, height: h, borderRadius: 2, backgroundColor: colors.primary, opacity: c.projected ? 0.4 : 1 }} />}
                    </View>
                    <View style={{ height: 24, justifyContent: 'flex-start' }}>
                      {!up && <View style={{ width: 8, height: h, borderRadius: 2, backgroundColor: colors.danger, opacity: c.projected ? 0.4 : 1 }} />}
                    </View>
                    <Text
                      style={{
                        fontFamily: i === month ? fonts.sansBold : fonts.sans,
                        fontSize: 10,
                        color: i === month ? colors.ink : colors.faint,
                      }}
                    >
                      {MONTHS[i].charAt(0)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* The month's totals */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Total label="Income" value={income} color={colors.success} />
              <Total label="Spent" value={spent} color={colors.accentDeep} />
              <Total label="Net" value={net} color={net >= 0 ? colors.success : colors.danger} />
            </View>
            {start !== undefined && (
              <Note>
                Balance at month end: {formatCurrency(balances[month])} (starting from {formatCurrency(start)} on Jan 1)
              </Note>
            )}
            {projected && (
              <Note>This month hasn&apos;t happened yet, so these are estimates: a category&apos;s budget if it has one, otherwise its average so far.</Note>
            )}

            <SectionCard section={sheet.income} month={month} projected={projected} onOpen={openCell} />
            {sheet.expenseSections.map((s) => (
              <SectionCard key={s.id} section={s} month={month} projected={projected} onOpen={openCell} />
            ))}
          </>
        )}
      </ScrollView>
      {charges.node}
    </>
  )
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useAppTheme()
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
        padding: spacing.sm + 2,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.faint }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, fontVariant: ['tabular-nums'], color }}>
        {formatCurrency(value)}
      </Text>
    </View>
  )
}

function SectionCard({
  section,
  month,
  projected,
  onOpen,
}: {
  section: SheetSection
  month: number
  projected: boolean
  onOpen: (category: Category, label: string) => void
}) {
  const { colors } = useAppTheme()
  const rows = section.rows.filter((r) => r.cells[month].value !== 0)
  if (rows.length === 0) return null
  return (
    <Card>
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, fontVariant: ['tabular-nums'], color: colors.text }}>
            {formatCurrency(section.totals[month].value)}
          </Text>
        }
      >
        {section.title}
      </CardTitle>
      {rows.map((r) => {
        const cell = r.cells[month]
        return (
          <Pressable
            key={r.id}
            disabled={projected}
            onPress={() => onOpen(r.id, r.label)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.text }}>{r.label}</Text>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                fontVariant: ['tabular-nums'],
                color: cell.projected ? colors.faint : colors.ink,
                fontStyle: cell.projected ? 'italic' : 'normal',
              }}
            >
              {formatCurrency(cell.value)}
            </Text>
          </Pressable>
        )
      })}
    </Card>
  )
}
