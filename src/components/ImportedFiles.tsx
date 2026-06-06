import { useState } from 'react'
import type { ImportSource } from '../types'
import { LinkIcon, RefreshIcon, TrashIcon, UploadIcon } from './icons'

interface Props {
  sources: ImportSource[]
  onRemove: (sourceId: string) => void
  onSync?: (sourceId: string) => Promise<number> | void
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ImportedFiles({ sources, onRemove, onSync }: Props) {
  const totalTx = sources.reduce((sum, s) => sum + s.count, 0)
  const [syncing, setSyncing] = useState<string | null>(null)

  const sync = async (id: string) => {
    if (!onSync) return
    setSyncing(id)
    try {
      await onSync(id)
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Imported sources</h3>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {sources.length} source{sources.length === 1 ? '' : 's'} · {totalTx} transactions
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {sources.map((s) => {
          const isPlaid = s.kind === 'plaid'
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isPlaid
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isPlaid ? <LinkIcon className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {s.fileName}
                  </span>
                  {isPlaid && (
                    <span className="shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      Connected
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.accountType === 'credit'
                        ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {s.accountType === 'credit' ? 'Credit card' : 'Bank'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {s.count} transaction{s.count === 1 ? '' : 's'}
                  {s.dropped > 0 && ` · ${s.dropped} payment${s.dropped === 1 ? '' : 's'} removed`}
                  {formatWhen(s.importedAt) && ` · ${formatWhen(s.importedAt)}`}
                </div>
              </div>
              {isPlaid && onSync && (
                <button
                  onClick={() => sync(s.id)}
                  disabled={syncing === s.id}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  title="Refresh transactions"
                >
                  <RefreshIcon className={`h-3.5 w-3.5 ${syncing === s.id ? 'animate-spin' : ''}`} />
                  {syncing === s.id ? 'Syncing…' : 'Sync'}
                </button>
              )}
              <button
                onClick={() => onRemove(s.id)}
                className="shrink-0 rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                aria-label={`Remove ${s.fileName}`}
                title={isPlaid ? 'Disconnect and remove its transactions' : 'Remove this file and its transactions'}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
