import type { Category, Transaction } from '../types'

/**
 * A credit-card bill paid FROM a checking account, e.g. "CITI CARD ONLINE
 * PAYMENT … WEB ID: CITICTP". The card's own statement already lists the
 * purchases, so counting the payment too would double-count every one of them.
 * Requires an issuer AND a payment word AND a card word (or an unambiguous
 * epay/autopay marker), so a loan bill from the same bank — "CAPITAL ONE AUTO
 * FINANCE PAYMENT" — is left alone for the loans rule below.
 */
const CARD_ISSUER_RE =
  /\b(citi|citibank|citictp|chase|amex|american express|discover|capital one|capitalone|bofa|bank of america|barclays?|synchrony|wells fargo|usaa|us bank|apple card)\b/
const CARD_WORD_RE = /\b(card|crd|cardmember|visa|mastercard)\b/
const CARD_PAY_RE = /\b(payment|payments|pymt|pymts|pmt|pmts|epay|epayment|autopay)\b/
const CARD_AUTOPAY_RE = /\b(epay|epayment|autopay)\b/

function isCardBillPayment(normalized: string, amount: number): boolean {
  // Money out only: a positive "payment" row on a card statement is the same
  // event seen from the other side, and import drops those separately.
  if (amount >= 0) return false
  if (!CARD_ISSUER_RE.test(normalized) || !CARD_PAY_RE.test(normalized)) return false
  return CARD_WORD_RE.test(normalized) || CARD_AUTOPAY_RE.test(normalized)
}

/**
 * Ordered keyword rules. The first rule whose keyword appears in the (tokenized)
 * description wins, so more specific / higher-priority categories come first.
 * Transfers and Zelle are checked first so internal money movement never looks
 * like spending or income; dining is checked before transport so "Uber Eats"
 * doesn't become a car ride.
 *
 * `direction` restricts a rule to one side of the ledger. It exists because a
 * keyword can mean opposite things by sign: rent paid is housing *spending*,
 * but rent received is *income* from a tenant — and without this, money in
 * landed in a spending category, where `isRefund` quietly treated it as a
 * refund that shrank your housing costs.
 *
 * `test` is for rules that need more than a keyword (see isCardBillPayment).
 */
interface Rule {
  category: Category
  keywords: string[]
  /** 'out' = only negative amounts, 'in' = only positive. Default: either. */
  direction?: 'out' | 'in'
  /** Extra matcher, given the normalized description and the signed amount. */
  test?: (normalized: string, amount: number) => boolean
}

const RULES: Rule[] = [
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
    // Paying off a credit card from checking. Checked after Zelle (so a Zelle
    // row naming a bank can't be stolen) and before loans (the test itself
    // refuses loan bills).
    category: 'transfers',
    keywords: [],
    direction: 'out',
    test: isCardBillPayment,
  },
  {
    // NOTE: 'refund', 'reimburs' and 'cashback' deliberately do NOT live here.
    // Landing them in the income category made `isRefund` — money in, in a
    // *spending* category — permanently false for them, so an "AMAZON REFUND"
    // inflated income and never netted against what it refunded. Without the
    // keyword they fall through to the merchant's own rule (Amazon → Shopping)
    // and net correctly. A tax refund really is income, so it stays.
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
      'venmo from',
      'interest paid',
    ],
  },
  {
    // Loan & debt payments (student loans, auto/personal loans). Checked before
    // transport so "auto loan" is debt, not a car expense. Credit-card *payment*
    // rows are dropped at import / treated as transfers, not here.
    category: 'loans',
    keywords: [
      'student loan',
      'studentloan',
      'studntloan',
      'sallie mae',
      'salliemae',
      'nelnet',
      'navient',
      'mohela',
      'aidvantage',
      'great lakes',
      'fedloan',
      'college access',
      'dept of education',
      'department of education',
      'advs ed serv',
      'thecb',
      'earnest',
      'loan payment',
      'loan pymt',
      'loan pmt',
      'auto loan',
      'car loan',
      'personal loan',
      'lending club',
      'upstart',
      'affirm',
    ],
  },
  {
    // Insurance of all kinds. Checked before transport so auto carriers (GEICO,
    // State Farm…) land here instead of being read as a car expense.
    category: 'insurance',
    keywords: [
      'insurance',
      'ins prem',
      'policy premium',
      'geico',
      'progressive',
      'state farm',
      'allstate',
      'nationwide',
      'liberty mutual',
      'farmers ins',
      'metlife',
      'prudential',
      'aflac',
      'globe life',
      'aetna',
      'cigna',
      'blue cross',
      'blue shield',
      'unitedhealthcare',
      'united healthcare',
      'humana',
      'benefits',
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
      'mta',
      'nyct',
      'njt',
      'nj transit',
      'paygo',
      'septa',
      'wmata',
      'mbta',
      'rail',
      'ez tag',
      'hctra',
      'dmv',
      'car wash',
      'jiffy lube',
      'auto repair',
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
      'primo water',
      'culligan',
      'water delivery',
    ],
  },
  {
    // HOA dues and home upkeep that isn't rent/mortgage. Checked before rent so
    // "HOA" doesn't get swept into the rent bucket. Listing and management
    // services for a property you own (Zillow, TurboTenant) belong here too —
    // they're a cost of the home, not rent you pay.
    category: 'home',
    keywords: [
      'hoa',
      'homeowner',
      'home owner',
      'owners association',
      'owners assn',
      'community association',
      'community assoc',
      'condo assoc',
      'condominium assoc',
      'property owners',
      'pest control',
      'lawn care',
      'landscaping',
      'home warranty',
      'turbotenant',
      'zillow',
      'apartments com',
    ],
  },
  {
    // Housing you PAY for. Money in that matches these words is rent received
    // from a tenant, which is income — see the `direction` note above.
    category: 'rent',
    direction: 'out',
    keywords: [
      'rent',
      'mortgage',
      'mtg',
      'mtge',
      'landlord',
      'apartments',
      'apartment',
      'leasing',
      'property mgmt',
      'property management',
    ],
  },
  {
    // Salons, barbers, nails, spa, and beauty retailers. Checked before shopping
    // so beauty stores (Sephora, Ulta) don't land in generic Shopping.
    category: 'personal',
    keywords: [
      'salon',
      'barber',
      'barbershop',
      'haircut',
      'hair studio',
      'nails',
      'nail bar',
      'manicure',
      'pedicure',
      'spa',
      'sephora',
      'ulta',
      'sally beauty',
      'great clips',
      'supercuts',
      'sport clips',
      'massage',
      'waxing',
      'brow bar',
    ],
  },
  {
    category: 'shopping',
    keywords: [
      'amazon',
      'target',
      'walmart',
      'best buy',
      'electronics',
      'department store',
      'dept store',
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
      'james avery',
      'usps',
      'post office',
      'ups store',
      'fedex',
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
    // Tuition, schools, and learning platforms. Checked before subscriptions so
    // course platforms (Chegg, Coursera…) read as Education, not generic SaaS.
    category: 'education',
    keywords: [
      'tuition',
      'university',
      'campus',
      'chegg',
      'coursera',
      'udemy',
      'duolingo',
      'khan academy',
      'pearson',
      'mcgraw',
      'textbook',
      'bookstore',
      'scholarship',
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
    ],
  },
  {
    // Tithes & offerings get their own bucket (kept separate from charity so the
    // giving total is clear and quiz questions can lean on it).
    category: 'tithes',
    keywords: ['tithe', 'tithes', 'tithing', 'offering', 'offerings', 'firstfruits'],
  },
  {
    // Donations and gifts. Placed near the end so it only catches explicit
    // giving keywords.
    category: 'charity',
    keywords: [
      'donation',
      'donate',
      'charitable',
      'charity',
      'ministries',
      'ministry',
      'diocese',
      'synagogue',
      'mosque',
      'red cross',
      'st jude',
      'salvation army',
      'unicef',
      'gofundme',
    ],
  },
  {
    // Bank/account fees and taxes paid (not refunds, which are income above).
    category: 'fees',
    keywords: [
      'overdraft fee',
      'overdraft charge',
      'service charge',
      'service fee',
      'monthly fee',
      'maintenance fee',
      'atm fee',
      'late fee',
      'annual fee',
      'finance charge',
      'interest charge',
      'foreign transaction fee',
      'wire fee',
      'nsf fee',
      'franchise tax',
      'tax pymt',
      'taxpymt',
      'property tax',
      'ownwell',
      'plan fee',
    ],
  },
  {
    // Pets — vets and pet stores. Checked before health so "animal hospital"
    // doesn't read as a (human) hospital visit.
    category: 'pets',
    keywords: [
      'petco',
      'petsmart',
      'chewy',
      'pet supplies',
      'petsuppliesplus',
      'veterinary',
      'veterinarian',
      'animal hospital',
      'animal clinic',
      'pet hospital',
      'vet clinic',
      'rover.com',
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
  direction: r.direction,
  test: r.test,
}))

/** What `categorizeMatch` returns: the category, and whether a rule actually fired. */
export interface CategoryGuess {
  category: Category
  /**
   * True when a rule matched. False means we fell back on the sign alone, and
   * the caller may prefer another source (e.g. a bank's own category column).
   */
  matched: boolean
}

/**
 * Auto-categorize from the description and amount sign, reporting whether a
 * rule actually matched. Import uses the `matched` flag to decide between our
 * keywords and the bank's category column.
 */
export function categorizeMatch(description: string, amount: number): CategoryGuess {
  const d = normalize(description)
  for (const rule of NORM_RULES) {
    if (rule.direction === 'out' && amount > 0) continue
    if (rule.direction === 'in' && amount < 0) continue
    if (rule.test?.(d, amount)) return { category: rule.category, matched: true }
    if (rule.keys.some((k) => d.includes(k))) return { category: rule.category, matched: true }
  }
  // No rule matched: a positive amount is most likely income.
  return { category: amount > 0 ? 'income' : 'other', matched: false }
}

/** Auto-categorize from the description and amount sign. */
export function categorize(description: string, amount: number): Category {
  return categorizeMatch(description, amount).category
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
