/**
 * Attempts / best / last quiz stats — the mobile QuizHistory. The day streak
 * is the app's one streak (kept by the daily question), so it matches the
 * flame everywhere else.
 */
import { Text, View } from 'react-native'
import { useStore, type QuizResult } from '@moneyquiz/core'
import { liveStreak } from '@moneyquiz/core/lib/streak'

import { Card } from '@/components/ui'
import { fonts, useAppTheme } from '@/theme'

function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={{ fontFamily: fonts.rounded, fontSize: 20, color: colors.ink }}>{value}</Text>
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
  const { game } = useStore()
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
        <Stat label="Day streak" value={liveStreak(game)} />
      </View>
    </Card>
  )
}
