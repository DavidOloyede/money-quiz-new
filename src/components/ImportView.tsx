import { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { ColumnMapping, CsvRow, ImportSource } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import { rowsToTransactions } from '@moneyquiz/core/lib/importCsv'
import { newId } from '@moneyquiz/core/lib/id'
import { track } from '../lib/track'
import { SAMPLE_ACCOUNTS, sampleCsv } from '@moneyquiz/core/data/sampleData'
import { TransactionTable } from './TransactionTable'
import { ImportedFiles } from './ImportedFiles'
import { ConnectBank } from './ConnectBank'
import { ColumnMapping as ColumnMappingStep } from './ColumnMapping'
import { CheckIcon, DownloadIcon, ShieldIcon, UploadIcon, XIcon } from './icons'

type Stage = 'idle' | 'mapping'

interface Props {
  onNavigate: (v: 'import' | 'dashboard' | 'quiz' | 'account') => void
}

export function ImportView({ onNavigate }: Props) {
  const {
    transactions,
    hasData,
    mapping,
    sources,
    addImport,
    removeSource,
    syncPlaidSource,
    saveMapping,
    loadSample,
  } = useStore()

  const [stage, setStage] = useState<Stage>('idle')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // Set when someone clicks a source above, so the table below narrows to it.
  const [focusSource, setFocusSource] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null)
    setNotice(null)
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (res) => {
        const fields = (res.meta.fields ?? []).filter((f) => f && f.trim() !== '')
        const data = (res.data as CsvRow[]).filter((r) => r && Object.keys(r).length > 0)
        if (fields.length === 0 || data.length === 0) {
          setError('That file didn’t look like a CSV with a header row. Please try another file.')
          return
        }
        setHeaders(fields)
        setRows(data)
        setFileName(file.name)
        setStage('mapping')
      },
      error: () => setError('Could not read that file. Please try again.'),
    })
  }

  const onConfirmMapping = (m: ColumnMapping) => {
    const sourceId = newId()
    const result = rowsToTransactions(rows, m, { sourceId })
    const source: ImportSource = {
      id: sourceId,
      fileName: fileName || 'Imported file',
      importedAt: new Date().toISOString(),
      accountType: m.accountType ?? 'bank',
      count: result.transactions.length,
      dropped: result.droppedPayments,
    }
    const duplicate = sources.some((s) => s.fileName === source.fileName)
    addImport(result.transactions, source)
    track('import.csv', {
      rows: result.transactions.length,
      dropped: result.droppedPayments,
      skipped: result.skipped,
      accountType: source.accountType,
    })
    saveMapping(m)
    setStage('idle')
    setRows([])
    setHeaders([])
    setNotice(
      `Added ${result.transactions.length} transactions from ${source.fileName}` +
        (result.droppedPayments > 0
          ? ` (${result.droppedPayments} card payment${result.droppedPayments === 1 ? '' : 's'} removed)`
          : '') +
        (result.skipped > 0 ? ` · ${result.skipped} rows skipped` : '') +
        '.' +
        (duplicate ? ' Note: you already imported a file with this name.' : ''),
    )
  }

  // One file per sample account: each has to stand on its own as something a
  // bank would actually hand you, so it re-imports through the normal mapping
  // step (including dropping the card's own payment rows).
  const downloadSample = () => {
    for (const account of SAMPLE_ACCOUNTS) {
      const blob = new Blob([sampleCsv(account.id)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${account.id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">Import transactions</h2>
        <p className="text-sm text-linen-500 dark:text-linen-400">
          Upload one or more bank CSVs — each adds to what&apos;s already here — or load the sample
          data to get started.
        </p>
      </div>

      {/* Privacy banner */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-forest-200 dark:border-forest-500/30 bg-forest-50 dark:bg-forest-500/10 p-4">
        <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" />
        <div className="text-sm text-forest-800 dark:text-forest-300">
          <span className="font-semibold">Your data stays on your device.</span> We never ask for
          bank logins — CSV import runs entirely in your browser, and a bank connection (Plaid) runs
          through a local server you control. Use “Clear all data” anytime to wipe it.
        </div>
      </div>

      <ConnectBank onNavigate={onNavigate} />

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-forest-200 dark:border-forest-500/30 bg-cream dark:bg-linen-900 p-3 text-sm text-forest-700 dark:text-forest-300">
          <CheckIcon className="h-4 w-4 shrink-0" />
          {notice}
          <button
            onClick={() => onNavigate('dashboard')}
            className="ml-auto shrink-0 font-medium text-forest-700 dark:text-forest-300 underline-offset-2 hover:underline"
          >
            View dashboard →
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          <XIcon className="h-4 w-4" />
          {error}
        </div>
      )}

      {stage === 'mapping' ? (
        <ColumnMappingStep
          headers={headers}
          rows={rows}
          initial={mapping}
          onConfirm={onConfirmMapping}
          onCancel={() => {
            setStage('idle')
            setRows([])
            setHeaders([])
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Upload card */}
          <div
            className={`lg:col-span-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-forest-400 bg-forest-50 dark:bg-forest-500/10' : 'border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-900'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFile(file)
            }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 dark:bg-forest-500/10 text-forest-600">
              <UploadIcon className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-semibold text-linen-800 dark:text-linen-100">
              {hasData ? 'Add another CSV' : 'Drop a CSV here'}
            </h3>
            <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">or choose a file from your computer</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
            >
              Choose CSV file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </div>

          {/* Sample card */}
          <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-6">
            <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Just exploring?</h3>
            <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
              Load a year of realistic sample transactions across three accounts — checking,
              savings and a credit card — and try the whole app instantly.
            </p>
            <button
              onClick={() => {
                loadSample()
                setNotice('Loaded the sample dataset.')
                setError(null)
              }}
              className="mt-4 w-full rounded-lg bg-linen-800 dark:bg-linen-700 px-4 py-2 text-sm font-medium text-white hover:bg-linen-900 dark:hover:bg-linen-700"
            >
              Load sample data
            </button>
            <button
              onClick={downloadSample}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-linen-300 dark:border-linen-600 px-4 py-2 text-sm font-medium text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800"
            >
              <DownloadIcon className="h-4 w-4" />
              Download sample CSVs
            </button>
          </div>
        </div>
      )}

      {sources.length > 0 && stage === 'idle' && (
        <div className="mt-6">
          <ImportedFiles
            sources={sources}
            onRemove={removeSource}
            onSync={syncPlaidSource}
            onSelect={setFocusSource}
          />
        </div>
      )}

      {hasData && stage === 'idle' && (
        <div className="mt-6">
          <TransactionTable
            transactions={transactions}
            sources={sources}
            focusSourceId={focusSource}
          />
        </div>
      )}
    </div>
  )
}
