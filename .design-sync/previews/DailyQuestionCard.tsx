import { DailyQuestionCard } from 'money-quiz'

// One question a day — the streak's habit hook. With no transactions loaded it
// shows a general financial-literacy question (the "connect data to
// personalize" state); the card reads the question and streak from the store,
// which the preview's StoreProvider wrapper supplies.
//
// Only answering this card counts the day, so a fresh store reads a 0-day
// streak. Seed a 12-day streak last counted YESTERDAY (on the viewer's own
// clock, not UTC) before the StoreProvider mounts: the card then shows the
// morning state it's built for - a live streak with the flame grey until
// today's answer.
if (typeof window !== 'undefined') {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  window.localStorage.setItem(
    'moneyquiz.game.v1',
    JSON.stringify({ xp: 750, streak: 12, bestStreak: 18, lastActiveDay: yesterday, badges: {} }),
  )
}

export function Default() {
  return (
    <div className="max-w-md">
      <DailyQuestionCard />
    </div>
  )
}
