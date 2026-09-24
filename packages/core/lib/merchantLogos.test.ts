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

describe('brandSlugFor: the way banks really print them', () => {
  it.each([
    // Brands that were already covered, in their common variants
    ["MCDONALD'S F1234 AUSTIN TX", 'mcdonalds'],
    ['MCDONALDS #4471', 'mcdonalds'],
    ['MC DONALDS 2210', 'mcdonalds'],
    ['McDonald’s #88', 'mcdonalds'],
    ['NIKE.COM BEAVERTON OR', 'nike'],
    ['NIKE STORE #0123', 'nike'],
    ['APPLE.COM/BILL', 'apple'],
    ['APPLE.COM/US 1 800 275 2273', 'apple'],
    ['NETFLIX.COM LOS GATOS CA', 'netflix'],
    ['VZWRLSS*APOCC VISB', 'verizon'],
    ['STARBUCKS #12345 AUSTIN TX', 'starbucks'],
    // Requested brands Simple Icons still carries
    ['ZARA USA 0123 AUSTIN TX', 'zara'],
    ['ZARA.COM', 'zara'],
    ['H&M 0456 AUSTIN TX', 'hm'],
    ['H & M HENNES & MAURITZ', 'hm'],
    ['HM.COM', 'hm'],
    ['GOOGLE *GOOGLE ONE', 'google'],
    ['GOOGLE *STORAGE 650-253-0000', 'google'],
    ['GOOGLE.COM', 'google'],
    ['AT&T*BILL PAYMENT', 'att'],
    ['ATT*BILL PAYMENT', 'att'],
    ['ATT BILL PAYMT', 'att'],
    ['AT & T MOBILITY', 'att'],
    ['STEAMGAMES.COM 4259522985', 'steam'],
    ['STEAM PURCHASE 425-952-2985 WA', 'steam'],
    ['Steam Wallet', 'steam'],
    // Streaming, software and subscriptions
    ['GOOGLE *YOUTUBETV', 'youtubetv'],
    ['YOUTUBE PREMIUM GOOGLE.COM/YT', 'youtube'],
    ['GOOGLE *PLAY APPS', 'googleplay'],
    ['APPLE TV+', 'appletv'],
    ['ROKU FOR TV 888-600-7658', 'roku'],
    ['CRUNCHYROLL.COM', 'crunchyroll'],
    ['PANDORA MEDIA 877-704-1888', 'pandora'],
    ['PANDORA*PREMIUM', 'pandora'],
    ['TWITCH.TV', 'twitch'],
    ['FUBOTV INC', 'fubo'],
    ['EPIC GAMES INC', 'epicgames'],
    ['ROBLOX.COM 888-858-2569', 'roblox'],
    ['DROPBOX*4XYZ12', 'dropbox'],
    ['ZOOM.US 888-799-9666', 'zoom'],
    ['NOTION LABS, INC.', 'notion'],
    ['GITHUB, INC.', 'github'],
    ['FIGMA MONTHLY', 'figma'],
    ['GRAMMARLY 415-000-0000', 'grammarly'],
    ['EVERNOTE CORP', 'evernote'],
    ['1PASSWORD', 'onepassword'],
    ['NORDVPN.COM', 'nordvpn'],
    ['EXPRESSVPN', 'expressvpn'],
    ['PATREON* MEMBERSHIP', 'patreon'],
    ['SUBSTACK INC', 'substack'],
    ['ANTHROPIC, PBC', 'claude'],
    ['CLAUDE.AI SUBSCRIPTION', 'claude'],
    ['INTUIT *QUICKBOOKS', 'quickbooks'],
    ['INTUIT *TURBOTAX', 'intuit'],
    ['COURSERA.ORG', 'coursera'],
    ['UDEMY ONLINE COURSES', 'udemy'],
    ['SKILLSHARE.COM', 'skillshare'],
    ['HEADSPACE INC.', 'headspace'],
    ['STRAVA INC', 'strava'],
    ['TINDER*GOLD', 'tinder'],
    ['DISCORD* NITRO', 'discord'],
    ['TICKETMASTER *EVENT', 'ticketmaster'],
    ['STUBHUB, INC', 'stubhub'],
    ['SEATGEEK', 'seatgeek'],
    ['FANDANGO 8005550100', 'fandango'],
    ['ZILLOW RENTALS', 'zillow'],
    ['YELP*ADS', 'yelp'],
    // Food, shopping, phone, utilities, travel, money
    ['KFC #B123 AUSTIN TX', 'kfc'],
    ['KENTUCKY FRIED CHICKEN', 'kfc'],
    ["MACY'S #0123", 'macys'],
    ['MACYS.COM', 'macys'],
    ["SAM'S CLUB #6543", 'samsclub'],
    ['SAMS CLUB 8123', 'samsclub'],
    ['ADIDAS AMERICA', 'adidas'],
    ['UNDER ARMOUR #123', 'underarmour'],
    ['NEW BALANCE ATHLETICS', 'newbalance'],
    ['PUMA NORTH AMERICA', 'puma'],
    ['UNIQLO USA LLC', 'uniqlo'],
    ['DELL MARKETING L.P.', 'dell'],
    ['DELL.COM', 'dell'],
    ['SAMSUNG ELECTRONICS', 'samsung'],
    ['CHARTER SPECTRUM', 'spectrum'],
    ['SPECTRUM INTERNET 855-555-0100', 'spectrum'],
    ['NATIONAL GRID NY', 'nationalgrid'],
    ['JETBLUE 2792345678', 'jetblue'],
    ['HOTELS.COM 7284012', 'hotelsdotcom'],
    ['BOOKING.COM HOTEL', 'booking'],
    ['EXPEDIA 7284012345', 'expedia'],
    ['TRIPADVISOR LLC', 'tripadvisor'],
    ['ROBINHOOD CARD', 'robinhood'],
    ['COINBASE.COM', 'coinbase'],
    ['WESTERN UNION MONEY TRANSFER', 'westernunion'],
    ['WISE US INC', 'wise'],
    ['KLARNA*SOMESHOP', 'klarna'],
    // Shipping, cars
    ['UPS*1Z999AA10123456784', 'ups'],
    ['THE UPS STORE #1234', 'ups'],
    ['FEDEX 123456789', 'fedex'],
    ['USPS PO 0123456789 AUSTIN TX', 'usps'],
    ['DHL EXPRESS', 'dhl'],
    ['TESLA SUPERCHARGER', 'tesla'],
    ['TESLA INC', 'tesla'],
    ['FORD CREDIT AUTO PMT', 'ford'],
    ['TOYOTA MOTOR CREDIT', 'toyota'],
    ['AMERICAN HONDA FINANCE', 'honda'],
    ['HYUNDAI MOTOR FINANCE', 'hyundai'],
    ['NISSAN MOTOR ACCEPTANCE', 'nissan'],
    ['SUBARU MOTORS FINANCE', 'subaru'],
    ['KIA MOTORS FINANCE', 'kia'],
    ['MAZDA AMERICAN CREDIT', 'mazda'],
    ['BMW FINANCIAL SERVICES', 'bmw'],
    ['VW CREDIT INC', 'volkswagen'],
    ['AUTOZONE #1234', 'autozone'],
  ])('%s → %s', (description, slug) => {
    expect(brandSlugFor(description)).toBe(slug)
  })

  it('lets the merchant beat the wrapper carrying it', () => {
    expect(brandSlugFor('KLARNA*NIKE')).toBe('nike')
    expect(brandSlugFor('GOOGLE *YOUTUBE PREMIUM')).toBe('youtube')
    expect(brandSlugFor('EXPEDIA*HOTELS.COM')).toBe('hotelsdotcom')
  })

  it('never reads a person’s name as a brand', () => {
    expect(brandSlugFor('Zelle payment to Ford Anderson')).toBe('zelle')
    expect(brandSlugFor('Zelle payment from Zara Kim')).toBe('zelle')
    expect(brandSlugFor('VENMO PAYMENT TO Tesla Nguyen')).toBe('venmo')
    expect(brandSlugFor('CASH APP*KIA JONES')).toBe('cashapp')
    expect(brandSlugFor('Zelle payment to Wise Guy')).toBe('zelle')
  })

  it('stays quiet on look-alikes, ordinary words and first names', () => {
    for (const d of [
      "ZARA'S BAKERY 0012", // not Zara the clothing chain
      'ZARA THAI KITCHEN',
      'PANDORA JEWELRY #1042', // the jewelry store, not the music service
      'TINDER BOX CIGARS',
      'STEAM CARPET CLEANING',
      'STEAMBOAT COFFEE',
      'CUPS COFFEE HOUSE', // "ups" inside a word
      'PICK UPS AND DELIVERIES',
      'ATTORNEY LAW OFFICE',
      'BATT & TIRE',
      'MATT & TOM ELECTRIC',
      'CAT & TOY SHOP',
      'AT TOM SMITH DDS',
      'NATIONAL GRIDIRON CLUB',
      'SPECTRUM ART SUPPLY', // "spectrum" alone is too ordinary
      'PUMA ENERGY GAS',
      'DELL CURRY TRAINING',
      'FORD MEADOWS LANDSCAPING',
      'FORDHAM BOOKS',
      'KIA ORA CAFE',
      'TESLA COIL SUPPLY',
      'NOTION FURNITURE',
      'ZOOM PLUMBING',
      'GOOGLES BURGERS',
      'NEW BALANCE DUE',
      'DISCORDIA PIZZA',
      'INTUITION YOGA STUDIO',
      'HEAD SPACE BARBERS INC',
      'MACY SMITH CONSULTING',
      'HMMM COFFEE',
      'WISE OWL BOOKS',
      'USPSTAIRS CAFE',
      'ALDI 72055',
    ]) {
      expect(brandSlugFor(d), d).toBeNull()
    }
  })

  // Amazon, Walmart, Hulu, Disney+, Adobe, Microsoft, T-Mobile and most US
  // chains aren't in Simple Icons, so they have no logo to show. The point of
  // pinning these to null is that a look-alike rule can never hand them some
  // other company's mark; callers fall back to their usual icon.
  it('leaves brands without a bundled logo on the fallback', () => {
    for (const d of [
      'WAL-MART SUPERCENTER #1234',
      'WM SUPERCENTER #1234',
      'AMZN Mktp US*2K4TR8 AMZN.COM/BILL WA',
      'AMAZON PRIME*1A2B3C',
      'H-E-B #482 AUSTIN TX',
      'DISNEY PLUS 888-905-7888 CA',
      'HULU 877-8244858 CA',
      'ADOBE *CREATIVE CLOUD',
      'MICROSOFT*MICROSOFT 365 MSBILL.INFO',
      'COSTCO WHSE #0123',
      'CHIPOTLE 1234',
      'HOME DEPOT #6789',
      "LOWE'S #1234",
      'BEST BUY 00001234',
      'CVS/PHARMACY #08765',
      'WALGREENS #4321',
      "TRADER JOE'S #123",
      'WHOLE FOODS MKT #10234',
      'KROGER #0456',
      'DUNKIN #345678',
      'SUBWAY 12345',
      'PANERA BREAD #4567',
      'CHICK-FIL-A #01234',
      'T-MOBILE AUTOPAY',
      'EXXONMOBIL 4567',
    ]) {
      expect(brandSlugFor(d), d).toBeNull()
    }
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
