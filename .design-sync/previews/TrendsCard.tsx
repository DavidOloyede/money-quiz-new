import { TrendsCard } from 'money-quiz'

// TrendsCard compares the most-recent complete month (the month before today)
// against the average of the three months before it, per category, and
// surfaces the biggest moves; with no moves it renders nothing. The dates are
// built relative to today's local month so the card keeps rendering as the
// calendar moves - fixed dates went blank once they aged out of the window.
// Groceries/dining rise and shopping falls.
function day(monthsAgo: number, dayOfMonth: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, dayOfMonth)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const baseline = [2, 3, 4].flatMap((m) => [
  { id: `g${m}`, date: day(m, 8), description: 'Groceries', amount: -400, category: 'groceries' },
  { id: `d${m}`, date: day(m, 12), description: 'Dining out', amount: -220, category: 'dining' },
  { id: `s${m}`, date: day(m, 20), description: 'Shopping', amount: -260, category: 'shopping' },
  { id: `t${m}`, date: day(m, 22), description: 'Gas', amount: -205, category: 'transport' },
])

const tx = [
  // recent month — elevated groceries & dining, cut-back shopping
  { id: 'c1', date: day(1, 8), description: 'Groceries', amount: -520, category: 'groceries' },
  { id: 'c2', date: day(1, 12), description: 'Dining out', amount: -360, category: 'dining' },
  { id: 'c3', date: day(1, 20), description: 'Shopping', amount: -90, category: 'shopping' },
  { id: 'c4', date: day(1, 22), description: 'Gas', amount: -210, category: 'transport' },
  ...baseline,
]

export function Default() {
  return (
    <div className="max-w-md">
      <TrendsCard transactions={tx} />
    </div>
  )
}
