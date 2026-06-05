import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: ReactNode
}

export function StatCard({ label, value, sub, accent = 'text-slate-800', icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 truncate">{sub}</div>}
    </div>
  )
}
