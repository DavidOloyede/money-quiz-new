/**
 * Multi-tenant Plaid backend as a Supabase Edge Function — the cloud port of
 * server/plaidServer.mjs. The browser calls this with the user's session JWT;
 * Plaid secrets and access tokens never leave the function.
 *
 * Without PLAID_CLIENT_ID / PLAID_SECRET secrets it runs in MOCK mode and
 * serves realistic fake transactions, so the connect → import flow works in
 * demos and during development.
 *
 * TENANCY RULE: this function uses the service-role key, which bypasses RLS.
 * All plaid_items access therefore goes through the `itemsDb` helper below,
 * which requires a user id on every query. Never query the table directly.
 *
 * Secrets: npx supabase secrets set PLAID_CLIENT_ID=... PLAID_SECRET=... \
 *   PLAID_ENV=sandbox PLAID_TOKEN_KEY=$(openssl rand -base64 32)
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { decryptToken, encryptToken } from './crypto.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID') ?? ''
const PLAID_SECRET = Deno.env.get('PLAID_SECRET') ?? ''
const PLAID_ENV = Deno.env.get('PLAID_ENV') ?? 'sandbox'
const PLAID_TOKEN_KEY = Deno.env.get('PLAID_TOKEN_KEY') ?? ''
const PLAID_PRODUCTS = (Deno.env.get('PLAID_PRODUCTS') ?? 'transactions')
  .split(',')
  .map((s) => s.trim())
const PLAID_COUNTRY_CODES = (Deno.env.get('PLAID_COUNTRY_CODES') ?? 'US')
  .split(',')
  .map((s) => s.trim())

const MODE = PLAID_CLIENT_ID && PLAID_SECRET ? 'plaid' : 'mock'
const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ----------------------------- types ------------------------------------

interface PlaidTxn {
  transaction_id: string
  [key: string]: unknown
}

interface ItemRow {
  id: string
  user_id: string
  institution: string
  account_type: 'bank' | 'credit'
  access_token_enc: string | null
  is_mock: boolean
  cursor: string | null
  transactions: Record<string, PlaidTxn>
}

function summary(item: ItemRow) {
  return {
    id: item.id,
    institution: item.institution,
    accountType: item.account_type,
    kind: 'plaid' as const,
    mock: item.is_mock,
    count: Object.keys(item.transactions ?? {}).length,
  }
}

class HttpError extends Error {
  status: number
  plaid?: { error_code?: string; error_type?: string }
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// --------------------- per-user item store (tenancy) ---------------------

const itemsDb = {
  async get(userId: string, id: string): Promise<ItemRow | null> {
    const { data, error } = await db
      .from('plaid_items')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new HttpError(500, error.message)
    return data as ItemRow | null
  },
  async list(userId: string): Promise<ItemRow[]> {
    const { data, error } = await db
      .from('plaid_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
    if (error) throw new HttpError(500, error.message)
    return (data as ItemRow[]) ?? []
  },
  async upsert(userId: string, row: Omit<ItemRow, 'user_id'>): Promise<void> {
    const { error } = await db
      .from('plaid_items')
      .upsert({ ...row, user_id: userId, updated_at: new Date().toISOString() })
    if (error) throw new HttpError(500, error.message)
  },
  async remove(userId: string, id: string): Promise<void> {
    const { error } = await db.from('plaid_items').delete().eq('user_id', userId).eq('id', id)
    if (error) throw new HttpError(500, error.message)
  },
}

// ----------------------------- Plaid REST --------------------------------

async function plaid(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, ...body }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error_code) {
    const err = new HttpError(502, json.error_message || `Plaid ${path} failed (${res.status})`)
    err.plaid = { error_code: json.error_code, error_type: json.error_type }
    throw err
  }
  return json
}

// ----------------------------- mock data ---------------------------------

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Realistic Plaid-shaped transactions (amount: positive = money out). */
function mockTransactions(accountType: 'bank' | 'credit'): Record<string, PlaidTxn> {
  const rows: [string, number, string, string, number][] = [
    ['Whole Foods Market', 84.21, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES', 2],
    ['Trader Joe’s', 56.4, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES', 9],
    ['Starbucks', 6.75, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_COFFEE', 1],
    ['Starbucks', 5.95, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_COFFEE', 12],
    ['Chipotle', 13.4, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT', 4],
    ['Sweetgreen', 16.85, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT', 20],
    ['Uber', 23.1, 'TRANSPORTATION', 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', 3],
    ['Shell', 44.6, 'TRANSPORTATION', 'TRANSPORTATION_GAS', 15],
    ['Comcast Xfinity', 79.99, 'RENT_AND_UTILITIES', 'RENT_AND_UTILITIES_INTERNET_AND_CABLE', 8],
    ['Amazon', 41.27, 'GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', 6],
    ['Amazon', 119.5, 'GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', 26],
    ['Target', 72.13, 'GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_DEPARTMENT_STORES', 18],
    ['Netflix', 15.49, 'ENTERTAINMENT', 'ENTERTAINMENT_STREAMING', 7],
    ['Spotify', 10.99, 'ENTERTAINMENT', 'ENTERTAINMENT_STREAMING', 11],
    ['GitHub', 4.0, 'GENERAL_SERVICES', 'GENERAL_SERVICES_OTHER', 5],
    ['Adobe', 22.99, 'GENERAL_SERVICES', 'GENERAL_SERVICES_OTHER', 22],
    ['CVS Pharmacy', 18.4, 'MEDICAL', 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS', 10],
    ['AMC Theatres', 28.5, 'ENTERTAINMENT', 'ENTERTAINMENT_MOVIES_AND_DVDS', 17],
    ['Venmo', 40.0, 'TRANSFER_OUT', 'TRANSFER_OUT_ACCOUNT_TRANSFER', 13],
    ['Zelle payment to Alex', 120.0, 'TRANSFER_OUT', 'TRANSFER_OUT_ACCOUNT_TRANSFER', 24],
  ]
  const txns: PlaidTxn[] = rows.map(([name, amount, primary, detailed, daysAgo], i) => ({
    transaction_id: `mocktx-${crypto.randomUUID().slice(0, 8)}-${i}`,
    account_id: 'mock-account',
    date: isoDaysAgo(daysAgo),
    name,
    merchant_name: name,
    amount,
    iso_currency_code: 'USD',
    pending: false,
    personal_finance_category: { primary, detailed },
  }))
  // Bank accounts also see income; cards don't.
  if (accountType !== 'credit') {
    txns.push({
      transaction_id: `mocktx-${crypto.randomUUID().slice(0, 8)}-pay`,
      account_id: 'mock-account',
      date: isoDaysAgo(14),
      name: 'Payroll Direct Deposit',
      merchant_name: 'Acme Corp',
      amount: -2450.0,
      iso_currency_code: 'USD',
      pending: false,
      personal_finance_category: { primary: 'INCOME', detailed: 'INCOME_WAGES' },
    })
  }
  const out: Record<string, PlaidTxn> = {}
  for (const t of txns) out[t.transaction_id] = t
  return out
}

// ----------------------------- handlers ----------------------------------

type Body = Record<string, unknown>

const handlers: Record<string, (userId: string, body: Body) => Promise<unknown>> = {
  'GET /health': () => Promise.resolve({ mode: MODE, env: PLAID_ENV }),

  'POST /create_link_token': async (userId) => {
    if (MODE === 'mock') return { link_token: `mock-link-${crypto.randomUUID()}`, mode: 'mock' }
    const r = await plaid('/link/token/create', {
      user: { client_user_id: userId },
      client_name: 'Money Quiz',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    })
    return { link_token: r.link_token, mode: 'plaid' }
  },

  // Mock-only: simulate a successful Link without Plaid's hosted UI.
  'POST /mock_connect': async (userId, body) => {
    if (MODE !== 'mock') throw new HttpError(400, 'mock_connect is only available in mock mode')
    const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
    const item: Omit<ItemRow, 'user_id'> = {
      id: `mock-${crypto.randomUUID().slice(0, 8)}`,
      institution: (typeof body.institution === 'string' && body.institution.trim()) || 'Sandbox Bank',
      account_type: accountType,
      access_token_enc: null,
      is_mock: true,
      cursor: null,
      transactions: mockTransactions(accountType),
    }
    await itemsDb.upsert(userId, item)
    return { item: summary({ ...item, user_id: userId }) }
  },

  'POST /exchange_public_token': async (userId, body) => {
    if (typeof body.public_token !== 'string') throw new HttpError(400, 'public_token required')
    if (!PLAID_TOKEN_KEY) throw new HttpError(500, 'PLAID_TOKEN_KEY secret is not set')
    const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
    const r = await plaid('/item/public_token/exchange', { public_token: body.public_token })
    const item: Omit<ItemRow, 'user_id'> = {
      id: r.item_id,
      institution: (typeof body.institution === 'string' && body.institution.trim()) || 'Bank',
      account_type: accountType,
      access_token_enc: await encryptToken(r.access_token, PLAID_TOKEN_KEY),
      is_mock: false,
      cursor: null,
      transactions: {},
    }
    await itemsDb.upsert(userId, item)
    return { item: summary({ ...item, user_id: userId }) }
  },

  'POST /sync': async (userId, body) => {
    if (typeof body.itemId !== 'string') throw new HttpError(400, 'itemId required')
    const item = await itemsDb.get(userId, body.itemId)
    if (!item) throw new HttpError(404, 'unknown item')
    if (!item.is_mock) {
      if (!item.access_token_enc) throw new HttpError(500, 'item has no access token')
      const accessToken = await decryptToken(item.access_token_enc, PLAID_TOKEN_KEY)
      let cursor = item.cursor
      let hasMore = true
      while (hasMore) {
        const r = await plaid('/transactions/sync', {
          access_token: accessToken,
          cursor: cursor || undefined,
        })
        for (const t of r.added as PlaidTxn[]) item.transactions[t.transaction_id] = t
        for (const t of r.modified as PlaidTxn[]) item.transactions[t.transaction_id] = t
        for (const t of r.removed as PlaidTxn[]) delete item.transactions[t.transaction_id]
        cursor = r.next_cursor
        hasMore = r.has_more
      }
      item.cursor = cursor
      await itemsDb.upsert(userId, item)
    }
    return { item: summary(item), transactions: Object.values(item.transactions) }
  },

  'GET /items': async (userId) => ({ items: (await itemsDb.list(userId)).map(summary) }),
}

// ----------------------------- server ------------------------------------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Path arrives as /plaid/<route> (or /functions/v1/plaid/<route> locally).
  const pathname = new URL(req.url).pathname
  const route = pathname.replace(/^.*?\/plaid/, '') || '/'

  // The platform's verify_jwt only checks the JWT signature — the anon key
  // itself passes it. Resolving a real user is what actually gates access.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: userData, error: userError } = await db.auth.getUser(jwt)
  if (userError || !userData.user) return json(401, { error: 'Sign in to connect a bank.' })
  const userId = userData.user.id

  try {
    // DELETE /items/:id
    const del = route.match(/^\/items\/(.+)$/)
    if (req.method === 'DELETE' && del) {
      const id = decodeURIComponent(del[1])
      const item = await itemsDb.get(userId, id)
      try {
        if (item && !item.is_mock && item.access_token_enc) {
          const accessToken = await decryptToken(item.access_token_enc, PLAID_TOKEN_KEY)
          await plaid('/item/remove', { access_token: accessToken })
        }
      } catch {
        // best-effort; remove our record regardless
      }
      await itemsDb.remove(userId, id)
      return json(200, { ok: true })
    }

    const handler = handlers[`${req.method} ${route}`]
    if (!handler) return json(404, { error: 'not found' })

    let body: Body = {}
    if (req.method === 'POST') {
      try {
        const raw = await req.text()
        if (raw) body = JSON.parse(raw)
      } catch {
        return json(400, { error: 'invalid JSON' })
      }
    }

    return json(200, await handler(userId, body))
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message, plaid: e.plaid })
    return json(500, { error: e instanceof Error ? e.message : 'internal error' })
  }
})
