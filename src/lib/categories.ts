import type { Category } from '../types'

/**
 * Categories are a runtime registry rather than a fixed enum so users can rename
 * built-ins, recolor them, and add their own. Auto-categorization only ever
 * produces built-in ids; everything else (analysis, charts, dropdowns) reads
 * labels/colors/exclusion through this module.
 *
 * `kind` drives the analysis:
 *  - 'spending' counts as expenses/income by sign
 *  - 'income'   is money in
 *  - 'excluded' (transfers, Zelle) is tracked but kept out of every total
 */
export type CategoryKind = 'spending' | 'income' | 'excluded'

export interface CategoryDef {
  id: Category
  label: string
  color: string
  emoji: string
  kind: CategoryKind
  builtin: boolean
}

/** Per-user customization, persisted in localStorage. */
export interface CategoryConfig {
  /** label/color/emoji overrides for built-in categories, keyed by id */
  overrides: Record<string, { label?: string; color?: string; emoji?: string }>
  /** fully user-defined categories */
  custom: CategoryDef[]
}

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = { overrides: {}, custom: [] }

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: 'groceries', label: 'Groceries', color: '#10b981', emoji: '🛒', kind: 'spending', builtin: true },
  { id: 'dining', label: 'Dining', color: '#f59e0b', emoji: '🍽️', kind: 'spending', builtin: true },
  { id: 'transport', label: 'Transport', color: '#3b82f6', emoji: '🚗', kind: 'spending', builtin: true },
  { id: 'utilities', label: 'Utilities', color: '#6366f1', emoji: '💡', kind: 'spending', builtin: true },
  { id: 'rent', label: 'Rent / Mortgage', color: '#ef4444', emoji: '🏠', kind: 'spending', builtin: true },
  { id: 'shopping', label: 'Shopping', color: '#ec4899', emoji: '🛍️', kind: 'spending', builtin: true },
  { id: 'entertainment', label: 'Entertainment', color: '#8b5cf6', emoji: '🎬', kind: 'spending', builtin: true },
  { id: 'subscriptions', label: 'Subscriptions', color: '#a855f7', emoji: '💳', kind: 'spending', builtin: true },
  { id: 'health', label: 'Health', color: '#14b8a6', emoji: '➕', kind: 'spending', builtin: true },
  { id: 'zelle', label: 'Zelle', color: '#0ea5e9', emoji: '💸', kind: 'excluded', builtin: true },
  { id: 'income', label: 'Income', color: '#22c55e', emoji: '💰', kind: 'income', builtin: true },
  { id: 'transfers', label: 'Transfers', color: '#64748b', emoji: '🔁', kind: 'excluded', builtin: true },
  { id: 'other', label: 'Other', color: '#94a3b8', emoji: '📦', kind: 'spending', builtin: true },
]

const FALLBACK = (id: string): CategoryDef => ({
  id,
  label: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Other',
  color: '#94a3b8',
  emoji: '🏷️',
  kind: 'spending',
  builtin: false,
})

// Live registry, kept in sync with the store's CategoryConfig.
let registry: CategoryDef[] = [...BUILTIN_CATEGORIES]
let byId = new Map<string, CategoryDef>(registry.map((d) => [d.id, d]))

function rebuild(config: CategoryConfig) {
  const merged = BUILTIN_CATEGORIES.map((d) => {
    const o = config.overrides?.[d.id]
    return o ? { ...d, ...stripUndefined(o) } : d
  })
  const customs = (config.custom ?? []).map((c) => ({ ...c, builtin: false }))
  registry = [...merged, ...customs]
  byId = new Map(registry.map((d) => [d.id, d]))
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k in o) if (o[k] !== undefined && o[k] !== '') out[k] = o[k]
  return out
}

/** Sync the live registry with the user's config. Call on load and on change. */
export function applyCategoryConfig(config: CategoryConfig): void {
  rebuild(config)
}

export function allCategories(): CategoryDef[] {
  return registry
}

export function categoryDef(id: Category): CategoryDef {
  return byId.get(id) ?? FALLBACK(id)
}

/** Alias for clarity at call sites that just want label/color/emoji. */
export const categoryMeta = categoryDef

export function categoryLabel(id: Category): string {
  return categoryDef(id).label
}

export function categoryColor(id: Category): string {
  return categoryDef(id).color
}

export function categoryEmoji(id: Category): string {
  return categoryDef(id).emoji
}

export function isExcludedCategory(id: Category): boolean {
  return categoryDef(id).kind === 'excluded'
}

export function isIncomeCategory(id: Category): boolean {
  return categoryDef(id).kind === 'income'
}

/** A stable id for a new custom category derived from its label. */
export function makeCategoryId(label: string): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
  let id = `custom-${base}`
  let n = 2
  while (byId.has(id)) id = `custom-${base}-${n++}`
  return id
}
