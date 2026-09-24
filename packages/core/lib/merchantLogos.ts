/**
 * Which company logo, if any, belongs beside a transaction. The logos are the
 * hand-picked set in data/brandIcons.ts and ship inside the app, so spotting
 * one never sends a merchant name anywhere — that's why we match descriptors
 * here instead of asking a logo service.
 *
 * Most merchants won't match, and that's fine: callers show a logo only when
 * there is one (or Plaid supplied its own `logoUrl`), and otherwise fall back
 * to whatever they showed before.
 */
import { BRAND_ICONS, type BrandIcon, type BrandSlug } from '../data/brandIcons'

/**
 * Checked in order, first match wins, against a lowercased descriptor. Order
 * matters where one name contains another (Uber Eats before Uber) and where a
 * payment wrapper names the real merchant ("PAYPAL *NETFLIX" is Netflix), so
 * the wrappers come last. Patterns stay narrow on purpose: a wrong logo is
 * worse than none, so bare words that are also ordinary words ("delta",
 * "max", "steam") need their company context to count.
 */
const RULES: [RegExp, BrandSlug][] = [
  // Eating out and delivery
  [/\bstarbucks\b/, 'starbucks'],
  [/\bmc ?donald/, 'mcdonalds'],
  [/\bkfc\b|\bkentucky fried\b/, 'kfc'],
  [/\bchick[- ]?fil[- ]?a\b/, 'chickfila'],
  [/\bburger king\b/, 'burgerking'],
  [/\btaco bell\b/, 'tacobell'],
  [/\bdoordash\b|\bdd \*?doordash/, 'doordash'],
  [/\buber ?eats\b/, 'ubereats'],
  [/\binstacart\b/, 'instacart'],
  // Getting around
  [/\buber\b/, 'uber'],
  [/\blyft\b/, 'lyft'],
  [/\bshell (oil|service|station)\b|^shell\b/, 'shell'],
  // Car makers only count next to their lending arm ("TOYOTA MOTOR CREDIT"):
  // the monthly loan payment is the descriptor people actually see, and a bare
  // "ford" or "kia" is as likely to be someone's name.
  [/\btesla (inc|motors|supercharger|energy|service|insurance)\b|\btesla\.com\b/, 'tesla'],
  [/\bford (motor|credit)\b/, 'ford'],
  [/\btoyota (motor|financial|credit)\b/, 'toyota'],
  [/\bhonda (finance|financial|motor)\b/, 'honda'],
  [/\bhyundai (motor|capital|finance)\b/, 'hyundai'],
  [/\bnissan (motor|acceptance|finance)\b|\bnmac\b/, 'nissan'],
  [/\bsubaru (motors|financial|finance)\b/, 'subaru'],
  [/\bkia (motors|finance|financial)\b/, 'kia'],
  [/\bmazda (american|financial|finance)\b/, 'mazda'],
  [/\bbmw (financial|fs|bank)\b/, 'bmw'],
  [/\b(volkswagen|vw) (credit|financ)/, 'volkswagen'],
  [/\bautozone\b/, 'autozone'],
  // Shipping. "ups" is a plain word, so it needs the store or the star.
  [/^ups\b|\bups ?\*|\bups store\b/, 'ups'],
  [/\bfedex\b|\bfed ex\b/, 'fedex'],
  [/\busps\b|\bpostal service\b/, 'usps'],
  [/\bdhl\b/, 'dhl'],
  // Streaming, music, apps
  [/\bnetflix\b/, 'netflix'],
  [/\bspotify\b/, 'spotify'],
  [/\bhulu\b/, 'hulu'],
  [/\byoutube ?tv\b/, 'youtubetv'],
  [/\byoutube\b/, 'youtube'],
  [/\bapple music\b/, 'applemusic'],
  [/\bicloud\b/, 'icloud'],
  [/\bapple ?tv\b/, 'appletv'],
  // A label that is only "Apple" counts too: aggregators like Empower clean
  // "APPLE.COM/BILL" down to that. Whole-label only, so "Apple Orchard" doesn't.
  [/\bapple\.com\b|\bapple (store|one|tv|arcade)\b|\bitunes\b|^apple( inc\.?)?$/, 'apple'],
  [/\bparamount ?(\+|plus)/, 'paramountplus'],
  [/\bhbo ?max\b|\bmax\.com\b/, 'max'],
  [/\bhbo\b/, 'hbo'],
  [/\baudible\b/, 'audible'],
  [/\bplaystation\b|\bsony interactive\b/, 'playstation'],
  [/\bduolingo\b/, 'duolingo'],
  [/\bpeloton\b/, 'peloton'],
  // Software, gaming and subscriptions. Words that are also ordinary words or
  // first names need their company context: "steam" alone is a carpet cleaner,
  // "pandora" is a jewelry store, "tinder box" is a cigar shop.
  [/\bgoogle ?\*? ?play\b|\bplay\.google\b/, 'googleplay'],
  [/\bgoogle\b/, 'google'],
  [/\broku\b/, 'roku'],
  [/\bcrunchyroll\b/, 'crunchyroll'],
  [/\bpandora (music|radio|premium|plus|media|internet)\b|\bpandora\.com\b|\bpandora ?\*/, 'pandora'],
  [/\btwitch\.tv\b|\btwitch interactive\b|^twitch\b/, 'twitch'],
  [/\bfubo(tv)?\b/, 'fubo'],
  [/\bsteamgames\.com\b|\bsteampowered\b|\bsteam (purchase|games|wallet|store)\b|\bvalve corp/, 'steam'],
  [/\bepic ?games\b/, 'epicgames'],
  [/\broblox\b/, 'roblox'],
  [/\bdropbox\b/, 'dropbox'],
  [/\bzoom\.us\b|\bzoom video\b|\bzoom communications\b/, 'zoom'],
  [/\bnotion labs\b|\bnotion\.so\b/, 'notion'],
  [/\bgithub\b/, 'github'],
  [/\bfigma\b/, 'figma'],
  [/\bgrammarly\b/, 'grammarly'],
  [/\bevernote\b/, 'evernote'],
  [/\b1password\b/, 'onepassword'],
  [/\bnord ?vpn\b/, 'nordvpn'],
  [/\bexpress ?vpn\b/, 'expressvpn'],
  [/\bpatreon\b/, 'patreon'],
  [/\bsubstack\b/, 'substack'],
  [/\banthropic\b|\bclaude\.ai\b|^claude( ai)?$/, 'claude'],
  [/\bquickbooks\b/, 'quickbooks'],
  [/\bintuit\b|\bturbotax\b/, 'intuit'],
  [/\bcoursera\b/, 'coursera'],
  [/\budemy\b/, 'udemy'],
  [/\bskillshare\b/, 'skillshare'],
  [/\bheadspace\b/, 'headspace'],
  [/\bstrava\b/, 'strava'],
  [/\btinder\b(?! box)/, 'tinder'],
  [/\bdiscord\b/, 'discord'],
  [/\bfacebook\b|\bfacebk\b/, 'facebook'],
  [/\bgroupon\b/, 'groupon'],
  [/\bgofundme\b/, 'gofundme'],
  [/\bticketmaster\b/, 'ticketmaster'],
  [/\bstubhub\b/, 'stubhub'],
  [/\bseat ?geek\b/, 'seatgeek'],
  [/\bfandango\b/, 'fandango'],
  [/\bzillow\b/, 'zillow'],
  [/\byelp\b/, 'yelp'],
  // Shopping
  [/\btarget\b/, 'target'],
  [/\blidl\b/, 'lidl'],
  [/\bikea\b/, 'ikea'],
  [/\bnike\b/, 'nike'],
  [/\betsy\b/, 'etsy'],
  [/\bebay\b/, 'ebay'],
  // "zara" is a first name and "puma"/"dell" are ordinary words, so these want
  // the way a bank actually prints them ("ZARA USA 0123", "DELL MARKETING").
  [/\bzara (usa|inc|home|\d)|\bzara\.com\b/, 'zara'],
  [/\bh ?& ?m\b|\bhm\.com\b|\bhennes\b/, 'hm'],
  [/\bmacy['\u2019]?s\b/, 'macys'],
  [/\bsam['\u2019]?s ?club\b/, 'samsclub'],
  [/\badidas\b/, 'adidas'],
  [/\bunder ?armou?r\b/, 'underarmour'],
  [/\bnew balance (athletic|inc|store|outlet|\d)|\bnewbalance\b/, 'newbalance'],
  [/\bpuma (north america|store|outlet|\d)|\bpuma\.com\b/, 'puma'],
  [/\buniqlo\b/, 'uniqlo'],
  [/\bdell (marketing|financial|computer|inc)\b|\bdell ?\*|\bdell\.com\b/, 'dell'],
  [/\bsamsung\b/, 'samsung'],
  // Phone, internet and utilities. "AT&T" is printed a dozen ways ("ATT*BILL
  // PAYMENT", "AT & T"); bare "att" only counts at the start or with a star.
  [/\bverizon\b|\bvzwrlss\b/, 'verizon'],
  [/\bat ?& ?t\b|^att\b|\batt ?\*|\batt (bill|mobility|wireless|uverse|internet|payment)/, 'att'],
  [/\bcharter (comm|spectrum)|\bspectrum (mobile|internet|cable|tv|wifi|business|billing)\b|\bspectrum\.(com|net)\b/, 'spectrum'],
  [/\bnational ?grid\b/, 'nationalgrid'],
  // Travel
  [/\bairbnb\b/, 'airbnb'],
  [/\bdelta air/, 'delta'],
  [/\bunited air/, 'united'],
  [/\bsouthwest air|\bsouthwes\b/, 'southwest'],
  [/\bamerican air/, 'americanairlines'],
  [/\bjet ?blue\b/, 'jetblue'],
  [/\bmarriott\b/, 'marriott'],
  [/\bhilton\b/, 'hilton'],
  // Hotels.com and Booking.com before Expedia, which owns the first.
  [/\bhotels\.com\b/, 'hotelsdotcom'],
  [/\bbooking\.com\b/, 'booking'],
  [/\bexpedia\b/, 'expedia'],
  [/\btripadvisor\b/, 'tripadvisor'],
  // Banks and card issuers (card payments, bank fees)
  [/\bchase\b|\bjp ?morgan ?chase\b/, 'chase'],
  [/\bbank of america\b|\bbofa\b/, 'bankofamerica'],
  [/\bwells fargo\b/, 'wellsfargo'],
  [/\bamerican express\b|\bamex\b/, 'americanexpress'],
  [/\bdiscover\b/, 'discover'],
  [/\brobinhood\b/, 'robinhood'],
  [/\bcoinbase\b/, 'coinbase'],
  [/\bwestern union\b/, 'westernunion'],
  [/\bwise\.com\b|\btransferwise\b|\bwise us\b/, 'wise'],
  // Payment wrappers, last, so the merchant they wrap wins
  [/\bpaypal\b/, 'paypal'],
  [/\bvenmo\b/, 'venmo'],
  [/\bcash ?app\b/, 'cashapp'],
  [/\bzelle\b/, 'zelle'],
  [/\bklarna\b/, 'klarna'],
]

/**
 * Money sent to or from a person ("Zelle payment to Chase Miller"). Only the
 * service is a company here; the rest is someone's name and must never be
 * read as a brand.
 */
const PEER = /\b(zelle|venmo|cash ?app|quickpay|paypal)\b.*?\b(to|from)\b/

const PEER_BRAND: Record<string, BrandSlug> = {
  zelle: 'zelle',
  quickpay: 'zelle', // Chase QuickPay is Zelle under an older name
  venmo: 'venmo',
  cashapp: 'cashapp',
  'cash app': 'cashapp',
  paypal: 'paypal',
}

/** The slug of the company behind a descriptor, or null when we don't know it. */
export function brandSlugFor(description: string): BrandSlug | null {
  const text = description.toLowerCase()
  const peer = text.match(PEER)
  if (peer) return PEER_BRAND[peer[1]] ?? null
  for (const [re, slug] of RULES) if (re.test(text)) return slug
  return null
}

/**
 * The first brand any of these names points to. Callers pass the name the
 * user sees first (an alias they chose wins) and the raw bank descriptor
 * after it, which keeps details a cleaned label drops ("APPLE.COM/BILL" →
 * plain "Apple", which only matches when it is the whole label).
 */
export function brandSlugForAny(...names: (string | undefined)[]): BrandSlug | null {
  for (const name of names) {
    const slug = name ? brandSlugFor(name) : null
    if (slug) return slug
  }
  return null
}

/** The logo to draw for a descriptor, or null when we don't have one. */
export function brandFor(description: string): BrandIcon | null {
  const slug = brandSlugFor(description)
  return slug ? BRAND_ICONS[slug] : null
}
