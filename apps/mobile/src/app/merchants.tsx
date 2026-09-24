/**
 * All merchants — "View all" behind the Dashboard's Top merchants card.
 * Two tabs: every merchant in the Dashboard's range (search, most spent or
 * most visits), and the spending habits (repeat merchants that aren't bills,
 * over all your history). Any row opens its charges.
 */
import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useStore } from '@moneyquiz/core'
import {
  expenseGroups,
  filterByRange,
  rangeLabel,
  recurringPayments,
  type TimeRange,
} from '@moneyquiz/core/lib/analysis'
import { formatCurrency } from '@moneyquiz/core/lib/format'

import { useChargesSheet } from '@/components/ChargesSheet'
import { HabitRow, MerchantRow } from '@/components/Merchants'
import { Card, Note, SearchField, Segmented } from '@/components/ui'
import { fonts, spacing, useAppTheme } from '@/theme'

type Tab = 'merchants' | 'habits'
type Sort = 'spent' | 'visits'

const RANGES: TimeRange[] = ['thisMonth', 'lastMonth', 'thisYear']

export default function MerchantsScreen() {
  const { colors } = useAppTheme()
  const params = useLocalSearchParams<{ range?: string; tab?: string }>()
  const range: TimeRange = RANGES.includes(params.range as TimeRange) ? (params.range as TimeRange) : 'thisYear'
  const { transactions, aliases, dismissedRecurring, recurringKinds } = useStore()
  const [tab, setTab] = useState<Tab>(params.tab === 'habits' ? 'habits' : 'merchants')
  const [sort, setSort] = useState<Sort>('spent')
  const [query, setQuery] = useState('')
  const charges = useChargesSheet()

  const groups = useMemo(
    () => expenseGroups(filterByRange(transactions, range), aliases),
    [transactions, range, aliases],
  )
  const habits = useMemo(
    () =>
      recurringPayments(transactions, aliases, dismissedRecurring, recurringKinds).filter(
        (r) => r.kind === 'habit',
      ),
    [transactions, aliases, dismissedRecurring, recurringKinds],
  )
  // Rank by the chosen order first, then filter, so a search keeps each
  // merchant's real place in the list.
  const ranked = useMemo(() => {
    const list =
      sort === 'spent' ? groups : [...groups].sort((a, b) => b.count - a.count || b.total - a.total)
    return list.map((g, i) => ({ g, rank: i + 1 }))
  }, [groups, sort])
  const q = query.trim().toLowerCase()
  const shown = q ? ranked.filter(({ g }) => g.label.toLowerCase().includes(q)) : ranked
  const max = groups[0]?.total ?? 0
  const total = groups.reduce((s, g) => s + g.total, 0)
  const habitTotal = habits.reduce((s, r) => s + r.monthlyEstimate, 0)
  const scope = rangeLabel(range)

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tab === 'merchants' ? 'All merchants' : 'Spending habits',
          headerBackTitle: 'Dashboard',
          headerTitleStyle: { fontFamily: fonts.rounded, color: colors.ink },
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Segmented
          options={[
            { id: 'merchants', label: `Merchants · ${groups.length}` },
            { id: 'habits', label: `Spending habits · ${habits.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'merchants' ? (
          <>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>
              {scope.charAt(0).toUpperCase() + scope.slice(1)} · {groups.length} merchant
              {groups.length === 1 ? '' : 's'} · {formatCurrency(total)}
            </Text>
            {groups.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <SearchField value={query} onChange={setQuery} placeholder="Find a merchant" />
                <Segmented
                  options={[
                    { id: 'spent', label: 'Most spent' },
                    { id: 'visits', label: 'Most visits' },
                  ]}
                  value={sort}
                  onChange={setSort}
                />
              </View>
            )}
            <Card>
              {shown.length === 0 ? (
                <Note>{q ? `No merchants match “${query.trim()}”.` : 'No spending in this range yet.'}</Note>
              ) : (
                shown.map(({ g, rank }) => (
                  <MerchantRow
                    key={g.groupKey}
                    m={g}
                    rank={rank}
                    max={max}
                    detail="full"
                    onPress={() =>
                      charges.open(g.label, g.ids, `${g.count === 1 ? 'one charge' : `${g.count} charges`} · ${scope}`)
                    }
                  />
                ))
              )}
            </Card>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>
              All your history · ~{formatCurrency(habitTotal)}/mo across {habits.length}
            </Text>
            <Note>
              Places you keep going back to: not bills, just patterns. The amounts vary, but the habit
              repeats. Tap one to see its charges.
            </Note>
            <Card>
              {habits.length === 0 ? (
                <Note>No habits yet. When a place shows up month after month, it&apos;ll appear here.</Note>
              ) : (
                habits.map((r) => (
                  <HabitRow
                    key={r.groupKey}
                    r={r}
                    onPress={() => charges.open(r.merchant, r.ids, `${r.count} charges · all your history`)}
                  />
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
      {charges.node}
    </>
  )
}
