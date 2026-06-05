export type Category =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'income'
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
}

/** A raw row coming out of PapaParse: header -> cell value */
export type CsvRow = Record<string, string>

export type AmountMode = 'single' | 'debitCredit'

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
  'income',
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
  income: { label: 'Income', color: '#22c55e', emoji: '💰' },
  other: { label: 'Other', color: '#94a3b8', emoji: '📦' },
}

export function categoryLabel(c: Category): string {
  return CATEGORY_META[c].label
}
