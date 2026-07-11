/**
 * The daily-question reminder — a LOCAL scheduled notification (no push
 * server, no APNs): the retention feature the web can't do. The preference
 * is device-specific, so it lives in plain MMKV under a mobile-only key,
 * never in the synced slices.
 */
import * as Notifications from 'expo-notifications'

import { mmkv } from '@/lib/mmkv'

const PREF_KEY = 'moneyquiz.mobile.reminder.v1'

export interface ReminderPref {
  enabled: boolean
  hour: number
  minute: number
}

export const DEFAULT_REMINDER: ReminderPref = { enabled: false, hour: 8, minute: 0 }

// Show reminders as banners even if the app happens to be open at the time.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export function getReminder(): ReminderPref {
  const raw = mmkv.getString(PREF_KEY)
  if (!raw) return DEFAULT_REMINDER
  try {
    return { ...DEFAULT_REMINDER, ...(JSON.parse(raw) as Partial<ReminderPref>) }
  } catch {
    return DEFAULT_REMINDER
  }
}

/**
 * Persist the preference and make the OS schedule match it. Returns an error
 * message when notification permission is refused, null on success.
 */
export async function setReminder(pref: ReminderPref): Promise<string | null> {
  if (pref.enabled) {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') {
      mmkv.set(PREF_KEY, JSON.stringify({ ...pref, enabled: false }))
      return 'Notifications are off for Manna Money in iOS Settings — allow them there first.'
    }
  }
  mmkv.set(PREF_KEY, JSON.stringify(pref))
  await syncSchedule(pref)
  return null
}

/**
 * Re-assert the schedule from the saved preference (called on app start, so
 * a reinstall or OS cleanup can't silently lose the reminder).
 */
export async function ensureReminderScheduled(): Promise<void> {
  const pref = getReminder()
  if (!pref.enabled) return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return
  await syncSchedule(pref)
}

async function syncSchedule(pref: ReminderPref): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!pref.enabled) return
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your daily bread is ready 🍞',
      body: 'One quick question about your money — keep the streak alive.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: pref.hour,
      minute: pref.minute,
    },
  })
}
