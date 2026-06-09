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
import { merchantKey, txSignature } from './lib/merchant'
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
  /** Per-merchant details (cadence, charge/billing day, renewal/ended dates) for any group. */
  subscriptionMeta: Record<string, SubscriptionMeta>
  /** Recurring-transfer group keys the user opted OUT of counting toward totals. */
  ignoredTransfers: Record<string, true>
  /** Recurring group keys the user removed from the Recurring payments list. */
  dismissedRecurring: Record<string, true>
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
  /** Toggle the subscription flag for ONE transaction (e.g. a single Amazon charge that's Prime). */
  toggleSubscription: (id: string) => void
  /** Flag/unflag a whole group (every merchant key behind the given transactions). */
  setGroupSubscription: (ids: string[], value: boolean) => void
  /** Update group details (cadence, charge/billing day, renewal/ended) for a group's merchants. */
  setSubscriptionMeta: (keys: string[], patch: SubscriptionMeta) => void
  /** Rename a group: set a clean display name for the merchant key(s) behind these transactions. */
  setAlias: (ids: string[], name: string) => void
  /** Choose whether a detected recurring transfer counts toward spending/income. */
  setTransferCounted: (key: string, value: boolean) => void
  /** Show/hide a recurring group in the Recurring payments list (e.g. remove "Amazon"). */
  setRecurringDismissed: (groupKey: string, dismissed: boolean) => void
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

/**
 * Load subscription state, migrating older shapes. The "subscriptions" key used
 * to hold `Record<merchantKey, SubscriptionMeta>` (presence = flagged). We now
 * split that into a flag map (merchant -> true) and a separate `groupMeta` map
 * (cadence / charge day / renewal / ended) that applies to any group.
 */
function loadSubsState() {
  const persisted = loadJSON<Record<string, SubscriptionMeta | true>>(STORAGE_KEYS.subscriptions, {})
  const flags: Record<string, true> = {}
  const meta: Record<string, SubscriptionMeta> = {
    ...loadJSON<Record<string, SubscriptionMeta>>(STORAGE_KEYS.groupMeta, {}),
  }
  for (const [k, v] of Object.entries(persisted ?? {})) {
    flags[k] = true
    if (v && v !== true && !meta[k]) meta[k] = v
  }
  return { flags, meta }
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
  // Subscription flags keyed by merchant key (whole-merchant subscriptions like Netflix).
  const [subscriptions, setSubscriptions] = useState<Record<string, true>>(() => loadSubsState().flags)
  // Per-transaction subscription flags by signature (e.g. one Amazon charge that's Prime).
  const [subscriptionTxns, setSubscriptionTxns] = useState<Record<string, true>>(() =>
    loadJSON<Record<string, true>>(STORAGE_KEYS.subscriptionTxns, {}),
  )
  // Group details (cadence, charge/billing day, renewal/ended) keyed by merchant key.
  const [groupMeta, setGroupMeta] = useState<Record<string, SubscriptionMeta>>(() => loadSubsState().meta)
  // Clean display names keyed by merchant key (renames), applied to grouping + display.
  const [aliases, setAliases] = useState<Record<string, string>>(() =>
    loadJSON<Record<string, string>>(STORAGE_KEYS.aliases, {}),
  )
  // Recurring-transfer groups the user said should NOT count toward totals.
  const [ignoredTransfers, setIgnoredTransfers] = useState<Record<string, true>>(() =>
    loadJSON<Record<string, true>>(STORAGE_KEYS.ignoredTransfers, {}),
  )
  // Recurring groups the user removed from the Recurring payments list (by group key).
  const [dismissedRecurring, setDismissedRecurring] = useState<Record<string, true>>(() =>
    loadJSON<Record<string, true>>(STORAGE_KEYS.dismissedRecurring, {}),
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
  const subscriptionTxnsRef = useRef(subscriptionTxns)
  subscriptionTxnsRef.current = subscriptionTxns
  const aliasesRef = useRef(aliases)
  aliasesRef.current = aliases
  const configRef = useRef(categoryConfig)
  configRef.current = categoryConfig
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  // The live transaction list. Two flags are *derived* (never persisted on the
  // raw rows): `subscription` — set when the merchant is flagged OR this exact
  // charge is (per-transaction, e.g. one Amazon = Prime); and `counts` — set on
  // recurring same-amount transfers we promote into spending/income (minus
  // opted-out groups). Recomputed whenever any of those inputs change.
  const transactions = useMemo(() => {
    const counted = recurringTransferIds(rawTransactions, aliases, ignoredTransfers)
    return rawTransactions.map((t) => {
      const sub = subscriptions[merchantKey(t.description)] || subscriptionTxns[txSignature(t.date, t.description, t.amount)]
      const counts = counted.has(t.id)
      if (!sub && !counts) return t
      return { ...t, subscription: sub ? true : undefined, counts: counts ? true : undefined }
    })
  }, [rawTransactions, aliases, ignoredTransfers, subscriptions, subscriptionTxns])

  useEffect(() => saveJSON(STORAGE_KEYS.transactions, rawTransactions), [rawTransactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => saveJSON(STORAGE_KEYS.overrides, overrides), [overrides])
  useEffect(() => saveJSON(STORAGE_KEYS.merchantOverrides, merchantOverrides), [merchantOverrides])
  useEffect(() => saveJSON(STORAGE_KEYS.subscriptions, subscriptions), [subscriptions])
  useEffect(() => saveJSON(STORAGE_KEYS.subscriptionTxns, subscriptionTxns), [subscriptionTxns])
  useEffect(() => saveJSON(STORAGE_KEYS.groupMeta, groupMeta), [groupMeta])
  useEffect(() => saveJSON(STORAGE_KEYS.aliases, aliases), [aliases])
  useEffect(() => saveJSON(STORAGE_KEYS.ignoredTransfers, ignoredTransfers), [ignoredTransfers])
  useEffect(() => saveJSON(STORAGE_KEYS.dismissedRecurring, dismissedRecurring), [dismissedRecurring])
  useEffect(() => saveJSON(STORAGE_KEYS.sources, sources), [sources])
  useEffect(() => saveJSON(STORAGE_KEYS.budgets, budgets), [budgets])
  useEffect(() => saveJSON(STORAGE_KEYS.quizHistory, quizHistory), [quizHistory])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.theme, theme)
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /**
   * Re-apply remembered category edits to a fresh set (exact description first,
   * then merchant). Subscription / counts flags are derived later, not here.
   */
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
    setSubscriptions({ [merchantKey('Netflix')]: true, [merchantKey('Spotify')]: true })
    setGroupMeta({
      [merchantKey('Netflix')]: { cadence: 'monthly', billingDay: 6 },
      [merchantKey('Spotify')]: { cadence: 'monthly', billingDay: 26 },
    })
    const tx = loadSampleTransactions().map((t) => ({ ...t, sourceId: SAMPLE_SOURCE_ID }))
    setRawTransactions(withOverrides(tx))
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

  /** Map a set of transaction ids to the distinct merchant keys behind them. */
  const keysForIds = useCallback((ids: string[]): string[] => {
    const idset = new Set(ids)
    const keys = new Set<string>()
    for (const t of txRef.current) if (idset.has(t.id)) keys.add(merchantKey(t.description))
    return [...keys]
  }, [])

  const sigForId = useCallback((id: string): string | null => {
    const t = txRef.current.find((x) => x.id === id)
    return t ? txSignature(t.date, t.description, t.amount) : null
  }, [])

  /**
   * Toggle the subscription flag for ONE transaction. If its merchant is flagged
   * whole-hog, unflag the merchant; otherwise flip just this charge's signature
   * (so a single Amazon charge can be Prime without flagging all of Amazon).
   */
  const toggleSubscription = useCallback((id: string) => {
    const t = txRef.current.find((x) => x.id === id)
    if (!t) return
    const key = merchantKey(t.description)
    if (subscriptionsRef.current[key]) {
      setSubscriptions((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }
    const sig = txSignature(t.date, t.description, t.amount)
    setSubscriptionTxns((prev) => {
      const next = { ...prev }
      if (next[sig]) delete next[sig]
      else next[sig] = true
      return next
    })
  }, [])

  /** Flag/unflag a whole group (every merchant key behind the given transactions). */
  const setGroupSubscription = useCallback(
    (ids: string[], value: boolean) => {
      const keys = keysForIds(ids)
      if (keys.length === 0) return
      setSubscriptions((prev) => {
        const next = { ...prev }
        for (const k of keys) {
          if (value) next[k] = true
          else delete next[k]
        }
        return next
      })
      // When turning a group off, also clear any per-transaction flags it carries.
      if (!value) {
        const sigs = new Set(ids.map((i) => sigForId(i)).filter(Boolean) as string[])
        setSubscriptionTxns((prev) => {
          const next = { ...prev }
          for (const s of sigs) delete next[s]
          return next
        })
      }
    },
    [keysForIds, sigForId],
  )

  const setSubscriptionMeta = useCallback((keys: string[], patch: SubscriptionMeta) => {
    if (keys.length === 0) return
    setGroupMeta((prev) => {
      const next = { ...prev }
      for (const k of keys) next[k] = { ...(next[k] ?? {}), ...patch }
      return next
    })
  }, [])

  const setRecurringDismissed = useCallback((groupKey: string, dismissed: boolean) => {
    setDismissedRecurring((prev) => {
      const next = { ...prev }
      if (dismissed) next[groupKey] = true
      else delete next[groupKey]
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
    setSubscriptionTxns({})
    setGroupMeta({})
    setAliases({})
    setIgnoredTransfers({})
    setDismissedRecurring({})
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
      subscriptionMeta: groupMeta,
      ignoredTransfers,
      dismissedRecurring,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      toggleSubscription,
      setGroupSubscription,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
      setRecurringDismissed,
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
      groupMeta,
      ignoredTransfers,
      dismissedRecurring,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      toggleSubscription,
      setGroupSubscription,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
      setRecurringDismissed,
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
