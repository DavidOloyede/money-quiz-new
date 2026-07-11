/**
 * Today — the home tab and the daily habit loop: the verse of the day, one
 * question about your money, and your streak/level progress. Works fully
 * offline and before any data is connected.
 */
import { Screen } from '@/components/ui'
import { DailyQuestion } from '@/components/DailyQuestion'
import { ProgressCard } from '@/components/ProgressCard'
import { VerseCard } from '@/components/VerseCard'

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function TodayScreen() {
  return (
    <Screen title="Today" subtitle={todayLabel()}>
      <VerseCard />
      <DailyQuestion />
      <ProgressCard />
    </Screen>
  )
}
