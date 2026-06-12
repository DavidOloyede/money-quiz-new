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
  GameState,
  ImportSource,
  PaidOffDebts,
  QuizResult,
  StartingBalances,
  SubscriptionMeta,
  ThemeMode,
  Transaction,
} from './types'
import { checkIn, DEFAULT_GAME_STATE, quizXp, XP } from './lib/gamification'
import { awardBadges } from './lib/badges'
import { overrideKey } from './lib/categorize'
import { groupKey, merchantKey, txSignature } from './lib/merchant'
import {
  autoRecurringBill,
  recurringBills,
  recurringTransferIds,
  type RecurringKind,
  type RecurringKindOverrides,
} from './lib/analysis'
import { plaidApi, type PlaidItemSummary } from './lib/plaid'
import { mapPlaidTransactions } from './lib/plaidMap'
import {
  applyCategoryConfig,
  BUILTIN_CATEGORIES,
  DEFAULT_CATEGORY_CONFIG,
  makeCategoryId,
  SUBSCRIPTIONS_CATEGORY,
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
  /** XP / level / daily-streak progress (auto-checked-in on app open). */
  game: GameState
  /** Year Sheet starting balance per year ("2026" -> dollars). */
  startingBalances: StartingBalances
  /** Giving goal as a % of income (0 = not set). */
  givingGoal: number
  /** Recurring-loan groups confirmed paid off (groupKey -> ISO date). */
  paidOffDebts: PaidOffDebts
  /** Clean display names keyed by merchant key (user renames). */
  aliases: Record<string, string>
  /** Per-merchant details (cadence, charge/billing day, renewal/ended dates) for any group. */
  subscriptionMeta: Record<string, SubscriptionMeta>
  /** Recurring-transfer group keys the user opted OUT of counting toward totals. */
  ignoredTransfers: Record<string, true>
  /** Recurring group keys the user removed from the Recurring payments list. */
  dismissedRecurring: Record<string, true>
  /** Bill ⇄ habit reclassifications for recurring groups (by group key). */
  recurringKinds: RecurringKindOverrides
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
  /** Toggle the ★ recurring flag for ONE transaction (e.g. a single Amazon charge that repeats). */
  toggleRecurring: (id: string) => void
  /** Flag/unflag a whole group as recurring (every merchant key behind the given transactions). */
  setGroupRecurring: (ids: string[], value: boolean) => void
  /** Update group details (cadence, charge/billing day, renewal/ended) for a group's merchants. */
  setSubscriptionMeta: (keys: string[], patch: SubscriptionMeta) => void
  /** Rename a group: set a clean display name for the merchant key(s) behind these transactions. */
  setAlias: (ids: string[], name: string) => void
  /** Choose whether a detected recurring transfer counts toward spending/income. */
  setTransferCounted: (key: string, value: boolean) => void
  /** Show/hide a recurring group in the Recurring payments list (e.g. remove "Amazon"). */
  setRecurringDismissed: (groupKey: string, dismissed: boolean) => void
  /** Re-file a recurring group as an expected bill or a spending habit (null = back to auto). */
  setRecurringKind: (groupKey: string, kind: RecurringKind | null) => void
  /** How many other transactions share this one's merchant (for "apply to similar"). */
  similarCount: (id: string) => number
  addCustomCategory: (label: string, color: string, emoji: string) => void
  updateCategory: (id: string, patch: { label?: string; color?: string; emoji?: string }) => void
  deleteCategory: (id: string) => void
  setBudget: (category: Category, amount: number) => void
  setStartingBalance: (year: string, amount: number) => void
  /** Set the giving goal (% of income); 0 clears it. */
  setGivingGoal: (pct: number) => void
  /** Confirm (or undo) a recurring loan group as paid off. */
  setDebtPaidOff: (groupKey: string, paidOff: boolean) => void
  /** Add points toward the next level (quizzes/imports award automatically). */
  awardXp: (amount: number) => void
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
 * Load the manual ★ "recurring payment" flags. New installs read the
 * recurring / recurringTxns keys; older ones migrate from the legacy
 * subscription flags — a charge you'd marked a "subscription" is now a recurring
 * payment (★), since subscriptions are defined by their category instead.
 */
function loadRecurringState() {
  const legacy = loadJSON<Record<string, SubscriptionMeta | true>>(STORAGE_KEYS.subscriptions, {})
  const legacyMerchants: Record<string, true> = {}
  for (const k of Object.keys(legacy ?? {})) legacyMerchants[k] = true
  const merchants = loadJSON<Record<string, true> | null>(STORAGE_KEYS.recurring, null) ?? legacyMerchants
  const txns =
    loadJSON<Record<string, true> | null>(STORAGE_KEYS.recurringTxns, null) ??
    loadJSON<Record<string, true>>(STORAGE_KEYS.subscriptionTxns, {})
  return { merchants, txns }
}

/**
 * Load group meta (cadence / charge day / renewal / ended), including any that
 * was embedded in the legacy subscriptions map's values.
 */
function loadGroupMeta(): Record<string, SubscriptionMeta> {
  const meta: Record<string, SubscriptionMeta> = {
    ...loadJSON<Record<string, SubscriptionMeta>>(STORAGE_KEYS.groupMeta, {}),
  }
  const legacy = loadJSON<Record<string, SubscriptionMeta | true>>(STORAGE_KEYS.subscriptions, {})
  for (const [k, v] of Object.entries(legacy ?? {})) {
    if (v && v !== true && !meta[k]) meta[k] = v
  }
  return meta
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
  // Manual ★ recurring flags keyed by merchant key (whole-merchant repeats like Rent).
  const [recurringMerchants, setRecurringMerchants] = useState<Record<string, true>>(
    () => loadRecurringState().merchants,
  )
  // Per-transaction ★ recurring flags by signature (e.g. one Amazon charge that repeats).
  const [recurringTxns, setRecurringTxns] = useState<Record<string, true>>(
    () => loadRecurringState().txns,
  )
  // Group details (cadence, charge/billing day, renewal/ended) keyed by merchant key.
  const [groupMeta, setGroupMeta] = useState<Record<string, SubscriptionMeta>>(() => loadGroupMeta())
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
  // Bill ⇄ habit reclassifications for recurring groups (by group key).
  const [recurringKinds, setRecurringKinds] = useState<RecurringKindOverrides>(() =>
    loadJSON<RecurringKindOverrides>(STORAGE_KEYS.recurringKinds, {}),
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
  const [startingBalances, setStartingBalances] = useState<StartingBalances>(() =>
    loadJSON<StartingBalances>(STORAGE_KEYS.startingBalances, {}),
  )
  const [givingGoal, setGivingGoalState] = useState<number>(() =>
    loadJSON<number>(STORAGE_KEYS.givingGoal, 0),
  )
  const [paidOffDebts, setPaidOffDebts] = useState<PaidOffDebts>(() =>
    loadJSON<PaidOffDebts>(STORAGE_KEYS.paidOffDebts, {}),
  )
  // Spread over the default so state saved before `badges` existed gets it.
  const [game, setGame] = useState<GameState>(() => ({
    ...DEFAULT_GAME_STATE,
    ...loadJSON<GameState>(STORAGE_KEYS.game, DEFAULT_GAME_STATE),
  }))
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme)

  // Count today toward the daily streak (idempotent — only the first visit of
  // the day moves the streak and awards check-in XP).
  useEffect(() => {
    setGame((g) => checkIn(g))
  }, [])

  // Refs so callbacks can read current state without nesting state updaters
  // (React StrictMode double-invokes updaters, which would duplicate appends).
  const txRef = useRef(rawTransactions)
  txRef.current = rawTransactions
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides
  const merchantOverridesRef = useRef(merchantOverrides)
  merchantOverridesRef.current = merchantOverrides
  const recurringMerchantsRef = useRef(recurringMerchants)
  recurringMerchantsRef.current = recurringMerchants
  const recurringTxnsRef = useRef(recurringTxns)
  recurringTxnsRef.current = recurringTxns
  const aliasesRef = useRef(aliases)
  aliasesRef.current = aliases
  const recurringKindsRef = useRef(recurringKinds)
  recurringKindsRef.current = recurringKinds
  const configRef = useRef(categoryConfig)
  configRef.current = categoryConfig
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  // The live transaction list. Two flags are *derived* (never persisted on the
  // raw rows): `recurring` — set when the merchant is ★-flagged, this exact
  // charge is (per-transaction, e.g. one Amazon charge that repeats), or the
  // charge belongs to a group already shown in the Recurring & subscriptions
  // section (auto-detected bills/subscriptions); and `counts` — set on
  // recurring same-amount transfers we promote into spending/income (minus
  // opted-out groups). Recomputed when any input changes.
  const transactions = useMemo(() => {
    const counted = recurringTransferIds(rawTransactions, aliases, ignoredTransfers)
    const flag = (t: Transaction, rec: boolean): Transaction => {
      const counts = counted.has(t.id)
      if (!rec && !counts) return t
      return { ...t, recurring: rec ? true : undefined, counts: counts ? true : undefined }
    }
    // merchantKey() is regex-heavy — resolve each row's whole-merchant ★ once.
    const merchantFlagged = rawTransactions.map(
      (t) => !!recurringMerchants[merchantKey(t.description)],
    )
    // Members of groups the Recurring section shows on its own (detection or a
    // whole-merchant ★) get the star too. Per-transaction sig flags are left
    // out of this pass on purpose — one starred Amazon charge shouldn't light
    // up every Amazon charge.
    const detectBase = rawTransactions.map((t, i) => flag(t, merchantFlagged[i]))
    const sectionIds = new Set(
      recurringBills(detectBase, aliases, dismissedRecurring, recurringKinds).flatMap((r) => r.ids),
    )
    return rawTransactions.map((t, i) =>
      flag(
        t,
        merchantFlagged[i] ||
          !!recurringTxns[txSignature(t.date, t.description, t.amount)] ||
          sectionIds.has(t.id),
      ),
    )
  }, [
    rawTransactions,
    aliases,
    ignoredTransfers,
    recurringMerchants,
    recurringTxns,
    dismissedRecurring,
    recurringKinds,
  ])

  // Ref to the derived list, for callbacks that need the computed ★/counts flags.
  const transactionsRef = useRef(transactions)
  transactionsRef.current = transactions

  useEffect(() => saveJSON(STORAGE_KEYS.transactions, rawTransactions), [rawTransactions])
  useEffect(() => {
    if (mapping) saveJSON(STORAGE_KEYS.mapping, mapping)
  }, [mapping])
  useEffect(() => saveJSON(STORAGE_KEYS.overrides, overrides), [overrides])
  useEffect(() => saveJSON(STORAGE_KEYS.merchantOverrides, merchantOverrides), [merchantOverrides])
  useEffect(() => saveJSON(STORAGE_KEYS.recurring, recurringMerchants), [recurringMerchants])
  useEffect(() => saveJSON(STORAGE_KEYS.recurringTxns, recurringTxns), [recurringTxns])
  useEffect(() => saveJSON(STORAGE_KEYS.groupMeta, groupMeta), [groupMeta])
  useEffect(() => saveJSON(STORAGE_KEYS.aliases, aliases), [aliases])
  useEffect(() => saveJSON(STORAGE_KEYS.ignoredTransfers, ignoredTransfers), [ignoredTransfers])
  useEffect(() => saveJSON(STORAGE_KEYS.dismissedRecurring, dismissedRecurring), [dismissedRecurring])
  useEffect(() => saveJSON(STORAGE_KEYS.recurringKinds, recurringKinds), [recurringKinds])
  useEffect(() => saveJSON(STORAGE_KEYS.sources, sources), [sources])
  useEffect(() => saveJSON(STORAGE_KEYS.budgets, budgets), [budgets])
  useEffect(() => saveJSON(STORAGE_KEYS.quizHistory, quizHistory), [quizHistory])
  useEffect(() => saveJSON(STORAGE_KEYS.startingBalances, startingBalances), [startingBalances])
  useEffect(() => saveJSON(STORAGE_KEYS.givingGoal, givingGoal), [givingGoal])
  useEffect(() => saveJSON(STORAGE_KEYS.paidOffDebts, paidOffDebts), [paidOffDebts])
  useEffect(() => saveJSON(STORAGE_KEYS.game, game), [game])

  // Stamp any newly earned badges whenever their inputs change. awardBadges
  // returns the same object when nothing is new, so this can't loop; it reads
  // the streak off the current state, so `game` itself isn't a dependency.
  useEffect(() => {
    setGame((g) =>
      awardBadges(g, {
        transactions,
        quizHistory,
        hasImported: sources.length > 0,
        paidOffCount: Object.keys(paidOffDebts).length,
      }),
    )
  }, [transactions, quizHistory, sources, paidOffDebts])
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

  const awardXp = useCallback((amount: number) => {
    if (amount > 0) setGame((g) => ({ ...g, xp: g.xp + amount }))
  }, [])

  const addImport = useCallback(
    (tx: Transaction[], source: ImportSource) => {
      const prepared = withOverrides(tx)
      setRawTransactions((prev) => [...prev, ...prepared])
      setSources((prev) => [...prev, source])
      awardXp(XP.import)
    },
    [withOverrides, awardXp],
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
    // Put Netflix & Spotify in the Subscriptions category (with billing details)
    // and ★-flag Netflix as recurring, so the Recurring & subscriptions card has
    // something to show off out of the box.
    const subKeys = new Set([merchantKey('Netflix'), merchantKey('Spotify')])
    setMerchantOverrides(Object.fromEntries([...subKeys].map((k) => [k, SUBSCRIPTIONS_CATEGORY])))
    setRecurringMerchants({ [merchantKey('Netflix')]: true })
    setGroupMeta({
      [merchantKey('Netflix')]: { cadence: 'monthly', billingDay: 6 },
      [merchantKey('Spotify')]: { cadence: 'monthly', billingDay: 26 },
    })
    const tx = withOverrides(
      loadSampleTransactions().map((t) => ({ ...t, sourceId: SAMPLE_SOURCE_ID })),
    ).map((t) =>
      subKeys.has(merchantKey(t.description))
        ? { ...t, category: SUBSCRIPTIONS_CATEGORY, overridden: true }
        : t,
    )
    setRawTransactions(tx)
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
   * Toggle the ★ recurring flag for ONE transaction. Starring flips just this
   * charge's signature (so a single Amazon charge can be recurring without
   * flagging all of Amazon). Un-starring clears whichever flag lit it (whole
   * merchant and/or this charge); if the group would land right back in the
   * Recurring section via auto-detection, it's also dismissed from the section
   * so the star actually turns off.
   */
  const toggleRecurring = useCallback((id: string) => {
    const t = txRef.current.find((x) => x.id === id)
    if (!t) return
    const key = merchantKey(t.description)
    const sig = txSignature(t.date, t.description, t.amount)
    const starred = transactionsRef.current.find((x) => x.id === id)?.recurring
    if (!starred) {
      setRecurringTxns((prev) => ({ ...prev, [sig]: true }))
      return
    }
    if (recurringMerchantsRef.current[key]) {
      setRecurringMerchants((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    if (recurringTxnsRef.current[sig]) {
      setRecurringTxns((prev) => {
        const next = { ...prev }
        delete next[sig]
        return next
      })
    }
    const gKey = groupKey(t.description, aliasesRef.current)
    if (autoRecurringBill(transactionsRef.current, gKey, aliasesRef.current, recurringKindsRef.current)) {
      setDismissedRecurring((prev) => ({ ...prev, [gKey]: true }))
    }
  }, [])

  /** Map a set of transaction ids to the distinct alias-aware group keys behind them. */
  const groupKeysForIds = useCallback((ids: string[]): string[] => {
    const idset = new Set(ids)
    const keys = new Set<string>()
    for (const t of txRef.current) {
      if (idset.has(t.id)) keys.add(groupKey(t.description, aliasesRef.current))
    }
    return [...keys]
  }, [])

  /** Flag/unflag a whole group as recurring (every merchant key behind the given transactions). */
  const setGroupRecurring = useCallback(
    (ids: string[], value: boolean) => {
      const keys = keysForIds(ids)
      if (keys.length === 0) return
      setRecurringMerchants((prev) => {
        const next = { ...prev }
        for (const k of keys) {
          if (value) next[k] = true
          else delete next[k]
        }
        return next
      })
      const gKeys = groupKeysForIds(ids)
      if (value) {
        // Re-show a group that was hidden from the Recurring section.
        setDismissedRecurring((prev) => {
          const next = { ...prev }
          for (const k of gKeys) delete next[k]
          return next
        })
        return
      }
      // When turning a group off, also clear any per-transaction flags it carries.
      const sigs = new Set(ids.map((i) => sigForId(i)).filter(Boolean) as string[])
      setRecurringTxns((prev) => {
        const next = { ...prev }
        for (const s of sigs) delete next[s]
        return next
      })
      // Groups detection alone would put right back get dismissed, so un-starring sticks.
      const auto = gKeys.filter((k) =>
        autoRecurringBill(transactionsRef.current, k, aliasesRef.current, recurringKindsRef.current),
      )
      if (auto.length > 0) {
        setDismissedRecurring((prev) => {
          const next = { ...prev }
          for (const k of auto) next[k] = true
          return next
        })
      }
    },
    [keysForIds, groupKeysForIds, sigForId],
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

  const setRecurringKind = useCallback((groupKey: string, kind: RecurringKind | null) => {
    setRecurringKinds((prev) => {
      const next = { ...prev }
      if (kind) next[groupKey] = kind
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

  const setStartingBalance = useCallback((year: string, amount: number) => {
    setStartingBalances((prev) => {
      const next = { ...prev }
      if (amount !== 0 && Number.isFinite(amount)) next[year] = amount
      else delete next[year]
      return next
    })
  }, [])

  const setGivingGoal = useCallback((pct: number) => {
    setGivingGoalState(pct > 0 && Number.isFinite(pct) ? pct : 0)
  }, [])

  const setDebtPaidOff = useCallback((groupKey: string, paidOff: boolean) => {
    setPaidOffDebts((prev) => {
      const next = { ...prev }
      if (paidOff) next[groupKey] = new Date().toISOString()
      else delete next[groupKey]
      return next
    })
  }, [])

  const recordQuizResult = useCallback(
    (correct: number, total: number) => {
      setQuizHistory((h) => [...h, { at: new Date().toISOString(), correct, total }].slice(-50))
      awardXp(quizXp(correct, total))
    },
    [awardXp],
  )

  const setTheme = useCallback((mode: ThemeMode) => setThemeState(mode), [])

  const saveMapping = useCallback((m: ColumnMapping) => setMapping(m), [])

  const clearAll = useCallback(() => {
    DATA_KEYS.forEach(removeKey)
    setRawTransactions([])
    setMapping(null)
    setOverrides({})
    setMerchantOverrides({})
    setRecurringMerchants({})
    setRecurringTxns({})
    setGroupMeta({})
    setAliases({})
    setIgnoredTransfers({})
    setDismissedRecurring({})
    setRecurringKinds({})
    setSources([])
    setBudgets({})
    setQuizHistory([])
    setStartingBalances({})
    setGivingGoalState(0)
    setPaidOffDebts({})
    // XP / streak / badges survive on purpose — clearing data shouldn't cost
    // the level you earned.
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
      game,
      startingBalances,
      givingGoal,
      paidOffDebts,
      aliases,
      subscriptionMeta: groupMeta,
      ignoredTransfers,
      dismissedRecurring,
      recurringKinds,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      toggleRecurring,
      setGroupRecurring,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
      setRecurringDismissed,
      setRecurringKind,
      similarCount,
      addCustomCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      setStartingBalance,
      setGivingGoal,
      setDebtPaidOff,
      awardXp,
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
      game,
      startingBalances,
      givingGoal,
      paidOffDebts,
      aliases,
      groupMeta,
      ignoredTransfers,
      dismissedRecurring,
      recurringKinds,
      addImport,
      removeSource,
      addPlaidSource,
      syncPlaidSource,
      loadSample,
      setCategory,
      setCategoryBulk,
      setCategoryForMerchant,
      toggleRecurring,
      setGroupRecurring,
      setSubscriptionMeta,
      setAlias,
      setTransferCounted,
      setRecurringDismissed,
      setRecurringKind,
      similarCount,
      addCustomCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      setStartingBalance,
      setGivingGoal,
      setDebtPaidOff,
      awardXp,
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
