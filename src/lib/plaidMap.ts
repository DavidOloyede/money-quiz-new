import type { Category, Transaction } from '../types'
import type { PlaidTxn } from './plaid'
import { categorize } from './categorize'

/**
 * Map Plaid's Personal Finance Category taxonomy onto our categories. Plaid's
 * categorization is good, so we trust it for the primary buckets and only let
 * our own keyword pass override for Zelle and Subscriptions (which Plaid lumps
 * into transfers / general services).
 */
const PRIMARY: Record<string, Category> = {
  FOOD_AND_DRINK: 'dining',
  GENERAL_MERCHANDISE: 'shopping',
  TRANSPORTATION: 'transport',
  TRAVEL: 'transport',
  RENT_AND_UTILITIES: 'utilities',
  ENTERTAINMENT: 'entertainment',
  MEDICAL: 'health',
  PERSONAL_CARE: 'health',
  GENERAL_SERVICES: 'other',
  HOME_IMPROVEMENT: 'shopping',
  INCOME: 'income',
  TRANSFER_IN: 'transfers',
  TRANSFER_OUT: 'transfers',
  LOAN_PAYMENTS: 'transfers',
  BANK_FEES: 'other',
  GOVERNMENT_AND_NON_PROFIT: 'other',
}

const DETAILED: Record<string, Category> = {
  FOOD_AND_DRINK_GROCERIES: 'groceries',
  RENT_AND_UTILITIES_RENT: 'rent',
}

/** Convert Plaid transactions into our Transaction model. */
export function mapPlaidTransactions(txns: PlaidTxn[], sourceId: string): Transaction[] {
  return txns.map((t) => {
    // Plaid amounts are positive for money out; we use negative for expenses.
    const amount = -(Number(t.amount) || 0)
    const description = (t.merchant_name || t.name || 'Transaction').trim()
    const detailed = t.personal_finance_category?.detailed
    const primary = t.personal_finance_category?.primary
    let category: Category | undefined =
      (detailed && DETAILED[detailed]) || (primary && PRIMARY[primary]) || undefined

    const kw = categorize(description, amount)
    if (kw === 'zelle' || kw === 'subscriptions') category = kw
    if (!category) category = kw

    return {
      id: `plaid:${t.transaction_id}`,
      date: t.date,
      description,
      amount,
      category,
      sourceId,
    }
  })
}
