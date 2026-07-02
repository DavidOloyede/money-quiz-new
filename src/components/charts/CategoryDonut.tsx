import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryTotal } from '@moneyquiz/core/lib/analysis'
import type { Category } from '@moneyquiz/core/types'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatPercent } from '@moneyquiz/core/lib/format'

interface Props {
  data: CategoryTotal[]
  total: number
  onSelect?: (category: Category) => void
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
    <div className="rounded-lg border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 px-3 py-2 shadow-sm text-sm">
      <div className="font-medium text-linen-800 dark:text-linen-100">
        {categoryMeta(d.category).emoji} {categoryMeta(d.category).label}
      </div>
      <div className="text-linen-500 dark:text-linen-400">
        {formatCurrency(d.total)} · {formatPercent(pct)}
      </div>
    </div>
  )
}

export function CategoryDonut({ data, total, onSelect }: Props) {
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
            onClick={onSelect ? (d) => onSelect((d as CategoryTotal).category) : undefined}
            className={onSelect ? 'cursor-pointer focus:outline-none' : undefined}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={categoryMeta(d.category).color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-wide text-linen-400 dark:text-linen-500">Spending</span>
        <span className="font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
