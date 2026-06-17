import { DailyQuestionCard } from 'money-quiz'

// One question a day — the streak's habit hook. With no transactions loaded it
// shows a general financial-literacy question (the "connect data to
// personalize" state); the card reads the question and streak from the store,
// which the preview's StoreProvider wrapper supplies.
export function Default() {
  return (
    <div className="max-w-md">
      <DailyQuestionCard />
    </div>
  )
}
