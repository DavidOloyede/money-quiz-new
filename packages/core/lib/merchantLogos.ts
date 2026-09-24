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
  [/\bburger king\b/, 'burgerking'],
  [/\btaco bell\b/, 'tacobell'],
  [/\bdoordash\b|\bdd \*?doordash/, 'doordash'],
  [/\buber ?eats\b/, 'ubereats'],
  [/\binstacart\b/, 'instacart'],
  // Getting around
  [/\buber\b/, 'uber'],
  [/\blyft\b/, 'lyft'],
  [/\bshell (oil|service|station)\b|^shell\b/, 'shell'],
  // Streaming, music, apps
  [/\bnetflix\b/, 'netflix'],
  [/\bspotify\b/, 'spotify'],
  [/\byoutube\b/, 'youtube'],
  [/\bapple music\b/, 'applemusic'],
  [/\bicloud\b/, 'icloud'],
  [/\bapple\.com\b|\bapple (store|one|tv|arcade)\b|\bitunes\b/, 'apple'],
  [/\bparamount ?(\+|plus)/, 'paramountplus'],
  [/\bhbo ?max\b|\bmax\.com\b/, 'max'],
  [/\baudible\b/, 'audible'],
  [/\bplaystation\b|\bsony interactive\b/, 'playstation'],
  [/\bduolingo\b/, 'duolingo'],
  [/\bpeloton\b/, 'peloton'],
  // Shopping
  [/\btarget\b/, 'target'],
  [/\blidl\b/, 'lidl'],
  [/\bikea\b/, 'ikea'],
  [/\bnike\b/, 'nike'],
  [/\betsy\b/, 'etsy'],
  [/\bebay\b/, 'ebay'],
  // Phone
  [/\bverizon\b|\bvzwrlss\b/, 'verizon'],
  // Travel
  [/\bairbnb\b/, 'airbnb'],
  [/\bdelta air/, 'delta'],
  [/\bunited air/, 'united'],
  [/\bsouthwest air|\bsouthwes\b/, 'southwest'],
  [/\bamerican air/, 'americanairlines'],
  [/\bmarriott\b/, 'marriott'],
  [/\bhilton\b/, 'hilton'],
  // Banks and card issuers (card payments, bank fees)
  [/\bchase\b/, 'chase'],
  [/\bbank of america\b|\bbofa\b/, 'bankofamerica'],
  [/\bwells fargo\b/, 'wellsfargo'],
  [/\bamerican express\b|\bamex\b/, 'americanexpress'],
  [/\bdiscover\b/, 'discover'],
  // Payment wrappers, last, so the merchant they wrap wins
  [/\bpaypal\b/, 'paypal'],
  [/\bvenmo\b/, 'venmo'],
  [/\bcash ?app\b/, 'cashapp'],
  [/\bzelle\b/, 'zelle'],
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
 * plain "Apple", too generic to match on its own).
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
