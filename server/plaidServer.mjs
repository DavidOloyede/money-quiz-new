/**
 * Money Quiz — optional Plaid backend.
 *
 * Plaid's API secret can never live in the browser, so connecting a real bank
 * requires this small server. It is intentionally dependency-free (Node's http
 * + global fetch + a JSON file for tokens) so it runs anywhere with no install.
 *
 *   node server/plaidServer.mjs
 *
 * Without PLAID_CLIENT_ID / PLAID_SECRET it runs in MOCK mode: it serves
 * realistic fake transactions so the whole "connect → populate → label" flow
 * works end-to-end for development and demos. Set the env vars (see
 * .env.example) to talk to the real Plaid API (sandbox / production).
 *
 * This is a single-user, local/personal server: it stores Plaid access tokens
 * in server/.data/store.json (gitignored). It is not a multi-tenant service.
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '.data')
const STORE_FILE = join(DATA_DIR, 'store.json')

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID
const PLAID_SECRET = process.env.PLAID_SECRET
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'
const PORT = Number(process.env.PORT || 8787)
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || 'transactions').split(',').map((s) => s.trim())
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',').map((s) => s.trim())
const MODE = PLAID_CLIENT_ID && PLAID_SECRET ? 'plaid' : 'mock'
const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`

// ----------------------------- token store -----------------------------
function loadStore() {
  try {
    return JSON.parse(readFileSync(STORE_FILE, 'utf8'))
  } catch {
    return { items: {} }
  }
}
function saveStore(s) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(STORE_FILE, JSON.stringify(s, null, 2))
}
const store = loadStore()

function summary(item) {
  return {
    id: item.id,
    institution: item.institution,
    accountType: item.accountType,
    kind: 'plaid',
    mock: !!item.mock,
    count: Object.keys(item.transactions || {}).length,
  }
}

// ----------------------------- Plaid REST ------------------------------
async function plaid(path, body) {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, ...body }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error_code) {
    const err = new Error(json.error_message || `Plaid ${path} failed (${res.status})`)
    err.plaid = { error_code: json.error_code, error_type: json.error_type }
    throw err
  }
  return json
}

// ----------------------------- mock data -------------------------------
function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Realistic Plaid-shaped transactions (amount: positive = money out). */
function mockTransactions(accountType) {
  const rows = [
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
  const credit = accountType === 'credit'
  const txns = rows.map(([name, amount, primary, detailed, daysAgo], i) => ({
    transaction_id: `mocktx-${randomUUID().slice(0, 8)}-${i}`,
    account_id: 'mock-account',
    date: isoDaysAgo(daysAgo),
    name,
    merchant_name: name,
    amount,
    iso_currency_code: 'USD',
    pending: false,
    personal_finance_category: { primary, detailed },
  }))
  // Bank accounts also see income + a card payment; cards see neither.
  if (!credit) {
    txns.push({
      transaction_id: `mocktx-${randomUUID().slice(0, 8)}-pay`,
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
  const out = {}
  for (const t of txns) out[t.transaction_id] = t
  return out
}

// ----------------------------- handlers --------------------------------
const handlers = {
  'GET /api/health': async () => ({ mode: MODE, env: PLAID_ENV }),

  'POST /api/plaid/create_link_token': async () => {
    if (MODE === 'mock') return { link_token: `mock-link-${randomUUID()}`, mode: 'mock' }
    const r = await plaid('/link/token/create', {
      user: { client_user_id: 'local-user' },
      client_name: 'Money Quiz',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    })
    return { link_token: r.link_token, mode: 'plaid' }
  },

  // Mock-only: simulate a successful Link without Plaid's hosted UI.
  'POST /api/plaid/mock_connect': async (body) => {
    if (MODE !== 'mock') throw httpError(400, 'mock_connect is only available in mock mode')
    const id = `mock-${randomUUID().slice(0, 8)}`
    const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
    store.items[id] = {
      id,
      institution: (body.institution || '').trim() || 'Sandbox Bank',
      accountType,
      mock: true,
      cursor: null,
      transactions: mockTransactions(accountType),
    }
    saveStore(store)
    return { item: summary(store.items[id]) }
  },

  'POST /api/plaid/exchange_public_token': async (body) => {
    if (!body.public_token) throw httpError(400, 'public_token required')
    const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
    const r = await plaid('/item/public_token/exchange', { public_token: body.public_token })
    store.items[r.item_id] = {
      id: r.item_id,
      institution: (body.institution || '').trim() || 'Bank',
      accountType,
      accessToken: r.access_token,
      cursor: null,
      transactions: {},
    }
    saveStore(store)
    return { item: summary(store.items[r.item_id]) }
  },

  'POST /api/plaid/sync': async (body) => {
    const item = store.items[body.itemId]
    if (!item) throw httpError(404, 'unknown item')
    if (!item.mock) {
      let cursor = item.cursor
      let hasMore = true
      while (hasMore) {
        const r = await plaid('/transactions/sync', {
          access_token: item.accessToken,
          cursor: cursor || undefined,
        })
        for (const t of r.added) item.transactions[t.transaction_id] = t
        for (const t of r.modified) item.transactions[t.transaction_id] = t
        for (const t of r.removed) delete item.transactions[t.transaction_id]
        cursor = r.next_cursor
        hasMore = r.has_more
      }
      item.cursor = cursor
      saveStore(store)
    }
    return { item: summary(item), transactions: Object.values(item.transactions) }
  },

  'GET /api/plaid/items': async () => ({ items: Object.values(store.items).map(summary) }),
}

function httpError(status, message) {
  const e = new Error(message)
  e.status = status
  return e
}

// ----------------------------- server ----------------------------------
function cors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.end()

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  // DELETE /api/plaid/items/:id
  const del = path.match(/^\/api\/plaid\/items\/(.+)$/)
  if (req.method === 'DELETE' && del) {
    const id = decodeURIComponent(del[1])
    const item = store.items[id]
    try {
      if (item && !item.mock && item.accessToken) await plaid('/item/remove', { access_token: item.accessToken })
    } catch {
      // best-effort; remove locally regardless
    }
    delete store.items[id]
    saveStore(store)
    return send(res, 200, { ok: true })
  }

  const key = `${req.method} ${path}`
  const handler = handlers[key]
  if (!handler) return send(res, 404, { error: 'not found' })

  let body = {}
  if (req.method === 'POST') {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const raw = Buffer.concat(chunks).toString('utf8')
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        return send(res, 400, { error: 'invalid JSON' })
      }
    }
  }

  try {
    const result = await handler(body)
    send(res, 200, result)
  } catch (e) {
    send(res, e.status || 500, { error: e.message, plaid: e.plaid })
  }
})

server.listen(PORT, () => {
  console.log(`[money-quiz] Plaid server on http://localhost:${PORT}  (mode: ${MODE}, env: ${PLAID_ENV})`)
  if (MODE === 'mock') {
    console.log('[money-quiz] No PLAID_CLIENT_ID/PLAID_SECRET set — running in MOCK mode with fake data.')
  }
})
