import type { ImportSource } from '../types'
import { TrashIcon, UploadIcon } from './icons'

interface Props {
  sources: ImportSource[]
  onRemove: (sourceId: string) => void
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

export function ImportedFiles({ sources, onRemove }: Props) {
  const totalTx = sources.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <h3 className="font-semibold text-slate-800">Imported files</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {sources.length} file{sources.length === 1 ? '' : 's'} · {totalTx} transactions
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <UploadIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-700">{s.fileName}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    s.accountType === 'credit'
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {s.accountType === 'credit' ? 'Credit card' : 'Bank'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {s.count} transaction{s.count === 1 ? '' : 's'}
                {s.dropped > 0 && ` · ${s.dropped} payment${s.dropped === 1 ? '' : 's'} removed`}
                {formatWhen(s.importedAt) && ` · ${formatWhen(s.importedAt)}`}
              </div>
            </div>
            <button
              onClick={() => onRemove(s.id)}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${s.fileName}`}
              title="Remove this file and its transactions"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
