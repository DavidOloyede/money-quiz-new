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
import type {
  Budgets,
  Category,
  ColumnMapping,
  ImportSource,
  QuizResult,
  ThemeMode,
  Transaction,
} from './types'
import { overrideKey } from './lib/categorize'
import { merchantKey } from './lib/merchant'
import { plaidApi, type PlaidItemSummary } from './lib/plaid'
import { mapPlaidTransactions } from './lib/plaidMap'
import {
  applyCategoryConfig,
  BUILTIN_CATEGORIES,
  DEFAULT_CATEGORY_CONFIG,
  makeCategoryId,
  type CategoryConfig,
} from './lib/categories'
import { DATA_KEYS, loadJSON, removeKey, saveJSON, STORAGE_KEYS } from './lib/storage'
import { loadSampleTransactions } from './data/sampleData'

const SAMPLE_SOURCE_ID = 'sample-data'

interface StoreValue {
  transactions: Transaction[]
  hasData: boolean
  mapping: ColumnMapping | null
  overrides: Record<string, Category>
  sources: ImportSource[]
  categoryConfig: CategoryConfig
  budgets: Budgets
  quizHistory: QuizResult[]
  theme: ThemeMode
  addImport: (tx: Transaction[], source: ImportSource) => void
  removeSource: (sourceId: string) => void
  /** Register a Plaid-connected account as a source. */
  addPlaidSource: (item: PlaidItemSummary) => void
  /** Pull the latest transactions for a connected account and merge them in. */
  syncPlaidSource: (sourceId: string) => Promise<number>
  loadSample: () => void
  /** Edit one transaction's category (remembered by exact description). */
  setCategory: (id: string, category: Category) => void
  /** Set a category on many transactions at once (remembered by description). */
  setCategoryBulk: (ids: string[], category: Category) => void
  /** Apply a category to every transaction from the same merchant + remember it. */
  setCategoryForMerchant: (key: string, category: Category) => void
  /** How many other transactions share this one's merchant (for "apply to similar"). */
  similarCount: (id: string) => number
  addCustomCategory: (label: string, color: string, emoji: string) => void
  updateCategory: (id: string, patch: { label?: string; color?: string; emoji?: string }) => void
  deleteCategory: (id: string) => void
  setBudget: (category: Category, amount: number) => void
  recordQuizResult: (correct: number, total: number) => void
  setTheme: (mode: ThemeMode) => void
  saveMapping: (m: ColumnMapping) => void
  clearAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function initialTheme(): ThemeMode {
  const stored = loadJSON<ThemeMode | null>(STORAGE_KEYS.theme, null)
  if (stored === 'light' || stored === 'dark') return stored
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

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
  const [merchantOverrides, setMerchantOverrides] = useState<Record<string, Category>>(() =>
    loadJSON<Record<string, Category>>(STORAGE_KEYS.merchantOverrides, {}),
  )
  const [sources, setSources] = useState<ImportSource[]>(() =>
    loadJSON<ImportSource[]>(STORAGE_KEYS.sources, []),
  )
  const [categoryConfig, setCategoryConfigState] = useState<CategoryConfig>(() => {
    const cfg = loadJSON<CategoryConfig>(STORAGE_KEYS.categories, DEFAULT_CATEGORY_CONFIG)
    applyCategoryConfig(cfg) // sync the live registry before first render
    return cfg
  })
  const [budgets, setBudgets] = useState<Budgets>(() => loadJSON<Budgets>(STORAGE_KEYS.budgets, {}))
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>(() =>
    loadJSON<QuizResult[]>(STORAGE_KEYS.quizHistory, []),
  )
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme)

  // Refs so callbacks can read current state without nesting state updaters
  // (React StrictMode double-invokes updaters, which would duplicate appends).
  const txRef = useRef(transactions)
  txRef.current = transactions
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides
  const merchantOverridesRef = useRef(merchantOverrides)
  merchantOverridesRef.current = merchantOverrides
  const configRef = useRef(categoryConfig)
  configRef.current = categoryConfig
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  useEffect(() => saveJSON(STORAGE_KEYS.transactions, transactions), [transactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => saveJSON(STORAGE_KEYS.overrides, overrides), [overrides])
  useEffect(() => saveJSON(STORAGE_KEYS.merchantOverrides, merchantOverrides), [merchantOverrides])
  useEffect(() => saveJSON(STORAGE_KEYS.sources, sources), [sources])
  useEffect(() => saveJSON(STORAGE_KEYS.budgets, budgets), [budgets])
  useEffect(() => saveJSON(STORAGE_KEYS.quizHistory, quizHistory), [quizHistory])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.theme, theme)
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /** Re-apply remembered category edits (exact description first, then merchant). */
  const withOverrides = useCallback((tx: Transaction[]): Transaction[] => {
    const desc = overridesRef.current
    const merch = merchantOverridesRef.current
    return tx.map((t) => {
      const byDesc = desc[overrideKey(t.description)]
      if (byDesc) return { ...t, category: byDesc, overridden: true }
      const byMerchant = merch[merchantKey(t.description)]
      if (byMerchant) return { ...t, category: byMerchant, overridden: true }
      return t
    })
  }, [])

  const addImport = useCallback(
    (tx: Transaction[], source: ImportSource) => {
      const prepared = withOverrides(tx)
      setTransactions((prev) => [...prev, ...prepared])
      setSources((prev) => [...prev, source])
    },
    [withOverrides],
  )

  const removeSource = useCallback((sourceId: string) => {
    const src = sourcesRef.current.find((s) => s.id === sourceId)
    if (src?.kind === 'plaid') void plaidApi.removeItem(sourceId).catch(() => {})
    setTransactions((prev) => prev.filter((t) => t.sourceId !== sourceId))
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
  }, [])

  const addPlaidSource = useCallback((item: PlaidItemSummary) => {
    setSources((prev) => {
      const src: ImportSource = {
        id: item.id,
        fileName: item.institution,
        importedAt: new Date().toISOString(),
        accountType: item.accountType,
        count: item.count,
        dropped: 0,
        kind: 'plaid',
        institution: item.institution,
      }
      const existing = prev.find((s) => s.id === item.id)
      return existing
        ? prev.map((s) => (s.id === item.id ? { ...s, ...src, importedAt: s.importedAt } : s))
        : [...prev, src]
    })
  }, [])

  const syncPlaidSource = useCallback(
    async (sourceId: string) => {
      const { transactions: ptx } = await plaidApi.sync(sourceId)
      const mapped = withOverrides(mapPlaidTransactions(ptx, sourceId))
      setTransactions((prev) => [...prev.filter((t) => t.sourceId !== sourceId), ...mapped])
      setSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, count: mapped.length } : s)))
      return mapped.length
    },
    [withOverrides],
  )

  const loadSample = useCallback(() => {
    const tx = loadSampleTransactions().map((t) => ({ ...t, sourceId: SAMPLE_SOURCE_ID }))
    setTransactions(withOverrides(tx))
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
  }, [withOverrides])

  const setCategory = useCallback((id: string, category: Category) => {
    const target = txRef.current.find((t) => t.id === id)
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category, overridden: true } : t)),
    )
    if (target) {
      setOverrides((o) => ({ ...o, [overrideKey(target.description)]: category }))
    }
  }, [])

  const setCategoryBulk = useCallback((ids: string[], category: Category) => {
    const idset = new Set(ids)
    const affected = txRef.current.filter((t) => idset.has(t.id))
    setTransactions((prev) =>
      prev.map((t) => (idset.has(t.id) ? { ...t, category, overridden: true } : t)),
    )
    setOverrides((o) => {
      const next = { ...o }
      for (const t of affected) next[overrideKey(t.description)] = category
      return next
    })
  }, [])

  const setCategoryForMerchant = useCallback((key: string, category: Category) => {
    setTransactions((prev) =>
      prev.map((t) => (merchantKey(t.description) === key ? { ...t, category, overridden: true } : t)),
    )
    setMerchantOverrides((o) => ({ ...o, [key]: category }))
  }, [])

  const similarCount = useCallback((id: string) => {
    const target = txRef.current.find((t) => t.id === id)
    if (!target) return 0
    const key = merchantKey(target.description)
    return txRef.current.filter((t) => t.id !== id && merchantKey(t.description) === key).length
  }, [])

  const applyConfig = useCallback((next: CategoryConfig) => {
    applyCategoryConfig(next)
    setCategoryConfigState(next)
  }, [])

  const addCustomCategory = useCallback(
    (label: string, color: string, emoji: string) => {
      const id = makeCategoryId(label)
      const cfg = configRef.current
      applyConfig({
        ...cfg,
        custom: [...cfg.custom, { id, label, color, emoji, kind: 'spending', builtin: false }],
      })
    },
    [applyConfig],
  )

  const updateCategory = useCallback(
    (id: string, patch: { label?: string; color?: string; emoji?: string }) => {
      const cfg = configRef.current
      const isBuiltin = BUILTIN_CATEGORIES.some((b) => b.id === id)
      if (isBuiltin) {
        applyConfig({
          ...cfg,
          overrides: { ...cfg.overrides, [id]: { ...cfg.overrides[id], ...patch } },
        })
      } else {
        applyConfig({
          ...cfg,
          custom: cfg.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })
      }
    },
    [applyConfig],
  )

  const deleteCategory = useCallback(
    (id: string) => {
      if (BUILTIN_CATEGORIES.some((b) => b.id === id)) return // built-ins can't be deleted
      setTransactions((prev) =>
        prev.map((t) => (t.category === id ? { ...t, category: 'other' } : t)),
      )
      setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== id)))
      setMerchantOverrides((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== id)))
      setBudgets((b) => {
        const next = { ...b }
        delete next[id]
        return next
      })
      const cfg = configRef.current
      const overridesNext = { ...cfg.overrides }
      delete overridesNext[id]
      applyConfig({ overrides: overridesNext, custom: cfg.custom.filter((c) => c.id !== id) })
    },
    [applyConfig],
  )

  const setBudget = useCallback((category: Category, amount: number) => {
    setBudgets((b) => {
      const next = { ...b }
      if (amount > 0) next[category] = amount
      else delete next[category]
      return next
    })
  }, [])

  const recordQuizResult = useCallback((correct: number, total: number) => {
    setQuizHistory((h) => [...h, { at: new Date().toISOString(), correct, total }].slice(-50))
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => setThemeState(mode), [])

  const saveMapping = useCallback((m: ColumnMapping) => setMapping(m), [])

  const clearAll = useCallback(() => {
    DATA_KEYS.forEach(removeKey)
    setTransactions([])
    setMapping(null)
    setOverrides({})
    setMerchantOverrides({})
    setSources([])
    setBudgets({})
    setQuizHistory([])
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      transactions,
      hasData: transactions.length > 0,
      mapping,
      overrides,
      sources,
      categoryConfig,
      budgets,
      quizHistory,
      theme,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      similarCount,
      addCustomCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      recordQuizResult,
      setTheme,
      saveMapping,
      clearAll,
    }),
    [
      transactions,
      mapping,
      overrides,
      sources,
      categoryConfig,
      budgets,
      quizHistory,
      theme,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      similarCount,
      addCustomCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      recordQuizResult,
      setTheme,
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
