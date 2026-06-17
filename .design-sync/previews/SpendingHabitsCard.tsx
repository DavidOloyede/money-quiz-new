import { SpendingHabitsCard } from 'money-quiz'

// Repeat merchants that aren't bills — places you go back to month after month
// with varying amounts. The card takes the precomputed groups directly; a row
// is clickable to drill into the charges (onOpenGroup).
const items = [
  { merchant: 'Amazon', groupKey: 'amazon', keys: ['amazon'], ids: ['a1', 'a2', 'a3'], category: 'shopping', count: 9, months: 3, avgAmount: 41, monthlyEstimate: 123, recurringAmount: 38, day: 12, fixed: false, isRecurringFlagged: false, isSubscription: false, kind: 'habit', lastDate: '2026-06-14' },
  { merchant: 'Starbucks', groupKey: 'starbucks', keys: ['starbucks'], ids: ['s1', 's2'], category: 'dining', count: 14, months: 3, avgAmount: 6.5, monthlyEstimate: 30, recurringAmount: 6, day: 8, fixed: false, isRecurringFlagged: false, isSubscription: false, kind: 'habit', lastDate: '2026-06-18' },
  { merchant: 'Shell', groupKey: 'shell', keys: ['shell'], ids: ['g1', 'g2'], category: 'transport', count: 6, months: 3, avgAmount: 50, monthlyEstimate: 100, recurringAmount: 50, day: 5, fixed: false, isRecurringFlagged: false, isSubscription: false, kind: 'habit', lastDate: '2026-06-19' },
  { merchant: 'CVS Pharmacy', groupKey: 'cvs', keys: ['cvs'], ids: ['p1', 'p2'], category: 'health', count: 5, months: 3, avgAmount: 22, monthlyEstimate: 37, recurringAmount: 20, day: 21, fixed: false, isRecurringFlagged: false, isSubscription: false, kind: 'habit', lastDate: '2026-06-11' },
  { merchant: 'Chipotle', groupKey: 'chipotle', keys: ['chipotle'], ids: ['ch1', 'ch2'], category: 'dining', count: 8, months: 3, avgAmount: 13, monthlyEstimate: 35, recurringAmount: 13, day: 17, fixed: false, isRecurringFlagged: false, isSubscription: false, kind: 'habit', lastDate: '2026-06-17' },
]

export function Default() {
  return (
    <div className="max-w-md">
      <SpendingHabitsCard items={items} onOpenGroup={() => {}} />
    </div>
  )
}
