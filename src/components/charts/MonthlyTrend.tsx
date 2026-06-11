import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyPoint } from '../../lib/analysis'
import { formatCurrency, formatCurrencyShort, formatMonth } from '../../lib/format'

interface Props {
  data: MonthlyPoint[]
  /** Called with the "YYYY-MM" key when the user clicks a month's bars. */
  onSelectMonth?: (monthKey: string) => void
}

interface TooltipProps {
  active?: boolean
  label?: string | number
  payload?: { name?: string; value?: number; color?: string }[]
}

function TrendTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm text-sm">
      <div className="font-medium text-slate-800 dark:text-slate-100">{formatMonth(String(label))}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: p.color }}
          />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-medium text-slate-700 dark:text-slate-200">
            {formatCurrency(p.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyTrend({ data, onSelectMonth }: Props) {
  return (
    <div className={`h-64 w-full ${onSelectMonth ? 'cursor-pointer' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          onClick={(state) => {
            if (onSelectMonth && state?.activeLabel) onSelectMonth(String(state.activeLabel))
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="monthKey"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => <span className="capitalize text-slate-600 dark:text-slate-300">{v}</span>}
          />
          <Bar dataKey="income" name="income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="spending" name="spending" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
