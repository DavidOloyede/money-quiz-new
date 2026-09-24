import { describe, expect, it } from 'vitest'
import { brandFor, brandSlugFor, brandSlugForAny } from './merchantLogos'
import { BRAND_ICONS } from '../data/brandIcons'

describe('brandSlugFor', () => {
  it.each([
    ['STARBUCKS STORE 13390', 'starbucks'],
    ["MCDONALD'S F12345", 'mcdonalds'],
    ['Mcdonald', 'mcdonalds'],
    ['NETFLIX.COM 866-579-7172', 'netflix'],
    ['Spotify USA', 'spotify'],
    ['APPLE.COM/BILL 866-712-7753 CA', 'apple'],
    ['SHELL OIL 57442', 'shell'],
    ['TARGET 00012345 AUSTIN TX', 'target'],
    ['VERIZON WIRELESS', 'verizon'],
    ['UBER *TRIP HELP.UBER.COM', 'uber'],
    ['UBER EATS', 'ubereats'],
    ['DELTA AIR LINES 0062', 'delta'],
    ['CHASE CREDIT CRD AUTOPAY', 'chase'],
  ])('%s → %s', (description, slug) => {
    expect(brandSlugFor(description)).toBe(slug)
  })

  it('finds the merchant a payment wrapper is carrying', () => {
    expect(brandSlugFor('PAYPAL *NETFLIX')).toBe('netflix')
    expect(brandSlugFor('PAYPAL *SOMESHOP')).toBe('paypal')
  })

  it('gives peer payments the service’s logo, never the person’s name', () => {
    expect(brandSlugFor('Zelle payment to Chase Miller')).toBe('zelle')
    expect(brandSlugFor('Zelle payment from Dana Target')).toBe('zelle')
    expect(brandSlugFor('VENMO PAYMENT TO Uber Smith')).toBe('venmo')
    expect(brandSlugFor('CASH APP*PRIYA RAMAN')).toBe('cashapp')
  })

  it('stays quiet on look-alike words and unknown merchants', () => {
    expect(brandSlugFor('DELTA DENTAL OF TEXAS')).toBeNull()
    expect(brandSlugFor('DISCOVERY GREEN PARKING')).toBeNull()
    expect(brandSlugFor('ONLINE PURCHASE 4411')).toBeNull()
    expect(brandSlugFor('SEASHELL CAFE')).toBeNull()
    expect(brandSlugFor("APPLEBEE'S 1182")).toBeNull()
    expect(brandSlugFor('STEAM CARPET CLEANING')).toBeNull()
    expect(brandSlugFor('CORNER COFFEE ROASTERS')).toBeNull()
  })
})

describe('brandSlugForAny', () => {
  it('prefers the first name that matches', () => {
    expect(brandSlugForAny('Apple', 'APPLE.COM/BILL')).toBe('apple')
    expect(brandSlugForAny('Netflix', 'PAYPAL *SOMETHING')).toBe('netflix')
    expect(brandSlugForAny(undefined, 'Corner Coffee')).toBeNull()
  })
})

describe('brandFor', () => {
  it('returns the icon data for a known merchant', () => {
    const icon = brandFor('NETFLIX.COM')
    expect(icon).toBe(BRAND_ICONS.netflix)
    expect(icon?.hex).toMatch(/^[0-9A-F]{6}$/)
    expect(icon?.path.length).toBeGreaterThan(10)
  })

  it('returns null when we have no logo', () => {
    expect(brandFor('BASIL & BRICK PIZZA')).toBeNull()
  })
})
