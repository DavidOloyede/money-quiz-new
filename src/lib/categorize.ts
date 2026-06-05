import type { Category, Transaction } from '../types'

/**
 * Ordered keyword rules. The first rule whose keyword appears in the (lowercased)
 * description wins, so more specific / higher-priority categories come first.
 * Income is checked first so a positive "refund" is income, not shopping; dining
 * is checked before transport so "Uber Eats" doesn't become a car ride.
 */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: 'income',
    keywords: [
      'payroll',
      'salary',
      'paycheck',
      'direct deposit',
      'dividend',
      'tax refund',
      'irs',
      'treasury',
      'refund',
      'reimburs',
      'zelle from',
      'venmo from',
      'cashback',
    ],
  },
  {
    category: 'dining',
    keywords: [
      'uber eats',
      'ubereats',
      'doordash',
      'grubhub',
      'restaurant',
      'cafe',
      'coffee',
      'starbucks',
      'dunkin',
      'chipotle',
      'mcdonald',
      'burger',
      'pizza',
      'taco',
      'sushi',
      'grill',
      'kitchen',
      'diner',
      'bistro',
      'olive garden',
      'cheesecake',
      'panera',
      'subway',
      'chick-fil-a',
      'in-n-out',
      'wendy',
      'kfc',
      'popeye',
      'shake shack',
      'eatery',
      'bakery',
    ],
  },
  {
    category: 'groceries',
    keywords: [
      'grocery',
      'supermarket',
      'trader joe',
      'whole foods',
      'safeway',
      'kroger',
      'aldi',
      'costco',
      'wegmans',
      'publix',
      'food lion',
      'sprouts',
      'ralphs',
      'vons',
      'h-e-b',
      'heb',
      'giant food',
      'market basket',
    ],
  },
  {
    category: 'transport',
    keywords: [
      'uber',
      'lyft',
      'gas station',
      'shell',
      'chevron',
      'exxon',
      'mobil',
      'bp ',
      'fuel',
      'parking',
      'transit',
      'metro',
      'bart',
      'caltrain',
      'amtrak',
      'toll',
      'dmv',
      'car wash',
      'auto repair',
      'airlines',
      'airline',
      'delta air',
      'united air',
      'southwest air',
    ],
  },
  {
    category: 'utilities',
    keywords: [
      'comcast',
      'xfinity',
      'verizon',
      'at&t',
      't-mobile',
      'sprint',
      'pg&e',
      'electric',
      'water bill',
      'gas company',
      'gas bill',
      'internet',
      'wireless',
      'utility',
      'con edison',
      'duke energy',
      'spectrum',
      'cox communications',
      'phone bill',
      'sewer',
    ],
  },
  {
    category: 'rent',
    keywords: [
      'rent',
      'mortgage',
      'landlord',
      'apartments',
      'apartment',
      'leasing',
      'property mgmt',
      'property management',
      'hoa',
    ],
  },
  {
    category: 'shopping',
    keywords: [
      'amazon',
      'target',
      'walmart',
      'best buy',
      'ebay',
      'etsy',
      'ikea',
      'home depot',
      "lowe's",
      'lowes',
      'macy',
      'nordstrom',
      'nike',
      'adidas',
      'apple store',
      'clothing',
      'old navy',
      'gap ',
      'h&m',
      'zara',
    ],
  },
  {
    category: 'entertainment',
    keywords: [
      'netflix',
      'spotify',
      'hulu',
      'disney',
      'hbo',
      'youtube',
      'amc',
      'cinema',
      'theatre',
      'theater',
      'movie',
      'steam',
      'playstation',
      'xbox',
      'nintendo',
      'twitch',
      'ticketmaster',
      'stubhub',
      'audible',
      'prime video',
      'concert',
    ],
  },
  {
    category: 'health',
    keywords: [
      'pharmacy',
      'cvs',
      'walgreens',
      'rite aid',
      'gym',
      'fitness',
      'doctor',
      'dental',
      'dentist',
      'clinic',
      'hospital',
      'medical',
      'optometry',
      'vision',
      'therapy',
      'wellness',
      'health',
    ],
  },
]

/**
 * Normalize text to space-delimited tokens so keyword matching respects word
 * boundaries. Lowercases, turns any run of non-alphanumeric (except &) into a
 * single space, and pads with spaces. This prevents substring false positives
 * like "macy" matching inside "pharmacy" or "irs" inside "First".
 */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim().replace(/\s+/g, ' ')} `
}

const NORM_RULES = RULES.map((r) => ({
  category: r.category,
  keys: r.keywords.map(normalize),
}))

/** Auto-categorize from the description and amount sign. */
export function categorize(description: string, amount: number): Category {
  const d = normalize(description)
  for (const rule of NORM_RULES) {
    if (rule.keys.some((k) => d.includes(k))) return rule.category
  }
  // No keyword matched: a positive amount is most likely income.
  if (amount > 0) return 'income'
  return 'other'
}

/** Normalize a description into a stable key for remembering overrides. */
export function overrideKey(description: string): string {
  return description.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Re-apply remembered category overrides (keyed by normalized description) to a
 * freshly imported set, so manual fixes survive re-imports.
 */
export function applyOverrides(
  transactions: Transaction[],
  overrides: Record<string, Category>,
): Transaction[] {
  if (!overrides || Object.keys(overrides).length === 0) return transactions
  return transactions.map((t) => {
    const o = overrides[overrideKey(t.description)]
    return o ? { ...t, category: o, overridden: true } : t
  })
}
