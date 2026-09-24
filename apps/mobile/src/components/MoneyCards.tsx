/**
 * Budgets and Giving on the phone, now editable: tap a budget to change or
 * remove it, add one for any spending category, and set a monthly giving
 * goal. Going over a budget reads in coral with the amount and a next step,
 * never as an alarm (docs/DESIGN.md: calm at the money).
 */
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useStore, type Category, type Transaction } from '@moneyquiz/core'
import { budgetStatus } from '@moneyquiz/core/lib/analysis'
import { allCategories, categoryLabel, categoryMeta, isSpendingCategory } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatMonth, formatPercent } from '@moneyquiz/core/lib/format'
import { givingGoalStatus, givingStats } from '@moneyquiz/core/lib/giving'

import { Bar, Button, Card, CardTitle, LinkButton, Note } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

function AmountInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder: string
  label: string
  suffix?: string
}) {
  const { colors } = useAppTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 40,
        minWidth: 96,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderStrong,
      }}
    >
      {!suffix && <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.muted }}>$</Text>}
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 8 }}
      />
      {suffix && <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.muted }}>{suffix}</Text>}
    </View>
  )
}

export function BudgetsCard({ monthKey }: { monthKey: string }) {
  const { colors } = useAppTheme()
  const { transactions, budgets, setBudget } = useStore()
  const items = useMemo(() => budgetStatus(transactions, budgets, monthKey), [transactions, budgets, monthKey])
  const [editing, setEditing] = useState<Category | null>(null)
  const [adding, setAdding] = useState(false)
  const [addCat, setAddCat] = useState<Category | null>(null)
  const [draft, setDraft] = useState('')

  const unbudgeted = allCategories().filter((c) => isSpendingCategory(c.id) && !budgets[c.id])
  const amount = () => {
    const n = parseFloat(draft.replace(/[$,]/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const saveEdit = () => {
    const n = amount()
    if (editing && n !== null) setBudget(editing, n)
    setEditing(null)
    setDraft('')
  }
  const saveAdd = () => {
    const n = amount()
    if (addCat && n !== null && n > 0) setBudget(addCat, n)
    setAdding(false)
    setAddCat(null)
    setDraft('')
  }

  return (
    <Card>
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>{formatMonth(monthKey)}</Text>
        }
      >
        Budgets
      </CardTitle>
      {items.length === 0 && !adding && <Note>No budgets yet. A budget is a simple plan for one category each month.</Note>}
      {items.map((b) => {
        const meta = categoryMeta(b.category)
        const over = b.spent - b.budget
        if (editing === b.category) {
          return (
            <View key={b.category} style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
                {meta.emoji} {categoryLabel(b.category)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AmountInput value={draft} onChange={setDraft} onSubmit={saveEdit} placeholder={String(b.budget)} label={`Budget for ${categoryLabel(b.category)}`} />
                </View>
                <Button small title="Save" onPress={saveEdit} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Pressable onPress={() => { setBudget(b.category, 0); setEditing(null) }} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.danger }}>Remove budget</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )
        }
        return (
          <Pressable
            key={b.category}
            onPress={() => {
              setEditing(b.category)
              setDraft(String(b.budget))
              setAdding(false)
            }}
            accessibilityHint="Change or remove this budget"
            style={({ pressed }) => ({ gap: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text style={{ fontSize: 13 }}>{meta.emoji}</Text>
              <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
                {categoryLabel(b.category)}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, fontVariant: ['tabular-nums'], color: colors.muted }}>
                {formatCurrency(b.spent)} of {formatCurrency(b.budget)}
              </Text>
            </View>
            <Bar pct={b.pct} color={b.over ? colors.danger : colors.primary} />
            {b.over && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.danger }}>
                {formatCurrency(over)} over this month. Tap to adjust it.
              </Text>
            )}
          </Pressable>
        )
      })}

      {adding ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>Pick a category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}>
            {unbudgeted.map((c) => {
              const on = addCat === c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setAddCat(c.id)}
                  accessibilityState={{ selected: on }}
                  style={{
                    minHeight: 32,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.sm + 2,
                    borderRadius: radii.pill,
                    borderWidth: on ? 0 : StyleSheet.hairlineWidth,
                    borderColor: colors.borderStrong,
                    backgroundColor: on ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: on ? colors.card : colors.text }}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {addCat && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AmountInput value={draft} onChange={setDraft} onSubmit={saveAdd} placeholder="per month" label="Monthly budget" />
              </View>
              <Button small title="Add" onPress={saveAdd} disabled={!amount()} />
            </View>
          )}
          <Pressable onPress={() => { setAdding(false); setAddCat(null); setDraft('') }} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted }}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        unbudgeted.length > 0 && (
          <View style={{ alignItems: 'flex-start' }}>
            <LinkButton title="Add a budget" onPress={() => { setAdding(true); setEditing(null); setDraft('') }} />
          </View>
        )
      )}
    </Card>
  )
}

export function GivingCard({ filtered, monthKey }: { filtered: Transaction[]; monthKey: string }) {
  const { colors } = useAppTheme()
  const { transactions, givingGoal, setGivingGoal } = useStore()
  const giving = useMemo(() => givingStats(filtered), [filtered])
  const goal = useMemo(
    () => (givingGoal > 0 ? givingGoalStatus(transactions, givingGoal, monthKey) : null),
    [transactions, givingGoal, monthKey],
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const save = () => {
    const pct = parseFloat(draft)
    setGivingGoal(Number.isFinite(pct) && pct > 0 ? pct : 0)
    setEditing(false)
    setDraft('')
  }

  return (
    <Card tone="warm">
      <CardTitle
        right={
          giving.pctOfIncome !== null ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.accentDeep }}>
              {formatPercent(giving.pctOfIncome, 1)} of income
            </Text>
          ) : undefined
        }
      >
        💝 Giving
      </CardTitle>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 24, fontVariant: ['tabular-nums'], color: colors.ink }}>
        {formatCurrency(giving.total)}
      </Text>
      {goal && goal.target > 0 && (
        <View style={{ gap: 3 }}>
          <Bar pct={goal.pct} color={colors.accent} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
            {goal.met
              ? `Goal met for ${formatMonth(monthKey)}: ${formatCurrency(goal.given)} given 🎉`
              : `${formatCurrency(goal.given)} of ${formatCurrency(goal.target)} toward your ${goal.goalPct}% goal this month`}
          </Text>
        </View>
      )}
      {giving.total === 0 && <Note>Nothing given in this range yet. Tithes and charity land here.</Note>}
      {editing ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 110 }}>
              <AmountInput value={draft} onChange={setDraft} onSubmit={save} placeholder="10" label="Giving goal, percent of income" suffix="%" />
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>of income each month</Text>
            <Button small title="Save" onPress={save} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {givingGoal > 0 && (
              <Pressable onPress={() => { setGivingGoal(0); setEditing(false) }} hitSlop={8}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted }}>Clear goal</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setEditing(false)} hitSlop={8}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'flex-start' }}>
          <LinkButton
            title={givingGoal > 0 ? `Change your ${givingGoal}% goal` : 'Set a monthly giving goal'}
            onPress={() => {
              setEditing(true)
              setDraft(givingGoal > 0 ? String(givingGoal) : '10')
            }}
          />
        </View>
      )}
    </Card>
  )
}
