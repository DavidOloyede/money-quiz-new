import { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { ColumnMapping, CsvRow } from '../types'
import { useStore } from '../store'
import { rowsToTransactions } from '../lib/importCsv'
import { sampleCsv } from '../data/sampleData'
import { TransactionTable } from './TransactionTable'
import { ColumnMapping as ColumnMappingStep } from './ColumnMapping'
import { CheckIcon, DownloadIcon, ShieldIcon, UploadIcon, XIcon } from './icons'

type Stage = 'idle' | 'mapping'

interface Props {
  onNavigate: (v: 'import' | 'dashboard' | 'quiz') => void
}

export function ImportView({ onNavigate }: Props) {
  const {
    transactions,
    hasData,
    mapping,
    importTransactions,
    saveMapping,
    loadSample,
    setCategory,
  } = useStore()

  const [stage, setStage] = useState<Stage>('idle')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
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
    const result = rowsToTransactions(rows, m)
    importTransactions(result.transactions)
    saveMapping(m)
    setStage('idle')
    setRows([])
    setHeaders([])
    setNotice(
      `Imported ${result.transactions.length} transactions from ${fileName}` +
        (result.skipped > 0 ? ` (${result.skipped} rows skipped).` : '.'),
    )
  }

  const downloadSample = () => {
    const blob = new Blob([sampleCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'money-quiz-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Import transactions</h2>
        <p className="text-sm text-slate-500">
          Upload a bank CSV or load the sample data to get started.
        </p>
      </div>

      {/* Privacy banner */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm text-emerald-800">
          <span className="font-semibold">Your data never leaves this browser.</span> We never
          ask for bank logins — import happens entirely on your device, and everything is stored
          locally. Use “Clear all data” anytime to wipe it.
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-700">
          <CheckIcon className="h-4 w-4" />
          {notice}
          <button
            onClick={() => onNavigate('dashboard')}
            className="ml-auto font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            View dashboard →
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
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
              dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white'
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UploadIcon className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-800">Drop a CSV here</h3>
            <p className="mt-1 text-sm text-slate-500">or choose a file from your computer</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
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
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-800">Just exploring?</h3>
            <p className="mt-1 text-sm text-slate-500">
              Load ~60 realistic sample transactions spanning a few months and try the whole app
              instantly.
            </p>
            <button
              onClick={() => {
                loadSample()
                setNotice('Loaded the sample dataset.')
                setError(null)
              }}
              className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Load sample data
            </button>
            <button
              onClick={downloadSample}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <DownloadIcon className="h-4 w-4" />
              Download sample CSV
            </button>
          </div>
        </div>
      )}

      {hasData && stage === 'idle' && (
        <div className="mt-6">
          <TransactionTable transactions={transactions} onSetCategory={setCategory} />
        </div>
      )}
    </div>
  )
}
