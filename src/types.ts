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
  /** True when the user has manually changed the category */
  overridden?: boolean
  /**
   * True when the user has flagged this charge as a subscription. Flagging is
   * remembered per-merchant (see store), so every charge from the same merchant
   * is treated as a subscription and the flag survives re-imports.
   */
  subscription?: boolean
  /** Which imported file this transaction came from (so it can be removed). */
  sourceId?: string
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

export type ThemeMode = 'light' | 'dark'
