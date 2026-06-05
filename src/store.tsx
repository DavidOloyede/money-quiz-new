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
import type { Category, ColumnMapping, Transaction } from './types'
import { applyOverrides, overrideKey } from './lib/categorize'
import { clearAllStorage, loadJSON, saveJSON, STORAGE_KEYS } from './lib/storage'
import { loadSampleTransactions } from './data/sampleData'

interface StoreValue {
  transactions: Transaction[]
  hasData: boolean
  mapping: ColumnMapping | null
  overrides: Record<string, Category>
  /** Replace the dataset with a freshly imported set (overrides re-applied). */
  importTransactions: (tx: Transaction[]) => void
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

  // Always-current snapshot so setCategory can read descriptions without going stale.
  const txRef = useRef(transactions)
  txRef.current = transactions

  useEffect(() => {
    saveJSON(STORAGE_KEYS.transactions, transactions)
  }, [transactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.overrides, overrides)
  }, [overrides])

  const importTransactions = useCallback((tx: Transaction[]) => {
    setOverrides((current) => {
      setTransactions(applyOverrides(tx, current))
      return current
    })
  }, [])

  const loadSample = useCallback(() => {
    setOverrides((current) => {
      setTransactions(applyOverrides(loadSampleTransactions(), current))
      return current
    })
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
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      transactions,
      hasData: transactions.length > 0,
      mapping,
      overrides,
      importTransactions,
      loadSample,
      setCategory,
      saveMapping,
      clearAll,
    }),
    [
      transactions,
      mapping,
      overrides,
      importTransactions,
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
