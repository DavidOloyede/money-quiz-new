/**
 * All transactions — every charge and deposit, newest first, with the same
 * filter rules as the web table (core lib/filter): search the description,
 * or type an amount ("118") to find charges of exactly that much in or out;
 * narrow by category or to ★ recurring rows. Tap a row to edit it.
 */
import { useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { useStore, type Category } from '@moneyquiz/core'
import { allCategories } from '@moneyquiz/core/lib/categories'
import { filterTransactions, type TransactionCriteria } from '@moneyquiz/core/lib/filter'
import { formatCurrency } from '@moneyquiz/core/lib/format'

import { useTransactionEditor } from '@/components/TransactionSheet'
import { TxRow } from '@/components/TxListModal'
import { Empty, SearchField } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

/** "118", "$118", "118.50": a search for an amount rather than a name. */
const AMOUNT = /^\$?\s*(\d+(?:\.\d{1,2})?)$/

export default function TransactionsScreen() {
  const { colors } = useAppTheme()
  const { transactions } = useStore()
  const editor = useTransactionEditor()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [recurringOnly, setRecurringOnly] = useState(false)

  // Only offer categories that actually have rows.
  const present = useMemo(() => {
    const used = new Set(transactions.map((t) => t.category))
    return allCategories().filter((c) => used.has(c.id))
  }, [transactions])

  const rows = useMemo(() => {
    const amount = query.trim().match(AMOUNT)
    const criteria: TransactionCriteria = {
      query: amount ? undefined : query,
      amount: amount ? Number(amount[1]) : null,
      category,
      recurringOnly,
    }
    return filterTransactions(transactions, criteria)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, query, category, recurringOnly])
  const net = rows.reduce((s, t) => s + t.amount, 0)

  const chip = (label: string, on: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        minHeight: 34,
        justifyContent: 'center',
        paddingHorizontal: spacing.sm + 4,
        borderRadius: radii.pill,
        borderWidth: on ? 0 : StyleSheet.hairlineWidth,
        borderColor: colors.borderStrong,
        backgroundColor: on ? colors.primary : colors.card,
      }}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: on ? colors.card : colors.text }}>{label}</Text>
    </Pressable>
  )

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'All transactions',
          headerBackTitle: 'Dashboard',
          headerTitleStyle: { fontFamily: fonts.rounded, color: colors.ink },
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <SearchField value={query} onChange={setQuery} placeholder="Search, or type an amount" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
            >
              {chip('★ Recurring', recurringOnly, () => setRecurringOnly(!recurringOnly), 'recurring')}
              {chip('All', category === 'all', () => setCategory('all'), 'all')}
              {present.map((c) => chip(`${c.emoji} ${c.label}`, category === c.id, () => setCategory(c.id), c.id))}
            </ScrollView>
            <Text style={{ paddingHorizontal: spacing.md, fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>
              {rows.length} transaction{rows.length === 1 ? '' : 's'} · {formatCurrency(net)} net
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Empty
            emoji="🔍"
            title="Nothing matches"
            message={transactions.length === 0 ? 'Import or connect an account to see transactions here.' : 'Try a different search or category.'}
          />
        }
        renderItem={({ item }) => <TxRow t={item} onPress={editor.open} />}
      />
      {editor.node}
    </>
  )
}
