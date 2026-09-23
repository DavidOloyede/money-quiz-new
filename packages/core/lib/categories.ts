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

/**
 * The built-in category that defines a "subscription". A charge is a
 * subscription when it lives in this category (its label/color can be
 * customized, but the id is stable). Single source of truth for the analysis
 * and the Subscriptions view.
 */
export const SUBSCRIPTIONS_CATEGORY: Category = 'subscriptions'

export function isSubscriptionCategory(id: Category): boolean {
  return id === SUBSCRIPTIONS_CATEGORY
}

/*
 * Category colors are the Manna Money warm palette. The eight most common
 * spending categories (groceries…subscriptions) were chosen together and
 * machine-checked as a set: every color sits in a lightness band that works
 * on both the cream and the dark surfaces, and the worst colorblind
 * (protan/deutan) pair clears the documented floor — with the emoji + label
 * that always accompany a category color as the backup channel. The three
 * grays (fees, transfers, other) are deliberately muted: they mark money the
 * app de-emphasizes. If you reshuffle these, re-run the palette validator
 * rather than eyeballing.
 */
export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: 'groceries', label: 'Groceries', color: '#2e7d33', emoji: '🛒', kind: 'spending', builtin: true },
  { id: 'dining', label: 'Dining', color: '#c98420', emoji: '🍽️', kind: 'spending', builtin: true },
  { id: 'transport', label: 'Transport', color: '#3f7fd6', emoji: '🚗', kind: 'spending', builtin: true },
  { id: 'utilities', label: 'Utilities', color: '#5a50c8', emoji: '💡', kind: 'spending', builtin: true },
  { id: 'rent', label: 'Rent / Mortgage', color: '#d95a50', emoji: '🏠', kind: 'spending', builtin: true },
  { id: 'home', label: 'Home & HOA', color: '#9b6b35', emoji: '🏡', kind: 'spending', builtin: true },
  // Money that belongs to a separate ledger — a rental, a side business. It
  // is deliberately assigned by hand (or by a description rule), never by
  // keyword: no descriptor can tell us whose books a cost belongs on.
  { id: 'business', label: 'Business / Rental', color: '#6e7a35', emoji: '🏢', kind: 'spending', builtin: true },
  { id: 'insurance', label: 'Insurance', color: '#2e6b75', emoji: '🛡️', kind: 'spending', builtin: true },
  { id: 'loans', label: 'Loans & Debt', color: '#8a621b', emoji: '🏦', kind: 'spending', builtin: true },
  { id: 'shopping', label: 'Shopping', color: '#d26594', emoji: '🛍️', kind: 'spending', builtin: true },
  { id: 'personal', label: 'Personal Care', color: '#b466c4', emoji: '💇', kind: 'spending', builtin: true },
  { id: 'entertainment', label: 'Entertainment', color: '#12948a', emoji: '🎬', kind: 'spending', builtin: true },
  { id: 'subscriptions', label: 'Subscriptions', color: '#a93f8c', emoji: '💳', kind: 'spending', builtin: true },
  { id: 'education', label: 'Education', color: '#33549f', emoji: '🎓', kind: 'spending', builtin: true },
  { id: 'health', label: 'Health', color: '#33a57c', emoji: '➕', kind: 'spending', builtin: true },
  { id: 'pets', label: 'Pets', color: '#b08028', emoji: '🐾', kind: 'spending', builtin: true },
  { id: 'charity', label: 'Charity & Gifts', color: '#c2506b', emoji: '🎁', kind: 'spending', builtin: true },
  { id: 'tithes', label: 'Tithes & Offerings', color: '#7b3fbf', emoji: '🙏', kind: 'spending', builtin: true },
  { id: 'fees', label: 'Fees & Taxes', color: '#857b6b', emoji: '🧾', kind: 'spending', builtin: true },
  { id: 'zelle', label: 'Zelle', color: '#3796bc', emoji: '💸', kind: 'excluded', builtin: true },
  { id: 'income', label: 'Income', color: '#2f8749', emoji: '💰', kind: 'income', builtin: true },
  { id: 'transfers', label: 'Transfers', color: '#98917f', emoji: '🔁', kind: 'excluded', builtin: true },
  { id: 'other', label: 'Other', color: '#a79e8c', emoji: '📦', kind: 'spending', builtin: true },
]

const FALLBACK = (id: string): CategoryDef => ({
  id,
  label: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Other',
  color: '#a79e8c',
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

export function isSpendingCategory(id: Category): boolean {
  return categoryDef(id).kind === 'spending'
}

/** A stable id for a new custom category derived from its label. */
export function makeCategoryId(label: string): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
  let id = `custom-${base}`
  let n = 2
  while (byId.has(id)) id = `custom-${base}-${n++}`
  return id
}
