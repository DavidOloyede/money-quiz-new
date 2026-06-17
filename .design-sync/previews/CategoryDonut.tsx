import { CategoryDonut } from 'money-quiz'

// recharts animates the donut in from radius 0 over ~1.5s (react-smooth, driven
// by requestAnimationFrame). The static screenshot would otherwise catch it
// mid-tween (an empty/collapsed ring). Inflating the rAF timestamp makes
// react-smooth see the full duration elapsed on its second frame, so the chart
// settles to its final state immediately. Preview-only; the real app animates.
if (typeof window !== 'undefined') {
  const raf = window.requestAnimationFrame.bind(window)
  let skew = 0
  window.requestAnimationFrame = (cb) => raf((t) => cb(t + (skew += 100000)))
}

const data = [
  { category: 'groceries', total: 612, count: 28 },
  { category: 'dining', total: 388, count: 19 },
  { category: 'transport', total: 240, count: 12 },
  { category: 'shopping', total: 196, count: 7 },
  { category: 'utilities', total: 180, count: 4 },
  { category: 'entertainment', total: 132, count: 6 },
]
const total = data.reduce((s, d) => s + d.total, 0)

// The donut as it appears on the dashboard — inside a card, with the total
// in the center. A fixed-width wrapper gives recharts' ResponsiveContainer a
// definite box to measure.
export function Default() {
  return (
    <div style={{ width: 380 }} className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-1 font-semibold text-slate-800">Spending by category</h3>
      <CategoryDonut data={data} total={total} />
    </div>
  )
}
