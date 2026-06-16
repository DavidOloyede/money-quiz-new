/**
 * Plaid REST helper + realistic mock data. Without PLAID_CLIENT_ID/SECRET the
 * server runs in mock mode (PLAID_MODE === 'mock'), serving fake transactions
 * so the connect → import flow works end-to-end with no Plaid account.
 */
import { randomUUID } from 'node:crypto'
import { env } from '../env'

const PLAID_BASE = `https://${env.PLAID_ENV}.plaid.com`
export const PLAID_PRODUCTS = env.PLAID_PRODUCTS.split(',').map((s) => s.trim())
export const PLAID_COUNTRY_CODES = env.PLAID_COUNTRY_CODES.split(',').map((s) => s.trim())

export interface PlaidTxn {
  transaction_id: string
  [key: string]: unknown
}

export class PlaidError extends Error {
  status: number
  plaid?: { error_code?: string; error_type?: string }
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function plaid(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.PLAID_CLIENT_ID, secret: env.PLAID_SECRET, ...body }),
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || json.error_code) {
    const err = new PlaidError(
      502,
      (json.error_message as string) || `Plaid ${path} failed (${res.status})`,
    )
    err.plaid = { error_code: json.error_code as string, error_type: json.error_type as string }
    throw err
  }
  return json
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Realistic Plaid-shaped transactions (amount: positive = money out). */
export function mockTransactions(accountType: 'bank' | 'credit'): Record<string, PlaidTxn> {
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
  if (accountType !== 'credit') {
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
  const out: Record<string, PlaidTxn> = {}
  for (const t of txns) out[t.transaction_id] = t
  return out
}
