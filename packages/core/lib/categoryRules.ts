/**
 * "Anything whose description contains X is category Y."
 *
 * The existing ways to remember a category are tied to a row (txOverrides), a
 * description (overrides) or a merchant (merchantOverrides), and all three are
 * created by editing something that already exists. A rule is the other
 * direction: state it once, and every matching row — including ones imported
 * months from now — follows it.
 *
 * It exists for money that belongs to a separate ledger. Someone who co-owns
 * a rental has tenant rent, a mortgage, vacancy utilities and letting fees
 * scattered across three accounts, all correctly categorized and all wrong to
 * mix into personal spending. A handful of rules re-files the lot.
 */
import type { Category } from '../types'

export interface CategoryRule {
  /** Case-insensitive substring of the description. */
  pattern: string
  category: Category
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * The category for the first matching rule, or undefined. Longer patterns are
 * tried first, so a specific rule beats a general one whatever order the user
 * happened to add them in.
 */
export function matchCategoryRule(
  description: string,
  rules: CategoryRule[] = [],
): Category | undefined {
  if (rules.length === 0) return undefined
  const d = normalize(description)
  let best: CategoryRule | undefined
  for (const r of rules) {
    const p = normalize(r.pattern)
    if (!p || !d.includes(p)) continue
    if (!best || p.length > normalize(best.pattern).length) best = r
  }
  return best?.category
}

/** How many of these transactions a rule would catch, for the Settings list. */
export function countRuleMatches(descriptions: string[], rule: CategoryRule): number {
  const p = normalize(rule.pattern)
  if (!p) return 0
  let n = 0
  for (const d of descriptions) if (normalize(d).includes(p)) n++
  return n
}
