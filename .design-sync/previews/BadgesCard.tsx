import { BadgesCard } from 'money-quiz'

// Earned badge ids -> the ISO date they were earned. Earned badges light up
// (with the date and verse); the rest stay grayed out with their how-to-earn
// hint. Four of the seven earned here.
const earned: Record<string, string> = {
  'first-import': '2026-03-02T10:12:00Z',
  'streak-7': '2026-04-15T08:30:00Z',
  'quiz-perfect': '2026-05-20T18:45:00Z',
  'cheerful-giver': '2026-06-01T12:05:00Z',
}

export function Earned() {
  return (
    <div className="max-w-xl">
      <BadgesCard badges={earned} />
    </div>
  )
}

// A fresh account — nothing earned yet, the whole case grayed out.
export function Empty() {
  return (
    <div className="max-w-xl">
      <BadgesCard badges={{}} />
    </div>
  )
}
