import { MonthlyTrend } from 'money-quiz'

// recharts animates the bars up from zero (react-smooth / requestAnimationFrame).
// Inflate the rAF timestamp so the animation reads as fully elapsed on its
// second frame and the static screenshot shows settled bars. Preview-only.
if (typeof window !== 'undefined') {
  const raf = window.requestAnimationFrame.bind(window)
  let skew = 0
  window.requestAnimationFrame = (cb) => raf((t) => cb(t + (skew += 100000)))
}

const data = [
  { monthKey: '2026-01', spending: 3120, income: 4200, net: 1080 },
  { monthKey: '2026-02', spending: 3580, income: 4200, net: 620 },
  { monthKey: '2026-03', spending: 2960, income: 4400, net: 1440 },
  { monthKey: '2026-04', spending: 3340, income: 4200, net: 860 },
  { monthKey: '2026-05', spending: 3010, income: 4796, net: 1786 },
  { monthKey: '2026-06', spending: 3512, income: 4796, net: 1284 },
]

// Income vs spending per month, with the legend and axes — inside a card and a
// fixed-width wrapper so recharts' ResponsiveContainer has a box to measure.
export function Default() {
  return (
    <div style={{ width: 560 }} className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-1 font-semibold text-slate-800">Income vs spending</h3>
      <MonthlyTrend data={data} />
    </div>
  )
}
