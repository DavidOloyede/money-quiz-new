import { useMemo, useState } from 'react'
import type { SubscriptionMeta } from '../types'
import { chargesInMonth, upcomingCharges, type Charge, type RecurringPayment } from '../lib/analysis'
import { categoryMeta } from '../lib/categories'
import { formatCurrency, formatCurrencyShort, formatDate } from '../lib/format'
import { useStore } from '../store'
import { StarIcon, XIcon } from './icons'

interface Props {
  /** Recurring bill groups, precomputed by Dashboard's shared recurringPayments pass. */
  items: RecurringPayment[]
  onOpenGroup: (ids: string[]) => void
}

type View = 'all' | 'subs'

/** How many upcoming charges to show inline before the rest move into a popup. */
const UPCOMING_LIMIT = 4

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A list of charges shown in a popup, with a heading. */
interface Popup {
  title: string
  charges: Charge[]
}

/** A short "when does it bill / has it ended" line for a subscription. */
function cadenceLine(r: RecurringPayment, meta: SubscriptionMeta | undefined): string {
  const each = r.fixed ? formatCurrency(r.recurringAmount) : `~${formatCurrency(r.avgAmount)}`
  if (meta?.endedDate) return `Ended ${formatDate(meta.endedDate)} · was ${each}`
  if (meta?.cadence === 'annual') {
    return meta.renewalDate ? `Annual · renews ${formatDate(meta.renewalDate)}` : `Annual · ${each}`
  }
  if (meta?.cadence === 'monthly' && meta.billingDay) return `Monthly · charged ~day ${meta.billingDay}`
  return `${each} each · last ${formatDate(r.lastDate)}`
}

/**
 * The expected repeats — subscriptions and recurring bills — laid out on a
 * month calendar so you can see when charges land. A calendar grid marks the
 * charge days; beside it, the next few upcoming charges (a day's charges, or the
 * full upcoming run, open in a popup so the card layout stays put). Below, the
 * full list of every recurring group is kept so you can still open any one to
 * rename it or edit its billing date. Repeat spending *habits* (Amazon,
 * pharmacy runs) live in the Spending habits card.
 */
export function RecurringCard({ items, onOpenGroup }: Props) {
  const { subscriptionMeta, setGroupRecurring } = useStore()
  const [view, setView] = useState<View>('all')
  const [popup, setPopup] = useState<Popup | null>(null)

  const now = useMemo(() => new Date(), [])

  const subs = useMemo(() => items.filter((r) => r.isSubscription), [items])
  const shown = view === 'subs' ? subs : items

  const { monthCharges, upcoming } = useMemo(() => {
    const src = view === 'subs' ? items.filter((r) => r.isSubscription) : items
    return {
      monthCharges: chargesInMonth(src, subscriptionMeta, now),
      upcoming: upcomingCharges(src, subscriptionMeta, now),
    }
  }, [items, view, subscriptionMeta, now])

  if (items.length === 0) return null

  // Monthly totals — the subscriptions subtotal leaves out ended ones.
  const allTotal = items.reduce((s, r) => s + r.monthlyEstimate, 0)
  const subsTotal = subs
    .filter((r) => !r.keys.some((k) => subscriptionMeta[k]?.endedDate))
    .reduce((s, r) => s + r.monthlyEstimate, 0)
  const total = view === 'subs' ? subsTotal : allTotal

  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const switchView = (v: View) => {
    setView(v)
    setPopup(null)
  }

  // Opening a group closes the popup first, so the detail modal isn't buried.
  const openGroup = (ids: string[]) => {
    setPopup(null)
    onOpenGroup(ids)
  }
  // Clicking a day reveals its charges in a popup rather than reflowing the card.
  const openDay = (day: number) => {
    const dayCharges = monthCharges.filter((c) => c.day === day)
    if (dayCharges.length > 0) setPopup({ title: `${MONTHS[now.getMonth()]} ${day}`, charges: dayCharges })
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recurring &amp; subscriptions</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ~{formatCurrency(total)}/mo · {shown.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your expected bills and subscriptions on a calendar. Pick a day to see what&apos;s due, or open
        any row below to rename it, set its category, or edit its billing date.
      </p>

      {subs.length > 0 && (
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
          {(['all', 'subs'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                view === v
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {v === 'all' ? 'All' : 'Subscriptions'}
            </button>
          ))}
        </div>
      )}

      {/* Calendar (wider) + upcoming list, side by side. */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{monthLabel}</div>
          <MiniCalendar monthDate={now} charges={monthCharges} today={now.getDate()} onSelectDay={openDay} />
        </div>

        <div className="min-w-0 lg:col-span-2">
          <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Upcoming charges</div>
          {upcoming.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
              No charges scheduled. Set a billing day on a recurring item to see it here.
            </p>
          ) : (
            <>
              <ul className="space-y-1">
                {upcoming.slice(0, UPCOMING_LIMIT).map((c) => (
                  <li key={`${c.groupKey}-${c.date}`}>
                    <ChargeRow charge={c} onOpen={openGroup} />
                  </li>
                ))}
              </ul>
              {upcoming.length > UPCOMING_LIMIT && (
                <button
                  onClick={() => setPopup({ title: 'Upcoming charges', charges: upcoming })}
                  className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Show all {upcoming.length}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full list — every recurring group, still tappable to edit dates. */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          All {view === 'subs' ? 'subscriptions' : 'recurring & subscriptions'}
        </div>
        {shown.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
            No subscriptions yet. Set a charge&apos;s category to{' '}
            <span className="font-medium">Subscriptions</span> to track it here, with its cadence and
            charge date.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {shown.slice(0, 10).map((r) => {
              const meta = r.keys.map((k) => subscriptionMeta[k]).find(Boolean)
              const day = r.keys.map((k) => subscriptionMeta[k]?.billingDay).find(Boolean)
              const ended = !!meta?.endedDate
              return (
                <li key={r.groupKey}>
                  <button
                    onClick={() => onOpenGroup(r.ids)}
                    className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        setGroupRecurring(r.ids, !r.isRecurringFlagged)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          setGroupRecurring(r.ids, !r.isRecurringFlagged)
                        }
                      }}
                      title={r.isRecurringFlagged ? 'Unflag recurring' : 'Flag as recurring'}
                      className={`shrink-0 rounded-md p-1 transition-colors ${
                        r.isRecurringFlagged
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'
                      }`}
                    >
                      <StarIcon className="h-4 w-4" filled={r.isRecurringFlagged} />
                    </span>
                    <span aria-hidden>{categoryMeta(r.category).emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`truncate text-sm font-medium ${
                            ended
                              ? 'text-slate-400 line-through dark:text-slate-500'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {r.merchant}
                        </span>
                        {r.isSubscription && (
                          <span className="shrink-0 rounded bg-violet-100 dark:bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                            sub
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {r.isSubscription ? (
                          cadenceLine(r, meta)
                        ) : (
                          <>
                            {r.fixed ? (
                              <>Same charge · {formatCurrency(r.recurringAmount)} each</>
                            ) : (
                              <>
                                Varies · avg of {r.count} over {r.months} mo
                              </>
                            )}
                            {day ? <span> · ~day {day}</span> : null}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {formatCurrency(r.monthlyEstimate)}
                      <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {popup && <ChargePopup title={popup.title} charges={popup.charges} onOpen={openGroup} onClose={() => setPopup(null)} />}
    </div>
  )
}

/** A compact month grid; days with a charge are tinted and clickable. */
function MiniCalendar({
  monthDate,
  charges,
  today,
  onSelectDay,
}: {
  monthDate: Date
  charges: Charge[]
  today: number
  onSelectDay: (day: number) => void
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  const byDay = new Map<number, Charge[]>()
  for (const c of charges) {
    const arr = byDay.get(c.day) ?? []
    arr.push(c)
    byDay.set(c.day, arr)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase text-slate-400 dark:text-slate-500">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const dayCharges = byDay.get(d)
          const has = !!dayCharges
          const isToday = d === today
          // Day total alongside the count, e.g. "5 · $178" (or just "$55" for one).
          const dayTotal = dayCharges?.reduce((s, c) => s + c.amount, 0) ?? 0
          const dayLabel =
            dayCharges && dayCharges.length > 1
              ? `${dayCharges.length} · ${formatCurrencyShort(dayTotal)}`
              : formatCurrencyShort(dayTotal)
          return (
            <button
              key={i}
              disabled={!has}
              onClick={() => onSelectDay(d)}
              title={
                has ? dayCharges!.map((c) => `${c.merchant} · ${formatCurrency(c.amount)}`).join('\n') : undefined
              }
              className={`relative flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                has
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
                  : 'text-slate-400 dark:text-slate-600'
              } ${isToday ? 'ring-1 ring-emerald-500' : ''}`}
            >
              <span className={isToday && !has ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}>{d}</span>
              {has && (
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="whitespace-nowrap">{dayLabel}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** One upcoming-charge row: date chip, merchant, cadence, amount. */
function ChargeRow({ charge: c, onOpen }: { charge: Charge; onOpen: (ids: string[]) => void }) {
  return (
    <button
      onClick={() => onOpen(c.ids)}
      className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <DateBadge date={c.date} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>{categoryMeta(c.category).emoji}</span>
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{c.merchant}</span>
          {c.isSubscription && (
            <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              sub
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {c.cadence === 'annual' ? 'Annual renewal' : 'Monthly'}
          {!c.fixed && ' · estimate'}
        </div>
      </div>
      <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
        {!c.fixed && '~'}
        {formatCurrency(c.amount)}
      </span>
    </button>
  )
}

/** A day's charges, or the full upcoming run, shown over the card. */
function ChargePopup({
  title,
  charges,
  onOpen,
  onClose,
}: {
  title: string
  charges: Charge[]
  onOpen: (ids: string[]) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
          {charges.map((c) => (
            <li key={`${c.groupKey}-${c.date}`}>
              <ChargeRow charge={c} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Little month/day chip shown next to an upcoming charge. */
function DateBadge({ date }: { date: string }) {
  const month = MONTHS[Number(date.slice(5, 7)) - 1]
  const day = Number(date.slice(8, 10))
  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
      <span className="text-[10px] font-semibold uppercase leading-none text-rose-500 dark:text-rose-400">
        {month}
      </span>
      <span className="text-sm font-semibold leading-tight text-slate-700 dark:text-slate-200">{day}</span>
    </span>
  )
}
