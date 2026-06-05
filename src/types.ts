export type Category =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'shopping'
  | 'entertainment'
  | 'health'
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

/** A single imported file, tracked so the user can see and remove it later. */
export interface ImportSource {
  id: string
  fileName: string
  /** ISO timestamp of when it was imported */
  importedAt: string
  accountType: AccountType
  /** how many transactions this file contributed */
  count: number
  /** card-payment rows that were removed (credit cards only) */
  dropped: number
}

export const CATEGORIES: Category[] = [
  'groceries',
  'dining',
  'transport',
  'utilities',
  'rent',
  'shopping',
  'entertainment',
  'health',
  'zelle',
  'income',
  'transfers',
  'other',
]

export interface CategoryMeta {
  label: string
  color: string
  emoji: string
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  groceries: { label: 'Groceries', color: '#10b981', emoji: '🛒' },
  dining: { label: 'Dining', color: '#f59e0b', emoji: '🍽️' },
  transport: { label: 'Transport', color: '#3b82f6', emoji: '🚗' },
  utilities: { label: 'Utilities', color: '#6366f1', emoji: '💡' },
  rent: { label: 'Rent / Mortgage', color: '#ef4444', emoji: '🏠' },
  shopping: { label: 'Shopping', color: '#ec4899', emoji: '🛍️' },
  entertainment: { label: 'Entertainment', color: '#8b5cf6', emoji: '🎬' },
  health: { label: 'Health', color: '#14b8a6', emoji: '➕' },
  zelle: { label: 'Zelle', color: '#0ea5e9', emoji: '💸' },
  income: { label: 'Income', color: '#22c55e', emoji: '💰' },
  transfers: { label: 'Transfers', color: '#64748b', emoji: '🔁' },
  other: { label: 'Other', color: '#94a3b8', emoji: '📦' },
}

/**
 * Categories that represent money moving between your own accounts (or paying
 * off a card) rather than real spending or income. They're tracked and shown
 * on their own, but excluded from spending/income totals so the analysis stays
 * meaningful.
 */
export const EXCLUDED_CATEGORIES: Category[] = ['transfers', 'zelle']

export function isExcludedCategory(c: Category): boolean {
  return EXCLUDED_CATEGORIES.includes(c)
}

export function categoryLabel(c: Category): string {
  return CATEGORY_META[c].label
}
