import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category, ColumnMapping, ImportSource, Transaction } from './types'
import { applyOverrides, overrideKey } from './lib/categorize'
import { clearAllStorage, loadJSON, saveJSON, STORAGE_KEYS } from './lib/storage'
import { loadSampleTransactions } from './data/sampleData'

const SAMPLE_SOURCE_ID = 'sample-data'

interface StoreValue {
  transactions: Transaction[]
  hasData: boolean
  mapping: ColumnMapping | null
  overrides: Record<string, Category>
  /** Every file imported so far, newest last. */
  sources: ImportSource[]
  /** Append a freshly imported file's transactions (overrides re-applied). */
  addImport: (tx: Transaction[], source: ImportSource) => void
  /** Remove one imported file and all of the transactions it contributed. */
  removeSource: (sourceId: string) => void
  loadSample: () => void
  /** Edit one transaction's category and remember it for future imports. */
  setCategory: (id: string, category: Category) => void
  saveMapping: (m: ColumnMapping) => void
  clearAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadJSON<Transaction[]>(STORAGE_KEYS.transactions, []),
  )
  const [mapping, setMapping] = useState<ColumnMapping | null>(() =>
    loadJSON<ColumnMapping | null>(STORAGE_KEYS.mapping, null),
  )
  const [overrides, setOverrides] = useState<Record<string, Category>>(() =>
    loadJSON<Record<string, Category>>(STORAGE_KEYS.overrides, {}),
  )
  const [sources, setSources] = useState<ImportSource[]>(() =>
    loadJSON<ImportSource[]>(STORAGE_KEYS.sources, []),
  )

  // Always-current snapshots so callbacks can read state without nesting state
  // updaters (which React StrictMode double-invokes, duplicating appended rows).
  const txRef = useRef(transactions)
  txRef.current = transactions
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides

  useEffect(() => {
    saveJSON(STORAGE_KEYS.transactions, transactions)
  }, [transactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.overrides, overrides)
  }, [overrides])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.sources, sources)
  }, [sources])

  const addImport = useCallback((tx: Transaction[], source: ImportSource) => {
    const withOverrides = applyOverrides(tx, overridesRef.current)
    setTransactions((prev) => [...prev, ...withOverrides])
    setSources((prev) => [...prev, source])
  }, [])

  const removeSource = useCallback((sourceId: string) => {
    setTransactions((prev) => prev.filter((t) => t.sourceId !== sourceId))
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
  }, [])

  const loadSample = useCallback(() => {
    const tx = loadSampleTransactions().map((t) => ({ ...t, sourceId: SAMPLE_SOURCE_ID }))
    setTransactions(applyOverrides(tx, overridesRef.current))
    setSources([
      {
        id: SAMPLE_SOURCE_ID,
        fileName: 'Sample data',
        importedAt: new Date().toISOString(),
        accountType: 'bank',
        count: tx.length,
        dropped: 0,
      },
    ])
  }, [])

  const setCategory = useCallback((id: string, category: Category) => {
    const target = txRef.current.find((t) => t.id === id)
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category, overridden: true } : t)),
    )
    if (target) {
      setOverrides((o) => ({ ...o, [overrideKey(target.description)]: category }))
    }
  }, [])

  const saveMapping = useCallback((m: ColumnMapping) => setMapping(m), [])

  const clearAll = useCallback(() => {
    clearAllStorage()
    setTransactions([])
    setMapping(null)
    setOverrides({})
    setSources([])
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      transactions,
      hasData: transactions.length > 0,
      mapping,
      overrides,
      sources,
      addImport,
      removeSource,
      loadSample,
      setCategory,
      saveMapping,
      clearAll,
    }),
    [
      transactions,
      mapping,
      overrides,
      sources,
      addImport,
      removeSource,
      loadSample,
      setCategory,
      saveMapping,
      clearAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
