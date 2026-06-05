import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryTotal } from '../../lib/analysis'
import { CATEGORY_META } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/format'

interface Props {
  data: CategoryTotal[]
  total: number
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: CategoryTotal }[]
  total: number
}

function DonutTooltip({ active, payload, total }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  const pct = total > 0 ? (d.total / total) * 100 : 0
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
      <div className="font-medium text-slate-800">
        {CATEGORY_META[d.category].emoji} {CATEGORY_META[d.category].label}
      </div>
      <div className="text-slate-500">
        {formatCurrency(d.total)} · {formatPercent(pct)}
      </div>
    </div>
  )
}

export function CategoryDonut({ data, total }: Props) {
  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={1.5}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.category} fill={CATEGORY_META[d.category].color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-wide text-slate-400">Spending</span>
        <span className="text-xl font-bold text-slate-800">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
