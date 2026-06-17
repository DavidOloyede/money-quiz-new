import { VerseOfDay } from 'money-quiz'

// The daily scripture banner shown at the top of the dashboard — one verse on
// money, stewardship, or generosity, rotating at local midnight. Takes no
// props; it picks the verse for the current day itself.
export function Default() {
  return (
    <div className="max-w-2xl">
      <VerseOfDay />
    </div>
  )
}
