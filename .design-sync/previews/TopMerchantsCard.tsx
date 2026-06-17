import { TopMerchantsCard } from 'money-quiz'

// TopMerchantsCard ranks merchants by total spend from the transactions you
// pass it (alias-folding comes from the store, which the preview's provider
// supplies empty). Repeated merchants so the ranking and the ×counts are real.
const tx = [
  { id: 't1', date: '2026-06-02', description: 'Whole Foods Market', amount: -84.2, category: 'groceries' },
  { id: 't2', date: '2026-06-09', description: 'Whole Foods Market', amount: -112.5, category: 'groceries' },
  { id: 't3', date: '2026-06-16', description: 'Whole Foods Market', amount: -67.3, category: 'groceries' },
  { id: 't4', date: '2026-06-03', description: 'Amazon', amount: -45.99, category: 'shopping' },
  { id: 't5', date: '2026-06-11', description: 'Amazon', amount: -129.0, category: 'shopping' },
  { id: 't6', date: '2026-06-18', description: 'Amazon', amount: -23.5, category: 'shopping' },
  { id: 't7', date: '2026-06-01', description: 'Target', amount: -88.4, category: 'shopping' },
  { id: 't8', date: '2026-06-14', description: 'Target', amount: -34.2, category: 'shopping' },
  { id: 't9', date: '2026-06-05', description: 'Shell', amount: -52.0, category: 'transport' },
  { id: 't10', date: '2026-06-19', description: 'Shell', amount: -48.75, category: 'transport' },
  { id: 't11', date: '2026-06-04', description: 'Chipotle', amount: -13.25, category: 'dining' },
  { id: 't12', date: '2026-06-10', description: 'Chipotle', amount: -14.0, category: 'dining' },
  { id: 't13', date: '2026-06-17', description: 'Chipotle', amount: -12.75, category: 'dining' },
  { id: 't14', date: '2026-06-06', description: 'Starbucks', amount: -6.45, category: 'dining' },
  { id: 't15', date: '2026-06-12', description: 'Starbucks', amount: -5.95, category: 'dining' },
  { id: 't16', date: '2026-06-20', description: 'Starbucks', amount: -7.1, category: 'dining' },
]

export function Default() {
  return (
    <div className="max-w-md">
      <TopMerchantsCard transactions={tx} />
    </div>
  )
}
