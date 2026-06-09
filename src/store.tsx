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
  SubscriptionMeta,
  ThemeMode,
  Transaction,
} from './types'
import { overrideKey } from './lib/categorize'
import { merchantKey } from './lib/merchant'
import { recurringTransferIds } from './lib/analysis'
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
  /** Clean display names keyed by merchant key (user renames). */
  aliases: Record<string, string>
  /** Per-merchant subscription details (cadence, billing day, renewal/ended dates). */
  subscriptionMeta: Record<string, SubscriptionMeta>
  /** Recurring-transfer group keys the user opted OUT of counting toward totals. */
  ignoredTransfers: Record<string, true>
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
  /** Flag/unflag every transaction from a merchant as a subscription (remembered). */
  setMerchantSubscription: (key: string, value: boolean) => void
  /** Toggle the subscription flag for the merchant of one transaction. */
  toggleSubscription: (id: string) => void
  /** Flag/unflag a whole group (all merchant keys behind the given transactions). */
  setGroupSubscription: (ids: string[], value: boolean) => void
  /** Update subscription details (cadence, billing day, renewal/ended) for a group's merchants. */
  setSubscriptionMeta: (keys: string[], patch: SubscriptionMeta) => void
  /** Rename a group: set a clean display name for the merchant key(s) behind these transactions. */
  setAlias: (ids: string[], name: string) => void
  /** Choose whether a detected recurring transfer counts toward spending/income. */
  setTransferCounted: (key: string, value: boolean) => void
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

/** Coerce a persisted subscriptions map (older versions stored `true`) into meta objects. */
function normalizeSubs(
  raw: Record<string, SubscriptionMeta | true>,
): Record<string, SubscriptionMeta> {
  const out: Record<string, SubscriptionMeta> = {}
  for (const [k, v] of Object.entries(raw ?? {})) out[k] = v === true || !v ? {} : v
  return out
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>(() =>
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
  // Subscriptions keyed by merchant key. Presence = flagged; the value holds the
  // optional details (cadence, billing day, renewal/ended dates). Stored by
  // merchant so the flag + details survive re-imports and group all charges.
  const [subscriptions, setSubscriptions] = useState<Record<string, SubscriptionMeta>>(() =>
    normalizeSubs(loadJSON<Record<string, SubscriptionMeta | true>>(STORAGE_KEYS.subscriptions, {})),
  )
  // Clean display names keyed by merchant key (renames), applied to grouping + display.
  const [aliases, setAliases] = useState<Record<string, string>>(() =>
    loadJSON<Record<string, string>>(STORAGE_KEYS.aliases, {}),
  )
  // Recurring-transfer groups the user said should NOT count toward totals.
  const [ignoredTransfers, setIgnoredTransfers] = useState<Record<string, true>>(() =>
    loadJSON<Record<string, true>>(STORAGE_KEYS.ignoredTransfers, {}),
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
  const txRef = useRef(rawTransactions)
  txRef.current = rawTransactions
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides
  const merchantOverridesRef = useRef(merchantOverrides)
  merchantOverridesRef.current = merchantOverrides
  const subscriptionsRef = useRef(subscriptions)
  subscriptionsRef.current = subscriptions
  const aliasesRef = useRef(aliases)
  aliasesRef.current = aliases
  const configRef = useRef(categoryConfig)
  configRef.current = categoryConfig
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  // Recurring, same-amount transfers/Zelle (e.g. a monthly phone Zelle) are
  // promoted to count toward spending/income — unless the user opted that group
  // out. Derived so it stays in sync as data/aliases change; the raw
  // transactions (persisted) never carry the `counts` flag.
  const transactions = useMemo(() => {
    const ids = recurringTransferIds(rawTransactions, aliases, ignoredTransfers)
    if (ids.size === 0) return rawTransactions
    return rawTransactions.map((t) => (ids.has(t.id) ? { ...t, counts: true } : t))
  }, [rawTransactions, aliases, ignoredTransfers])

  useEffect(() => saveJSON(STORAGE_KEYS.transactions, rawTransactions), [rawTransactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => saveJSON(STORAGE_KEYS.overrides, overrides), [overrides])
  useEffect(() => saveJSON(STORAGE_KEYS.merchantOverrides, merchantOverrides), [merchantOverrides])
  useEffect(() => saveJSON(STORAGE_KEYS.subscriptions, subscriptions), [subscriptions])
  useEffect(() => saveJSON(STORAGE_KEYS.aliases, aliases), [aliases])
  useEffect(() => saveJSON(STORAGE_KEYS.ignoredTransfers, ignoredTransfers), [ignoredTransfers])
  useEffect(() => saveJSON(STORAGE_KEYS.sources, sources), [sources])
  useEffect(() => saveJSON(STORAGE_KEYS.budgets, budgets), [budgets])
  useEffect(() => saveJSON(STORAGE_KEYS.quizHistory, quizHistory), [quizHistory])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.theme, theme)
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /**
   * Re-apply remembered edits to a fresh set: subscription flag (by merchant),
   * then category (exact description first, then merchant).
   */
  const withOverrides = useCallback((tx: Transaction[]): Transaction[] => {
    const desc = overridesRef.current
    const merch = merchantOverridesRef.current
    const subs = subscriptionsRef.current
    return tx.map((t) => {
      const key = merchantKey(t.description)
      const subscription = key in subs ? true : undefined
      const byDesc = desc[overrideKey(t.description)]
      if (byDesc) return { ...t, subscription, category: byDesc, overridden: true }
      const byMerchant = merch[key]
      if (byMerchant) return { ...t, subscription, category: byMerchant, overridden: true }
      return { ...t, subscription }
    })
  }, [])

  const addImport = useCallback(
    (tx: Transaction[], source: ImportSource) => {
      const prepared = withOverrides(tx)
      setRawTransactions((prev) => [...prev, ...prepared])
      setSources((prev) => [...prev, source])
    },
    [withOverrides],
  )

  const removeSource = useCallback((sourceId: string) => {
    const src = sourcesRef.current.find((s) => s.id === sourceId)
    if (src?.kind === 'plaid') void plaidApi.removeItem(sourceId).catch(() => {})
    setRawTransactions((prev) => prev.filter((t) => t.sourceId !== sourceId))
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
      setRawTransactions((prev) => [...prev.filter((t) => t.sourceId !== sourceId), ...mapped])
      setSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, count: mapped.length } : s)))
      return mapped.length
    },
    [withOverrides],
  )

  const loadSample = useCallback(() => {
    // Pre-flag a couple of streaming subscriptions so the Subscriptions list has
    // something to show off out of the box (with example cadence details).
    const seed: Record<string, SubscriptionMeta> = {
      [merchantKey('Netflix')]: { cadence: 'monthly', billingDay: 6 },
      [merchantKey('Spotify')]: { cadence: 'monthly', billingDay: 26 },
    }
    const tx = loadSampleTransactions().map((t) => ({ ...t, sourceId: SAMPLE_SOURCE_ID }))
    const prepared = withOverrides(tx).map((t) =>
      merchantKey(t.description) in seed ? { ...t, subscription: true } : t,
    )
    setSubscriptions(seed)
    setRawTransactions(prepared)
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
    setRawTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category, overridden: true } : t)),
    )
    if (target) {
      setOverrides((o) => ({ ...o, [overrideKey(target.description)]: category }))
    }
  }, [])

  const setCategoryBulk = useCallback((ids: string[], category: Category) => {
    const idset = new Set(ids)
    const affected = txRef.current.filter((t) => idset.has(t.id))
    setRawTransactions((prev) =>
      prev.map((t) => (idset.has(t.id) ? { ...t, category, overridden: true } : t)),
    )
    setOverrides((o) => {
      const next = { ...o }
      for (const t of affected) next[overrideKey(t.description)] = category
      return next
    })
  }, [])

  const setCategoryForMerchant = useCallback((key: string, category: Category) => {
    setRawTransactions((prev) =>
      prev.map((t) => (merchantKey(t.description) === key ? { ...t, category, overridden: true } : t)),
    )
    setMerchantOverrides((o) => ({ ...o, [key]: category }))
  }, [])

  /** Set the subscription flag for one or more merchant keys at once. */
  const setMerchantSubscriptions = useCallback((keys: string[], value: boolean) => {
    const keySet = new Set(keys)
    setRawTransactions((prev) =>
      prev.map((t) =>
        keySet.has(merchantKey(t.description)) ? { ...t, subscription: value ? true : undefined } : t,
      ),
    )
    setSubscriptions((prev) => {
      const next = { ...prev }
      for (const k of keySet) {
        if (value) next[k] = next[k] ?? {}
        else delete next[k]
      }
      return next
    })
  }, [])

  const setMerchantSubscription = useCallback(
    (key: string, value: boolean) => setMerchantSubscriptions([key], value),
    [setMerchantSubscriptions],
  )

  const toggleSubscription = useCallback(
    (id: string) => {
      const t = txRef.current.find((x) => x.id === id)
      if (!t) return
      setMerchantSubscriptions([merchantKey(t.description)], !t.subscription)
    },
    [setMerchantSubscriptions],
  )

  /** Map a set of transaction ids to the distinct merchant keys behind them. */
  const keysForIds = useCallback((ids: string[]): string[] => {
    const idset = new Set(ids)
    const keys = new Set<string>()
    for (const t of txRef.current) if (idset.has(t.id)) keys.add(merchantKey(t.description))
    return [...keys]
  }, [])

  const setGroupSubscription = useCallback(
    (ids: string[], value: boolean) => {
      const keys = keysForIds(ids)
      if (keys.length) setMerchantSubscriptions(keys, value)
    },
    [keysForIds, setMerchantSubscriptions],
  )

  const setSubscriptionMeta = useCallback((keys: string[], patch: SubscriptionMeta) => {
    if (keys.length === 0) return
    setSubscriptions((prev) => {
      const next = { ...prev }
      for (const k of keys) next[k] = { ...(next[k] ?? {}), ...patch }
      return next
    })
  }, [])

  const setAlias = useCallback(
    (ids: string[], name: string) => {
      const clean = name.trim()
      const keys = keysForIds(ids)
      if (keys.length === 0) return
      setAliases((prev) => {
        const next = { ...prev }
        for (const k of keys) {
          if (clean) next[k] = clean
          else delete next[k]
        }
        return next
      })
    },
    [keysForIds],
  )

  const setTransferCounted = useCallback((key: string, value: boolean) => {
    setIgnoredTransfers((prev) => {
      const next = { ...prev }
      // value=true means "count it" -> NOT ignored; value=false -> ignored.
      if (value) delete next[key]
      else next[key] = true
      return next
    })
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
      setRawTransactions((prev) =>
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
    setRawTransactions([])
    setMapping(null)
    setOverrides({})
    setMerchantOverrides({})
    setSubscriptions({})
    setAliases({})
    setIgnoredTransfers({})
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
      aliases,
      subscriptionMeta: subscriptions,
      ignoredTransfers,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      setMerchantSubscription,
      toggleSubscription,
      setGroupSubscription,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
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
      aliases,
      subscriptions,
      ignoredTransfers,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      setMerchantSubscription,
      toggleSubscription,
      setGroupSubscription,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
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
