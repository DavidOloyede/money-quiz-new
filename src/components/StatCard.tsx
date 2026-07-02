import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: ReactNode
  /** When set, the card becomes a button (e.g. to drill into its transactions). */
  onClick?: () => void
}

export function StatCard({ label, value, sub, accent = 'text-linen-800 dark:text-linen-100', icon, onClick }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
          {label}
        </span>
        {icon && <span className="text-linen-300">{icon}</span>}
      </div>
      <div className={`mt-1 font-display text-[26px] font-semibold tracking-tight ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-linen-500 dark:text-linen-400 truncate">{sub}</div>}
    </>
  )
  const frame = 'rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-4'

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${frame} w-full text-left transition-colors hover:border-linen-300 dark:hover:border-linen-600 hover:bg-linen-50 dark:hover:bg-linen-800/60`}
        title="See the transactions behind this number"
      >
        {body}
      </button>
    )
  }
  return <div className={frame}>{body}</div>
}
