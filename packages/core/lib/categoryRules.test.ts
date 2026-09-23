import { describe, expect, it } from 'vitest'
import { countRuleMatches, matchCategoryRule, type CategoryRule } from './categoryRules'

// The rental case: costs correctly categorized, but on the wrong ledger.
const RULES: CategoryRule[] = [
  { pattern: 'MAPLE COURT', category: 'business' },
  { pattern: 'CEDARBROOK MTG', category: 'business' },
  { pattern: 'TURBOTENANT', category: 'business' },
]

describe('matchCategoryRule', () => {
  it('matches a description containing the pattern, ignoring case', () => {
    expect(matchCategoryRule('maple court rent:unit b', RULES)).toBe('business')
    expect(matchCategoryRule('CEDARBROOK MTG PYMTS', RULES)).toBe('business')
  })

  it('ignores extra whitespace on either side', () => {
    expect(matchCategoryRule('CEDARBROOK   MTG  PYMTS', RULES)).toBe('business')
    expect(matchCategoryRule('X', [{ pattern: '  x  ', category: 'home' }])).toBe('home')
  })

  it('returns nothing when no rule applies', () => {
    expect(matchCategoryRule('CORNER COFFEE ROASTERS', RULES)).toBeUndefined()
    expect(matchCategoryRule('anything', [])).toBeUndefined()
  })

  it('lets the more specific pattern win, whatever order they were added', () => {
    const rules: CategoryRule[] = [
      { pattern: 'BRIGHTLINE', category: 'utilities' },
      { pattern: 'BRIGHTLINE ENERGY UNIT B', category: 'business' },
    ]
    expect(matchCategoryRule('BRIGHTLINE ENERGY UNIT B 08/12', rules)).toBe('business')
    expect(matchCategoryRule('BRIGHTLINE ENERGY 08/12', rules)).toBe('utilities')
    // Same rules, reversed — the answer must not depend on insertion order.
    expect(matchCategoryRule('BRIGHTLINE ENERGY UNIT B 08/12', [...rules].reverse())).toBe('business')
  })

  it('ignores an empty pattern rather than matching everything', () => {
    expect(matchCategoryRule('CORNER COFFEE', [{ pattern: '   ', category: 'business' }])).toBeUndefined()
  })
})

describe('countRuleMatches', () => {
  const descriptions = [
    'MAPLE COURT RENT:UNIT B',
    'MAPLE COURT RENT:UNIT B',
    'CEDARBROOK MTG PYMTS',
    'CORNER COFFEE ROASTERS',
  ]

  it('counts how many rows a rule would catch', () => {
    expect(countRuleMatches(descriptions, RULES[0])).toBe(2)
    expect(countRuleMatches(descriptions, RULES[1])).toBe(1)
    expect(countRuleMatches(descriptions, RULES[2])).toBe(0)
  })

  it('counts nothing for an empty pattern', () => {
    expect(countRuleMatches(descriptions, { pattern: '', category: 'business' })).toBe(0)
  })
})
