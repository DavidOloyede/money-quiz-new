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
    <div className="rounded-lg border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 px-3 py-2 shadow-sm text-sm">
      <div className="font-medium text-linen-800 dark:text-linen-100">{formatMonth(String(label))}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-linen-500 dark:text-linen-400">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: p.color }}
          />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-medium text-linen-700 dark:text-linen-200">
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
          {/* Chart chrome reads from --chart-* vars (index.css) so it follows dark mode. */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="monthKey"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => <span className="capitalize text-linen-600 dark:text-linen-300">{v}</span>}
          />
          {/* Income = forest, spending = honey: the CVD-validated series pair (ΔE 23.6). */}
          <Bar dataKey="income" name="income" fill="#2f8749" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="spending" name="spending" fill="#ad720d" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
