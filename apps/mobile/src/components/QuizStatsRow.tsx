/**
 * Attempts / best / last quiz stats — the mobile QuizHistory. The day-streak
 * stat mirrors the web's calculation (UTC-day set walk).
 */
import { Text, View } from 'react-native'
import type { QuizResult } from '@moneyquiz/core'

import { Card } from '@/components/ui'
import { fonts, useAppTheme } from '@/theme'

function dayStreak(history: QuizResult[]): number {
  if (history.length === 0) return 0
  const days = new Set(history.map((h) => h.at.slice(0, 10)))
  const d = new Date()
  const today = d.toISOString().slice(0, 10)
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1)
  let streak = 0
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (!days.has(key)) break
    streak++
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return streak
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{value}</Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: colors.faint,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

export function QuizStatsRow({ history }: { history: QuizResult[] }) {
  if (history.length === 0) return null
  const attempts = history.length
  const bestPct = Math.round(
    Math.max(...history.map((h) => (h.total ? h.correct / h.total : 0))) * 100,
  )
  const last = history[attempts - 1]
  const lastPct = Math.round(last.total ? (last.correct / last.total) * 100 : 0)

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <Stat label="Attempts" value={attempts} />
        <Stat label="Best" value={`${bestPct}%`} />
        <Stat label="Last" value={`${lastPct}%`} />
        <Stat label="Day streak" value={dayStreak(history)} />
      </View>
    </Card>
  )
}
