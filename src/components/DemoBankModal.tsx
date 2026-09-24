import { useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import type { CsvRow, ImportSource, Transaction } from '@moneyquiz/core/types'
import { useStore } from '@moneyquiz/core/store'
import {
  DEMO_INSTITUTIONS,
  demoCsv,
  demoCsvFileName,
  type DemoInstitution,
} from '@moneyquiz/core/data/demoBanks'
import { detectBankFormat } from '@moneyquiz/core/lib/bankFormats'
import { guessAccountType, guessMapping, rowsToTransactions } from '@moneyquiz/core/lib/importCsv'
import { newId } from '@moneyquiz/core/lib/id'
import { downloadText } from '../lib/exportData'
import { track } from '../lib/track'
import { MerchantLogo } from './MerchantLogo'
import { CheckIcon, ChevronRightIcon, DownloadIcon, SearchIcon, ShieldIcon, UploadIcon, XIcon } from './icons'

/**
 * "Try a demo bank": walks through linking a bank the way Plaid does (pick
 * your bank, sign in, choose accounts, wait while it connects) without Plaid,
 * a server or an account. Underneath, each account is a CSV in that bank's
 * real layout (core data/demoBanks), so what lands on the dashboard went
 * through the same importer an uploaded file does.
 *
 * For demos with realistic data, "use your own file" feeds a CSV the presenter
 * exported into the same flow, so it still appears as a connected bank.
 */

type Step =
  | { kind: 'pick' }
  | { kind: 'signin'; inst: DemoInstitution }
  | { kind: 'accounts'; inst: DemoInstitution }
  | { kind: 'connecting'; inst: DemoInstitution }
  | { kind: 'done'; inst: DemoInstitution; accounts: number; count: number }

/** A presenter's own CSV, already read, waiting for the "connecting" beat. */
interface OwnFile {
  source: ImportSource
  transactions: Transaction[]
}

const STAGES = [
  (bank: string) => `Connecting securely to ${bank}…`,
  () => 'Fetching 12 months of transactions…',
  () => 'Sorting them into categories…',
]
const STAGE_MS = 650

interface Props {
  onClose: () => void
  onViewDashboard?: () => void
}

function BankMark({ inst, size = 'md' }: { inst: DemoInstitution; size?: 'md' | 'lg' }) {
  if (inst.brand) return <MerchantLogo brand={inst.brand} size={size === 'lg' ? 'lg' : 'md'} />
  // No bundled logo for this bank: its initial on its own brand colour.
  const box = size === 'lg' ? 'h-12 w-12 rounded-xl text-lg' : 'h-6 w-6 rounded-md text-xs'
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center font-rounded font-extrabold text-white ${box}`}
      style={{ backgroundColor: `#${inst.color}` }}
    >
      {inst.name.charAt(0)}
    </span>
  )
}

export function DemoBankModal({ onClose, onViewDashboard }: Props) {
  const { connectDemoAccounts, addImport } = useStore()
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const ownFile = useRef<OwnFile | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const busy = step.kind === 'connecting'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  // The "connecting" beat: a few staged messages, then the actual import.
  useEffect(() => {
    if (step.kind !== 'connecting') return
    setStage(0)
    const timers = STAGES.slice(1).map((_, i) => window.setTimeout(() => setStage(i + 1), STAGE_MS * (i + 1)))
    const finish = window.setTimeout(() => {
      const own = ownFile.current
      let count: number
      let accounts: number
      if (own) {
        addImport(own.transactions, own.source)
        count = own.transactions.length
        accounts = 1
      } else {
        count = connectDemoAccounts([...selected])
        accounts = selected.size
      }
      track('demo.connect', { own: !!own, accounts, count })
      ownFile.current = null
      setStep({ kind: 'done', inst: step.inst, accounts, count })
    }, STAGE_MS * STAGES.length)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(finish)
    }
    // Runs once per entry into the connecting step; `selected` is fixed by then.
  }, [step.kind])

  const choose = (inst: DemoInstitution) => {
    setSelected(new Set(inst.accounts.map((a) => a.id)))
    setError(null)
    setStep({ kind: 'signin', inst })
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const downloadAll = (inst: DemoInstitution) => {
    for (const a of inst.accounts) downloadText(demoCsvFileName(a.id), demoCsv(a.id), 'text/csv;charset=utf-8')
  }

  const readOwnFile = (inst: DemoInstitution, file: File) => {
    setError(null)
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((f) => f && f.trim() !== '')
        const rows = (res.data as CsvRow[]).filter((r) => r && Object.keys(r).length > 0)
        // A recognised bank layout reads exactly; anything else gets the
        // same best guess the regular import starts from.
        const mapping = detectBankFormat(headers)?.mapping ?? {
          ...guessMapping(headers),
          accountType: guessAccountType(headers, rows),
        }
        const sourceId = newId()
        const result = rowsToTransactions(rows, mapping, { sourceId })
        if (result.transactions.length === 0) {
          setError(
            'We couldn’t find transactions in that file. The regular CSV import lets you pick the columns yourself.',
          )
          return
        }
        ownFile.current = {
          transactions: result.transactions,
          source: {
            id: sourceId,
            fileName: `${inst.name} · ${file.name.replace(/\.csv$/i, '')}`,
            importedAt: new Date().toISOString(),
            accountType: mapping.accountType ?? 'bank',
            count: result.transactions.length,
            dropped: result.droppedPayments,
            kind: 'plaid',
            institution: inst.name,
            demo: {},
          },
        }
        setStep({ kind: 'connecting', inst })
      },
      error: () => setError('Could not read that file. Please try again.'),
    })
  }

  const q = query.trim().toLowerCase()
  const banks = q ? DEMO_INSTITUTIONS.filter((i) => i.name.toLowerCase().includes(q)) : DEMO_INSTITUTIONS

  const back =
    step.kind === 'signin'
      ? () => setStep({ kind: 'pick' })
      : step.kind === 'accounts'
        ? () => setStep({ kind: 'signin', inst: step.inst })
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-linen-900/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-cream shadow-xl dark:bg-linen-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Connect a demo bank"
      >
        <div className="flex items-center gap-2 border-b border-linen-100 px-4 py-3 dark:border-linen-800">
          {back ? (
            <button
              onClick={back}
              aria-label="Back"
              className="rounded-lg p-1.5 text-linen-500 hover:bg-linen-100 dark:text-linen-400 dark:hover:bg-linen-800"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </button>
          ) : (
            <span className="w-7" />
          )}
          <span className="flex-1 text-center">
            <span className="rounded-full bg-honey-50 px-2 py-0.5 text-[11px] font-medium text-honey-700 dark:bg-honey-500/10 dark:text-honey-300">
              Demo connection · nothing leaves this device
            </span>
          </span>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-linen-500 hover:bg-linen-100 disabled:opacity-40 dark:text-linen-400 dark:hover:bg-linen-800"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step.kind === 'pick' && (
            <>
              <h2 className="font-display text-lg font-semibold text-linen-800 dark:text-linen-100">Select your bank</h2>
              <p className="mt-0.5 text-sm text-linen-500 dark:text-linen-400">
                Each one holds a year of made-up transactions for Jordan, our sample saver.
              </p>
              <label className="relative mt-4 block">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linen-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search banks"
                  autoFocus
                  className="w-full rounded-lg border border-linen-300 bg-cream py-2 pl-9 pr-3 text-sm text-linen-700 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/25 dark:border-linen-600 dark:bg-linen-800 dark:text-linen-200"
                />
              </label>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {banks.map((inst) => (
                  <li key={inst.id}>
                    <button
                      onClick={() => choose(inst)}
                      className="flex w-full items-center gap-3 rounded-xl border border-linen-200 p-3 text-left transition-colors hover:border-forest-400 hover:bg-forest-50 dark:border-linen-700 dark:hover:bg-forest-500/10"
                    >
                      <BankMark inst={inst} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-linen-800 dark:text-linen-100">
                          {inst.name}
                        </span>
                        <span className="block text-xs text-linen-500 dark:text-linen-400">
                          {inst.accounts.length} account{inst.accounts.length === 1 ? '' : 's'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {banks.length === 0 && (
                <p className="mt-4 text-center text-sm text-linen-500 dark:text-linen-400">
                  No demo bank by that name. Try Chase, Citi or Ally.
                </p>
              )}
            </>
          )}

          {step.kind === 'signin' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep({ kind: 'accounts', inst: step.inst })
              }}
            >
              <div className="flex flex-col items-center text-center">
                <BankMark inst={step.inst} size="lg" />
                <h2 className="mt-3 font-display text-lg font-semibold text-linen-800 dark:text-linen-100">
                  Sign in to {step.inst.name}
                </h2>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
                With a real bank, this step happens inside Plaid’s window and the app never sees your
                password. Here there’s no bank at all, so the details are filled in for you.
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
                  Username
                </span>
                <input
                  defaultValue="jordan.avery"
                  autoComplete="off"
                  className="w-full rounded-lg border border-linen-300 bg-cream px-3 py-2 text-sm text-linen-700 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/25 dark:border-linen-600 dark:bg-linen-800 dark:text-linen-200"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-linen-400 dark:text-linen-500">
                  Password
                </span>
                <input
                  type="password"
                  defaultValue="demo-only"
                  autoComplete="off"
                  className="w-full rounded-lg border border-linen-300 bg-cream px-3 py-2 text-sm text-linen-700 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/25 dark:border-linen-600 dark:bg-linen-800 dark:text-linen-200"
                />
              </label>
              <button
                type="submit"
                autoFocus
                className="mt-5 w-full rounded-lg bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
              >
                Sign in
              </button>
            </form>
          )}

          {step.kind === 'accounts' && (
            <>
              <h2 className="font-display text-lg font-semibold text-linen-800 dark:text-linen-100">
                Choose accounts to share
              </h2>
              <p className="mt-0.5 text-sm text-linen-500 dark:text-linen-400">
                Manna Money will read transactions from the accounts you pick.
              </p>
              <ul className="mt-4 space-y-2">
                {step.inst.accounts.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-linen-200 p-3 hover:bg-linen-50 dark:border-linen-700 dark:hover:bg-linen-800/60">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="h-4 w-4 accent-forest-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-linen-800 dark:text-linen-100">
                            {a.name} <span className="tabular-nums text-linen-400">••{a.mask}</span>
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              a.accountType === 'credit'
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                                : 'bg-linen-100 text-linen-600 dark:bg-linen-800 dark:text-linen-300'
                            }`}
                          >
                            {a.accountType === 'credit' ? 'Credit card' : 'Bank'}
                          </span>
                        </span>
                        <span className="block text-xs text-linen-500 dark:text-linen-400">{a.blurb}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setStep({ kind: 'connecting', inst: step.inst })}
                disabled={selected.size === 0}
                className="mt-5 w-full rounded-lg bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50"
              >
                {selected.size === 0
                  ? 'Pick at least one account'
                  : `Connect ${selected.size} account${selected.size === 1 ? '' : 's'}`}
              </button>

              <div className="mt-4 border-t border-linen-100 pt-4 text-xs text-linen-500 dark:border-linen-800 dark:text-linen-400">
                <p className="mb-2">Demoing with real numbers, or showing the file route?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-linen-300 px-3 py-1.5 font-medium text-linen-600 hover:bg-linen-50 dark:border-linen-600 dark:text-linen-300 dark:hover:bg-linen-800"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    Use my own {step.inst.name} CSV
                  </button>
                  <button
                    onClick={() => downloadAll(step.inst)}
                    className="flex items-center gap-1.5 rounded-lg border border-linen-300 px-3 py-1.5 font-medium text-linen-600 hover:bg-linen-50 dark:border-linen-600 dark:text-linen-300 dark:hover:bg-linen-800"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download these as CSV
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) readOwnFile(step.inst, file)
                    e.target.value = ''
                  }}
                />
                {error && (
                  <p className="mt-3 flex items-start gap-1.5 text-coral-700 dark:text-coral-300">
                    <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
            </>
          )}

          {step.kind === 'connecting' && (
            <div className="flex flex-col items-center py-8 text-center" aria-live="polite">
              <div className="relative">
                <BankMark inst={step.inst} size="lg" />
                <span className="absolute -inset-2 animate-spin rounded-2xl border-2 border-forest-200 border-t-forest-600 motion-reduce:animate-none dark:border-forest-500/20 dark:border-t-forest-400" />
              </div>
              <p className="mt-6 text-sm font-medium text-linen-700 dark:text-linen-200">
                {STAGES[stage](step.inst.name)}
              </p>
              <p className="mt-1 text-xs text-linen-400 dark:text-linen-500">
                Step {stage + 1} of {STAGES.length}
              </p>
            </div>
          )}

          {step.kind === 'done' && (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-600 dark:bg-forest-500/10">
                <CheckIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-3 font-display text-lg font-semibold text-linen-800 dark:text-linen-100">
                {step.inst.name} is connected
              </h2>
              <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
                Added <span className="tabular-nums">{step.count}</span> transactions from {step.accounts} account
                {step.accounts === 1 ? '' : 's'}, sorted and ready.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                {onViewDashboard && (
                  <button
                    onClick={() => {
                      onClose()
                      onViewDashboard()
                    }}
                    className="w-full rounded-lg bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
                  >
                    See the dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    setQuery('')
                    setStep({ kind: 'pick' })
                  }}
                  className="w-full rounded-lg border border-linen-300 px-4 py-2.5 text-sm font-medium text-linen-600 hover:bg-linen-50 dark:border-linen-600 dark:text-linen-300 dark:hover:bg-linen-800"
                >
                  Connect another bank
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
