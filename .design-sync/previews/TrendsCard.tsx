import { TrendsCard } from 'money-quiz'

// TrendsCard compares the most-recent complete month against the average of the
// three months before it, per category, and surfaces the biggest moves. The
// data below spans those months so groceries/dining rise and shopping falls.
// (The "current" month it compares is the month before today.)
const tx = [
  // recent month — elevated groceries & dining, cut-back shopping
  { id: 'c1', date: '2026-05-08', description: 'Groceries', amount: -520, category: 'groceries' },
  { id: 'c2', date: '2026-05-12', description: 'Dining out', amount: -360, category: 'dining' },
  { id: 'c3', date: '2026-05-20', description: 'Shopping', amount: -90, category: 'shopping' },
  { id: 'c4', date: '2026-05-22', description: 'Gas', amount: -210, category: 'transport' },
  // baseline months (averaged)
  { id: 'b1', date: '2026-04-08', description: 'Groceries', amount: -400, category: 'groceries' },
  { id: 'b2', date: '2026-04-12', description: 'Dining out', amount: -220, category: 'dining' },
  { id: 'b3', date: '2026-04-20', description: 'Shopping', amount: -260, category: 'shopping' },
  { id: 'b4', date: '2026-04-22', description: 'Gas', amount: -205, category: 'transport' },
  { id: 'b5', date: '2026-03-08', description: 'Groceries', amount: -400, category: 'groceries' },
  { id: 'b6', date: '2026-03-12', description: 'Dining out', amount: -220, category: 'dining' },
  { id: 'b7', date: '2026-03-20', description: 'Shopping', amount: -260, category: 'shopping' },
  { id: 'b8', date: '2026-03-22', description: 'Gas', amount: -205, category: 'transport' },
  { id: 'b9', date: '2026-02-08', description: 'Groceries', amount: -400, category: 'groceries' },
  { id: 'b10', date: '2026-02-12', description: 'Dining out', amount: -220, category: 'dining' },
  { id: 'b11', date: '2026-02-20', description: 'Shopping', amount: -260, category: 'shopping' },
  { id: 'b12', date: '2026-02-22', description: 'Gas', amount: -205, category: 'transport' },
]

export function Default() {
  return (
    <div className="max-w-md">
      <TrendsCard transactions={tx} />
    </div>
  )
}
