import type { Category, Transaction } from '../types'

/**
 * Ordered keyword rules. The first rule whose keyword appears in the (tokenized)
 * description wins, so more specific / higher-priority categories come first.
 * Transfers and Zelle are checked first so internal money movement never looks
 * like spending or income; dining is checked before transport so "Uber Eats"
 * doesn't become a car ride.
 */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    // Money moving between your own accounts or paying off a card — not real
    // spending. Checked first so a "Payment to Chase card" never looks like a
    // purchase. (Credit-card statements' own payment rows are dropped at import.)
    category: 'transfers',
    keywords: [
      'card ending in',
      'payment to chase card',
      'payment thank you',
      'online transfer',
      'wire transfer',
      'account transfer',
      'overdraft transfer',
      'transfer to sav',
      'transfer from sav',
      'transfer to chk',
      'transfer from chk',
      'autopay',
      '401k',
      'empower',
    ],
  },
  {
    // Zelle gets its own bucket instead of being lumped into "other". Checked
    // before income so "Zelle payment from ..." stays Zelle, not income.
    category: 'zelle',
    keywords: ['zelle'],
  },
  {
    category: 'income',
    keywords: [
      'payroll',
      'salary',
      'paycheck',
      'direct deposit',
      'dividend',
      'tax refund',
      'tax ref',
      'irs',
      'treasury',
      'treas',
      'refund',
      'reimburs',
      'venmo from',
      'cashback',
      'interest paid',
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
      'caffe',
      'coffee',
      'starbucks',
      'dunkin',
      'chipotle',
      'mcdonald',
      'burger',
      'whataburger',
      'pizza',
      'taco',
      'sushi',
      'grill',
      'kitchen',
      'diner',
      'bistro',
      'deli',
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
      'donut',
      'do-nuts',
      'jersey mike',
      'five guys',
      'papa john',
      'wingstop',
      'shipley',
      'juiceland',
      'cava',
      'pho',
      'birria',
      'jupiter pizza',
      'nothing bundt',
      'sweet frog',
      'broken egg',
      'ploughman',
      'govindas',
      'cooking girl',
      'mi sombrero',
      'via 313',
      'marmo',
      'chopnblok',
    ],
  },
  {
    category: 'groceries',
    keywords: [
      'grocery',
      'supermarket',
      'trader joe',
      'whole foods',
      'wholefds',
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
      'supercenter',
      'farmers mark',
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
      'garage',
      'transit',
      'metro',
      'bart',
      'caltrain',
      'amtrak',
      'toll',
      'ez tag',
      'hctra',
      'dmv',
      'car wash',
      'jiffy lube',
      'auto repair',
      'geico',
      'progressive',
      'state farm',
      'airlines',
      'airline',
      'delta air',
      'united air',
      'southwest air',
      'race park',
      'valet',
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
      'energy',
      'water bill',
      'gas company',
      'gas bill',
      'internet',
      'wireless',
      'utility',
      'con edison',
      'duke energy',
      'champion energy',
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
      'owners association',
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
      'sally beauty',
      'james avery',
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
      'cinemark',
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
      'skating',
      'youtube premium',
      'youtubepremium',
    ],
  },
  {
    // Software & online services that bill on a recurring basis. Checked after
    // entertainment so media streaming (Netflix, Spotify) stays Entertainment.
    category: 'subscriptions',
    keywords: [
      'subscription',
      'apple.com',
      'apple.com/bill',
      'itunes',
      'github',
      'figma',
      'claude.ai',
      'claude',
      'anthropic',
      'openai',
      'chatgpt',
      'adobe',
      'microsoft',
      'msft',
      'office 365',
      'microsoft 365',
      'dropbox',
      'notion',
      'zoom.us',
      'godaddy',
      'namecheap',
      'cloudflare',
      'digitalocean',
      'heroku',
      'vercel',
      'netlify',
      '1password',
      'lastpass',
      'nordvpn',
      'expressvpn',
      'grammarly',
      'canva',
      'substack',
      'patreon',
      'booksy',
      'squarespace',
      'mailchimp',
      'google one',
      'google storage',
      'google workspace',
      'icloud',
      'chegg',
      'coursera',
      'udemy',
      'duolingo',
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
