/**
 * Recurring & subscriptions, the phone's version of the web's RecurringCard:
 * expected bills and subscriptions on a month calendar (each day shows what
 * lands), the next few upcoming charges, and the full list with its ★. On
 * the phone a tapped day shows its charges right under the calendar rather
 * than in a popup, so opening a charge never stacks two sheets.
 * Spending *habits* live behind Top merchants' "View all", as on the web.
 */
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStore, type SubscriptionMeta } from '@moneyquiz/core'
import {
  chargesInMonth,
  upcomingCharges,
  type Charge,
  type RecurringPayment,
} from '@moneyquiz/core/lib/analysis'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatCurrencyShort, formatDate } from '@moneyquiz/core/lib/format'

import { MerchantLogo } from '@/components/MerchantLogo'
import { Badge, Card, CardTitle, LinkButton, Note, Segmented } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

type Filter = 'all' | 'subs'

const UPCOMING_LIMIT = 4
const LIST_LIMIT = 8
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A short "when does it bill / has it ended" line for a subscription (same wording as the web). */
function cadenceLine(r: RecurringPayment, meta: SubscriptionMeta | undefined): string {
  const each = r.fixed ? formatCurrency(r.recurringAmount) : `~${formatCurrency(r.avgAmount)}`
  if (meta?.endedDate) return `Ended ${formatDate(meta.endedDate)} · was ${each}`
  if (meta?.cadence === 'annual') {
    return meta.renewalDate ? `Annual · renews ${formatDate(meta.renewalDate)}` : `Annual · ${each}`
  }
  if (meta?.cadence === 'monthly' && meta.billingDay) return `Monthly · charged ~day ${meta.billingDay}`
  return `${each} each · last ${formatDate(r.lastDate)}`
}

export function RecurringCard({
  items,
  onOpen,
}: {
  /** Recurring bill groups (kind 'bill') from the Dashboard's shared pass. */
  items: RecurringPayment[]
  onOpen: (title: string, ids: string[]) => void
}) {
  const { colors } = useAppTheme()
  const { subscriptionMeta, setGroupRecurring } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [day, setDay] = useState<number | null>(null)
  const [allUpcoming, setAllUpcoming] = useState(false)
  const [allRows, setAllRows] = useState(false)
  const now = useMemo(() => new Date(), [])

  const subs = useMemo(() => items.filter((r) => r.isSubscription), [items])
  const shown = filter === 'subs' ? subs : items
  const { monthCharges, upcoming } = useMemo(
    () => ({
      monthCharges: chargesInMonth(shown, subscriptionMeta, now),
      upcoming: upcomingCharges(shown, subscriptionMeta, now),
    }),
    [shown, subscriptionMeta, now],
  )

  if (items.length === 0) return null

  // The subscriptions subtotal leaves out ended ones, as on the web.
  const total =
    filter === 'subs'
      ? subs
          .filter((r) => !r.keys.some((k) => subscriptionMeta[k]?.endedDate))
          .reduce((s, r) => s + r.monthlyEstimate, 0)
      : items.reduce((s, r) => s + r.monthlyEstimate, 0)
  const monthTotal = monthCharges.reduce((s, c) => s + c.amount, 0)
  const dayCharges = day === null ? [] : monthCharges.filter((c) => c.day === day)

  return (
    <Card>
      <CardTitle
        right={
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
            ~{formatCurrency(total)}/mo · {shown.length}
          </Text>
        }
      >
        Recurring & subscriptions
      </CardTitle>
      {subs.length > 0 && (
        <Segmented
          options={[
            { id: 'all', label: 'All' },
            { id: 'subs', label: 'Subscriptions' },
          ]}
          value={filter}
          onChange={(f) => {
            setFilter(f)
            setDay(null)
          }}
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>
          {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
          · {formatCurrency(monthTotal)}
        </Text>
      </View>
      <MiniCalendar
        monthDate={now}
        charges={monthCharges}
        selected={day}
        onSelectDay={(d) => setDay(d === day ? null : d)}
      />
      {day !== null && dayCharges.length > 0 && (
        <View
          style={{
            borderRadius: radii.md,
            backgroundColor: colors.primarySoft,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text style={{ fontFamily: fonts.roundedSemi, fontSize: 13, color: colors.success, paddingTop: 4 }}>
            {MONTHS[now.getMonth()]} {day}
          </Text>
          {dayCharges.map((c) => (
            <ChargeRow key={`${c.groupKey}-${c.date}`} c={c} onOpen={onOpen} />
          ))}
        </View>
      )}

      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text, marginTop: spacing.xs }}>
        Upcoming charges
      </Text>
      {upcoming.length === 0 ? (
        <Note>No charges scheduled. Set a billing day on the web to see one here.</Note>
      ) : (
        <View>
          {(allUpcoming ? upcoming : upcoming.slice(0, UPCOMING_LIMIT)).map((c) => (
            <ChargeRow key={`${c.groupKey}-${c.date}`} c={c} onOpen={onOpen} withDate />
          ))}
          {upcoming.length > UPCOMING_LIMIT && (
            <View style={{ alignItems: 'flex-start', paddingTop: spacing.xs }}>
              <LinkButton
                title={allUpcoming ? 'Show fewer' : `Show all ${upcoming.length}`}
                onPress={() => setAllUpcoming(!allUpcoming)}
              />
            </View>
          )}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text }}>
        All {filter === 'subs' ? 'subscriptions' : 'recurring & subscriptions'}
      </Text>
      <Note>Tap ★ to take one off the list, or a row to see its charges.</Note>
      <View>
        {(allRows ? shown : shown.slice(0, LIST_LIMIT)).map((r) => {
          const meta = r.keys.map((k) => subscriptionMeta[k]).find(Boolean)
          const billDay = r.keys.map((k) => subscriptionMeta[k]?.billingDay).find(Boolean)
          const ended = !!meta?.endedDate
          return (
            <Pressable
              key={r.groupKey}
              onPress={() => onOpen(r.merchant, r.ids)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Pressable
                onPress={() => setGroupRecurring(r.ids, !r.isRecurringFlagged)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={r.isRecurringFlagged ? `Unflag ${r.merchant}` : `Flag ${r.merchant} as recurring`}
              >
                <Ionicons
                  name={r.isRecurringFlagged ? 'star' : 'star-outline'}
                  size={18}
                  color={r.isRecurringFlagged ? colors.accent : colors.faint}
                />
              </Pressable>
              <MerchantLogo brand={r.brand} logoUrl={r.logoUrl} fallback={categoryMeta(r.category).emoji} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      flexShrink: 1,
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: ended ? colors.faint : colors.ink,
                      textDecorationLine: ended ? 'line-through' : 'none',
                    }}
                  >
                    {r.merchant}
                  </Text>
                  {r.isSubscription && <Badge label="sub" />}
                </View>
                <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
                  {r.isSubscription
                    ? cadenceLine(r, meta)
                    : `${r.fixed ? `Same charge · ${formatCurrency(r.recurringAmount)} each` : `Varies · avg of ${r.count} over ${r.months} mo`}${billDay ? ` · ~day ${billDay}` : ''}`}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: colors.ink }}>
                {formatCurrency(r.monthlyEstimate)}
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>/mo</Text>
              </Text>
            </Pressable>
          )
        })}
        {shown.length > LIST_LIMIT && (
          <View style={{ alignItems: 'flex-start', paddingTop: spacing.xs }}>
            <LinkButton
              title={allRows ? 'Show fewer' : `Show all ${shown.length}`}
              onPress={() => setAllRows(!allRows)}
            />
          </View>
        )}
      </View>
    </Card>
  )
}

/** A compact month grid; days with a charge are tinted, show the day's total, and can be tapped. */
function MiniCalendar({
  monthDate,
  charges,
  selected,
  onSelectDay,
}: {
  monthDate: Date
  charges: Charge[]
  selected: number | null
  onSelectDay: (day: number) => void
}) {
  const { colors } = useAppTheme()
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const today = monthDate.getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  const byDay = new Map<number, number>()
  for (const c of charges) byDay.set(c.day, (byDay.get(c.day) ?? 0) + c.amount)

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={i}
            style={{ flex: 1, textAlign: 'center', fontFamily: fonts.sansMedium, fontSize: 11, color: colors.faint }}
          >
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
          {week.map((d, i) => {
            if (d === null) return <View key={i} style={{ flex: 1 }} />
            const amount = byDay.get(d)
            const has = amount !== undefined
            return (
              <Pressable
                key={i}
                disabled={!has}
                onPress={() => onSelectDay(d)}
                accessibilityLabel={has ? `${MONTHS[month]} ${d}, ${formatCurrency(amount)} due` : undefined}
                style={{
                  flex: 1,
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: has ? colors.primarySoft : 'transparent',
                  borderWidth: d === today || d === selected ? 1.5 : 0,
                  borderColor: d === selected ? colors.success : colors.primary,
                }}
              >
                <Text
                  style={{
                    fontFamily: d === today ? fonts.sansSemiBold : fonts.sans,
                    fontSize: 13,
                    color: has ? colors.success : colors.faint,
                  }}
                >
                  {d}
                </Text>
                {has && (
                  <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemiBold, fontSize: 9, color: colors.success }}>
                    {formatCurrencyShort(amount)}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function ChargeRow({
  c,
  onOpen,
  withDate,
}: {
  c: Charge
  onOpen: (title: string, ids: string[]) => void
  withDate?: boolean
}) {
  const { colors } = useAppTheme()
  const d = new Date(`${c.date}T00:00:00`)
  return (
    <Pressable
      onPress={() => onOpen(c.merchant, c.ids)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {withDate && (
        <View
          style={{
            width: 36,
            alignItems: 'center',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 9, color: colors.info }}>
            {MONTHS[d.getMonth()].toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink }}>{d.getDate()}</Text>
        </View>
      )}
      <MerchantLogo brand={c.brand} logoUrl={c.logoUrl} size="sm" fallback={categoryMeta(c.category).emoji} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>
            {c.merchant}
          </Text>
          {c.isSubscription && <Badge label="sub" />}
        </View>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
          {c.cadence === 'annual' ? 'Annual renewal' : 'Monthly'}
          {!c.fixed && ' · estimate'}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: colors.ink }}>
        {!c.fixed && '~'}
        {formatCurrency(c.amount)}
      </Text>
    </Pressable>
  )
}
