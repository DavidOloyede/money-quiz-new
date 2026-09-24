/**
 * A category id. Built-in ids are listed in BUILTIN_CATEGORIES; users can also
 * add their own, so this is a plain string resolved through lib/categories.
 */
export type Category = string

/** The built-in ids, handy where we only ever produce those (categorize()). */
export type BuiltinCategory =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'home'
  | 'business'
  | 'insurance'
  | 'loans'
  | 'shopping'
  | 'personal'
  | 'entertainment'
  | 'subscriptions'
  | 'education'
  | 'health'
  | 'pets'
  | 'charity'
  | 'tithes'
  | 'fees'
  | 'zelle'
  | 'income'
  | 'transfers'
  | 'other'

export interface Transaction {
  id: string
  /** ISO date, always normalized to YYYY-MM-DD */
  date: string
  description: string
  /** Signed: negative = money out (expense), positive = money in (income) */
  amount: number
  category: Category
  /**
   * Stable identity for this row across re-imports (see lib/txKey). DERIVED by
   * the store, never persisted on the row — it's what per-transaction edits,
   * links and treatments are keyed on, since `id` is re-minted every import.
   */
  key?: string
  /** True when the user has manually changed the category */
  overridden?: boolean
  /** True when the user has manually relabeled this row's description */
  renamed?: boolean
  /**
   * How this row counts toward totals. DERIVED by the store from the saved
   * treatments, the owner-name rules and any link, never persisted on the row.
   */
  treatment?: TxTreatment
  /**
   * The `key` of the charge this credit reverses or offsets, when the user (or
   * installment-plan detection) linked them. DERIVED.
   */
  linkedTo?: string
  /** The `key`s of credits linked TO this charge — one charge can have several. DERIVED. */
  linkedFrom?: string[]
  /**
   * True when the user has flagged this charge as a recurring payment. Flagging
   * is remembered per-merchant or per-charge (see store), so it survives
   * re-imports. This is the ★ flag; subscriptions are instead identified by the
   * Subscriptions category.
   */
  recurring?: boolean
  /**
   * Forces this transaction to count toward spending/income even though its
   * category is normally excluded (transfers/Zelle). Set automatically on
   * recurring, same-amount, same-day transfers (e.g. a monthly phone Zelle).
   */
  counts?: boolean
  /** Which imported file this transaction came from (so it can be removed). */
  sourceId?: string
  /**
   * The merchant's logo as Plaid supplied it (bank-linked rows only). Our own
   * bundled logos (lib/merchantLogos) take precedence where we have one.
   */
  logoUrl?: string
}

/**
 * How a transaction should be counted, independently of its category.
 *
 * Category says *what* the money was; treatment says *whether and how* it
 * counts. They're separate facts, and a category can only carry one of them —
 * which is why this isn't just another category:
 *
 *  - 'reimbursement' is money in that isn't income. Someone paid you back, so
 *    it reduces what you spent rather than adding to what you earned — and the
 *    category is still free to say which spending it offsets.
 *  - 'internal' is money that only moved between your own accounts. It stays
 *    out of every total no matter what category it sits in, so a Cash App or
 *    PayPal transfer to yourself can keep saying it was Cash App.
 */
export type TxTreatment = 'normal' | 'reimbursement' | 'internal'

/** How often a subscription bills. */
export type SubscriptionCadence = 'monthly' | 'annual'

/**
 * Optional details a user can attach to a subscription, remembered per-merchant.
 * Lets us track yearly vs monthly billing, when the next charge lands, and
 * whether the subscription has since ended.
 */
export interface SubscriptionMeta {
  cadence?: SubscriptionCadence
  /** Day of month (1-31) a monthly subscription is charged. */
  billingDay?: number
  /** ISO date (YYYY-MM-DD) of the next renewal, for annual subscriptions. */
  renewalDate?: string
  /** ISO date the subscription ended, if it's no longer active. */
  endedDate?: string
}

/** A raw row coming out of PapaParse: header -> cell value */
export type CsvRow = Record<string, string>

export type AmountMode = 'single' | 'debitCredit'

/**
 * Where a CSV came from. A credit-card export double-counts money that already
 * left a checking account, so we drop its "payment" rows on import.
 */
export type AccountType = 'bank' | 'credit'

/** Remembered CSV column mapping so re-imports are one click */
export interface ColumnMapping {
  date: string
  description: string
  amountMode: AmountMode
  /** used when amountMode === 'single' */
  amount?: string
  /** used when amountMode === 'debitCredit' */
  debit?: string
  credit?: string
  /** optional source category column */
  category?: string
  /** flip the sign for banks where positive = expense */
  invertAmount?: boolean
  /** bank/checking vs credit card (controls payment removal) */
  accountType?: AccountType
}

/** A single imported file or connected account, tracked so the user can manage it. */
export interface ImportSource {
  id: string
  fileName: string
  /** ISO timestamp of when it was imported */
  importedAt: string
  accountType: AccountType
  /** how many transactions this source contributed */
  count: number
  /** card-payment rows that were removed (credit cards only) */
  dropped: number
  /** 'file' = CSV upload (default), 'plaid' = a connected bank/card */
  kind?: 'file' | 'plaid'
  /** institution name for Plaid-connected sources */
  institution?: string
  /**
   * Set on a pretend connection from the demo flow (data/demoBanks). Nothing
   * behind it reaches Plaid or the server. `account` names the built-in demo
   * account it came from; without it, the rows came from a CSV the presenter
   * picked, so there's nothing to re-fetch.
   */
  demo?: { account?: string }
}

/** Monthly budget per category (category id -> dollars). */
export type Budgets = Record<string, number>

/** One recorded quiz attempt, for history & streaks. */
export interface QuizResult {
  /** ISO timestamp */
  at: string
  correct: number
  total: number
}

/**
 * Points & streak progress (see lib/gamification). Survives "Clear all data" —
 * it's account progress, not imported data.
 */
export interface GameState {
  /** Lifetime points; levels are derived from this. */
  xp: number
  /** Consecutive days the app has been used, counting today. */
  streak: number
  bestStreak: number
  /** YYYY-MM-DD (local) of the last counted check-in day. */
  lastActiveDay: string
  /** Earned badge ids -> ISO date earned (see lib/badges). Never un-awarded. */
  badges: Record<string, string>
}

/** Starting balance per year ("2026" -> dollars) for the Year Sheet view. */
export type StartingBalances = Record<string, number>

/** Recurring-loan group keys confirmed paid off -> ISO date confirmed. */
export type PaidOffDebts = Record<string, string>

export type ThemeMode = 'light' | 'dark'

/**
 * A signed-in user's account profile, as the Node API returns it from
 * `GET /api/me` (snake_case wire format). Auth itself is platform-specific —
 * the web and mobile apps each own their Supabase client and auth provider —
 * but the profile shape is shared so both consume `/me` (and the admin user
 * list) with the same type.
 */
export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'user' | 'admin'
  created_at: string
}
