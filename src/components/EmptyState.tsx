import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message: string
  children?: ReactNode
}

export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-forest-50 dark:bg-forest-500/10 text-forest-600 flex items-center justify-center mb-5">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-linen-800 dark:text-linen-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-linen-500 dark:text-linen-400">{message}</p>
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  )
}
