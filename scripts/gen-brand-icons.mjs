/**
 * Generates packages/core/data/brandIcons.ts: the handful of company logos
 * the app draws (bank tiles on the landing page, merchant logos beside
 * transactions), copied out of Simple Icons (CC0). The full package is ~5 MB
 * and Metro doesn't tree-shake, so the phone would ship every icon if core
 * imported it directly — this keeps only the ones listed here.
 *
 * Add a brand: put its Simple Icons export name below, run
 * `npm run gen:brands`, then teach lib/merchantLogos.ts how to spot it.
 * Simple Icons drops brands on trademark request (Amazon, Walmart, Hulu,
 * Adobe, Microsoft and T-Mobile are gone), so a name that's missing here fails
 * loudly rather than silently. Check the drawn mark, not just the name: an
 * icon can exist but be the wrong company's (O'Reilly is the publisher, not
 * the auto-parts chain) or a regional variant (Aldi Süd has "SÜD" in it, so
 * it would be wrong on a US receipt) — those stay out.
 *
 * A brand Simple Icons doesn't carry goes in EXTRA_SVGS below, from an SVG
 * file kept in scripts/brand-svgs/; it's refit onto the same 24×24
 * single-path shape.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as si from 'simple-icons'

/** Our slug → Simple Icons export. Slugs are what merchantLogos.ts refers to. */
const BRANDS = {
  // Banks and card issuers
  chase: 'siChase',
  bankofamerica: 'siBankofamerica',
  wellsfargo: 'siWellsfargo',
  americanexpress: 'siAmericanexpress',
  discover: 'siDiscover',
  robinhood: 'siRobinhood',
  coinbase: 'siCoinbase',
  westernunion: 'siWesternunion',
  wise: 'siWise',
  // Paying people
  zelle: 'siZelle',
  venmo: 'siVenmo',
  paypal: 'siPaypal',
  cashapp: 'siCashapp',
  klarna: 'siKlarna',
  // Streaming, music, apps
  netflix: 'siNetflix',
  spotify: 'siSpotify',
  youtube: 'siYoutube',
  apple: 'siApple',
  applemusic: 'siApplemusic',
  icloud: 'siIcloud',
  paramountplus: 'siParamountplus',
  // siMax is Cycling '74's music software; the streaming service is siHbomax.
  max: 'siHbomax',
  hbo: 'siHbo',
  audible: 'siAudible',
  playstation: 'siPlaystation',
  duolingo: 'siDuolingo',
  peloton: 'siPeloton',
  // Software, gaming and subscriptions
  google: 'siGoogle',
  googleplay: 'siGoogleplay',
  appletv: 'siAppletv',
  youtubetv: 'siYoutubetv',
  roku: 'siRoku',
  crunchyroll: 'siCrunchyroll',
  pandora: 'siPandora',
  twitch: 'siTwitch',
  fubo: 'siFubo',
  steam: 'siSteam',
  epicgames: 'siEpicgames',
  roblox: 'siRoblox',
  dropbox: 'siDropbox',
  zoom: 'siZoom',
  notion: 'siNotion',
  github: 'siGithub',
  figma: 'siFigma',
  grammarly: 'siGrammarly',
  evernote: 'siEvernote',
  onepassword: 'si1password',
  nordvpn: 'siNordvpn',
  expressvpn: 'siExpressvpn',
  patreon: 'siPatreon',
  substack: 'siSubstack',
  claude: 'siClaude',
  intuit: 'siIntuit',
  quickbooks: 'siQuickbooks',
  coursera: 'siCoursera',
  udemy: 'siUdemy',
  skillshare: 'siSkillshare',
  headspace: 'siHeadspace',
  strava: 'siStrava',
  tinder: 'siTinder',
  discord: 'siDiscord',
  facebook: 'siFacebook',
  groupon: 'siGroupon',
  gofundme: 'siGofundme',
  ticketmaster: 'siTicketmaster',
  stubhub: 'siStubhub',
  seatgeek: 'siSeatgeek',
  fandango: 'siFandango',
  zillow: 'siZillow',
  yelp: 'siYelp',
  // Eating out and delivery
  starbucks: 'siStarbucks',
  mcdonalds: 'siMcdonalds',
  burgerking: 'siBurgerking',
  tacobell: 'siTacobell',
  doordash: 'siDoordash',
  ubereats: 'siUbereats',
  instacart: 'siInstacart',
  kfc: 'siKfc',
  // Getting around
  uber: 'siUber',
  lyft: 'siLyft',
  shell: 'siShell',
  tesla: 'siTesla',
  ford: 'siFord',
  toyota: 'siToyota',
  honda: 'siHonda',
  hyundai: 'siHyundai',
  nissan: 'siNissan',
  subaru: 'siSubaru',
  kia: 'siKia',
  mazda: 'siMazda',
  bmw: 'siBmw',
  volkswagen: 'siVolkswagen',
  autozone: 'siAutozone',
  ups: 'siUps',
  fedex: 'siFedex',
  usps: 'siUsps',
  dhl: 'siDhl',
  // Shopping
  target: 'siTarget',
  lidl: 'siLidl',
  ikea: 'siIkea',
  nike: 'siNike',
  etsy: 'siEtsy',
  ebay: 'siEbay',
  zara: 'siZara',
  hm: 'siHandm',
  macys: 'siMacys',
  samsclub: 'siSamsclub',
  adidas: 'siAdidas',
  underarmour: 'siUnderarmour',
  newbalance: 'siNewbalance',
  puma: 'siPuma',
  uniqlo: 'siUniqlo',
  dell: 'siDell',
  samsung: 'siSamsung',
  // Phone, internet and utilities
  verizon: 'siVerizon',
  att: 'siAtandt',
  spectrum: 'siSpectrum',
  nationalgrid: 'siNationalgrid',
  // Travel
  airbnb: 'siAirbnb',
  delta: 'siDelta',
  united: 'siUnitedairlines',
  southwest: 'siSouthwestairlines',
  americanairlines: 'siAmericanairlines',
  marriott: 'siMarriott',
  hilton: 'siHilton',
  jetblue: 'siJetblue',
  expedia: 'siExpedia',
  booking: 'siBookingdotcom',
  hotelsdotcom: 'siHotelsdotcom',
  tripadvisor: 'siTripadvisor',
}

/** Brands Simple Icons doesn't have: slug → SVG file in scripts/brand-svgs/. */
const EXTRA_SVGS = {
  chickfila: { title: 'Chick-fil-A', hex: 'E51636', file: 'chick-fil-a.svg' },
  hulu: { title: 'Hulu', hex: '1CE783', file: 'hulu.svg' },
}

/**
 * Refits an SVG's filled paths onto a 24×24 canvas as one absolute-coordinate
 * path (centred, 1 unit of margin). Only the commands those files use are
 * understood (M L H V C S Z, either case) — arcs and quadratics throw rather
 * than come out wrong. Paths marked fill="none" are skipped (export scaffolding).
 */
function fitSvgTo24(svg) {
  const ds = [...svg.matchAll(/<path\b[^>]*>/g)]
    .filter((m) => !/fill="none"/.test(m[0]))
    .map((m) => /\sd="([^"]+)"/.exec(m[0])[1])
  const segs = [] // [command, absolute numbers...]; C segments carry 6 numbers
  const pts = []
  for (const d of ds) {
    let x = 0, y = 0, sx = 0, sy = 0, lastC = null
    for (const [, cmd, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
      const n = (args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
      const rel = cmd === cmd.toLowerCase()
      const up = cmd.toUpperCase()
      if (up === 'Z') { segs.push(['Z']); x = sx; y = sy; lastC = null; continue }
      if (!'MLHVCS'.includes(up)) throw new Error(`unsupported path command "${cmd}"`)
      const step = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4 }[up]
      for (let i = 0; i < n.length; i += step) {
        const a = n.slice(i, i + step)
        if (up === 'M' || up === 'L') {
          x = rel ? x + a[0] : a[0]; y = rel ? y + a[1] : a[1]
          const first = up === 'M' && i === 0
          segs.push([first ? 'M' : 'L', x, y]); pts.push([x, y]); lastC = null
          if (first) { sx = x; sy = y }
        } else if (up === 'H' || up === 'V') {
          if (up === 'H') x = rel ? x + a[0] : a[0]; else y = rel ? y + a[0] : a[0]
          segs.push(['L', x, y]); pts.push([x, y]); lastC = null
        } else {
          let c1
          if (up === 'S') c1 = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y]
          const b = up === 'S' ? a : a.slice(2)
          const c1x = up === 'S' ? c1[0] : rel ? x + a[0] : a[0]
          const c1y = up === 'S' ? c1[1] : rel ? y + a[1] : a[1]
          const c2x = rel ? x + b[0] : b[0], c2y = rel ? y + b[1] : b[1]
          const ex = rel ? x + b[2] : b[2], ey = rel ? y + b[3] : b[3]
          segs.push(['C', c1x, c1y, c2x, c2y, ex, ey])
          // Sample the curve so the bounding box is the drawn shape, not the handles.
          for (let t = 0; t <= 1; t += 0.05) {
            const u = 1 - t
            pts.push([
              u ** 3 * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * ex,
              u ** 3 * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ey,
            ])
          }
          lastC = [c2x, c2y]; x = ex; y = ey
        }
      }
    }
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const k = 22 / Math.max(x1 - x0, y1 - y0)
  const fx = (v) => +((v - (x0 + x1) / 2) * k + 12).toFixed(2)
  const fy = (v) => +((v - (y0 + y1) / 2) * k + 12).toFixed(2)
  return segs
    .map(([c, ...v]) => c + v.map((n, i) => (i % 2 === 0 ? fx(n) : fy(n))).join(' '))
    .join('')
}

const entries = Object.entries(BRANDS).map(([slug, name]) => {
  const icon = si[name]
  if (!icon) throw new Error(`simple-icons has no ${name} (for "${slug}") — it may have been removed`)
  return `  ${slug}: { title: ${JSON.stringify(icon.title)}, hex: '${icon.hex}', path: '${icon.path}' },`
})
for (const [slug, { title, hex, file }] of Object.entries(EXTRA_SVGS)) {
  const svg = readFileSync(fileURLToPath(new URL(`./brand-svgs/${file}`, import.meta.url)), 'utf8')
  entries.push(`  ${slug}: { title: ${JSON.stringify(title)}, hex: '${hex}', path: '${fitSvgTo24(svg)}' },`)
}

const out = `/**
 * GENERATED by scripts/gen-brand-icons.mjs from Simple Icons (CC0), plus the
 * odd SVG we supply for a brand it doesn't carry — do not edit by hand; change the list there and run \`npm run gen:brands\`.
 *
 * Each logo is one SVG path on a 24×24 canvas plus the brand's own colour.
 * The marks belong to their companies; we draw them only so people recognise
 * where their money went, never to suggest a company endorses us.
 */
export interface BrandIcon {
  title: string
  /** Brand colour, 6-digit hex without the #. */
  hex: string
  /** SVG path data for a 0 0 24 24 viewBox. */
  path: string
}

export const BRAND_ICONS = {
${entries.join('\n')}
} satisfies Record<string, BrandIcon>

export type BrandSlug = keyof typeof BRAND_ICONS
`

writeFileSync(fileURLToPath(new URL('../packages/core/data/brandIcons.ts', import.meta.url)), out)
console.log(`wrote ${entries.length} brand icons`)
