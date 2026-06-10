import type { Transaction } from '../types'
import { categorize } from '../lib/categorize'
import { newId } from '../lib/storage'

interface RawRow {
  date: string
  description: string
  amount: number
}

/**
 * ~60 realistic transactions spanning Apr–Jun 2026 so the whole app can be
 * tried without uploading anything. Designed to make the dashboard and quiz
 * interesting: a frequent merchant (Starbucks, 9 visits), a clear largest
 * single expense (a laptop), recurring rent/income, month-over-month spending
 * shifts, and monthly giving (a church tithe + small donations) so the Giving
 * card, tithe quiz questions, and giving badges all have something to show.
 */
const SAMPLE_ROWS: RawRow[] = [
  // ---- April 2026 ----
  { date: '2026-04-01', description: 'Paycheck - Direct Deposit Acme Corp', amount: 2410.55 },
  { date: '2026-04-01', description: 'Rent Payment - Oakwood Apartments', amount: -1650.0 },
  { date: '2026-04-02', description: "Trader Joe's", amount: -64.3 },
  { date: '2026-04-03', description: 'Starbucks', amount: -5.75 },
  { date: '2026-04-04', description: 'Uber Trip', amount: -18.4 },
  { date: '2026-04-05', description: 'Grace Community Church Tithe', amount: -485.0 },
  { date: '2026-04-05', description: 'Shell Gas Station', amount: -42.1 },
  { date: '2026-04-06', description: 'Netflix', amount: -15.49 },
  { date: '2026-04-07', description: 'Chipotle', amount: -12.85 },
  { date: '2026-04-09', description: 'Whole Foods Market', amount: -88.21 },
  { date: '2026-04-10', description: 'Starbucks', amount: -6.25 },
  { date: '2026-04-11', description: 'Planet Fitness', amount: -24.99 },
  { date: '2026-04-12', description: 'Comcast Xfinity Internet', amount: -79.99 },
  { date: '2026-04-14', description: 'PG&E Electric', amount: -110.45 },
  { date: '2026-04-15', description: 'Paycheck - Direct Deposit Acme Corp', amount: 2410.55 },
  { date: '2026-04-16', description: 'Amazon Purchase', amount: -53.99 },
  { date: '2026-04-17', description: 'Verizon Wireless', amount: -85.0 },
  { date: '2026-04-18', description: 'Olive Garden', amount: -47.6 },
  { date: '2026-04-20', description: 'Safeway', amount: -72.15 },
  { date: '2026-04-21', description: 'Red Cross Donation', amount: -50.0 },
  { date: '2026-04-22', description: 'Lyft Ride', amount: -14.25 },
  { date: '2026-04-24', description: 'CVS Pharmacy', amount: -23.4 },
  { date: '2026-04-26', description: 'Spotify', amount: -10.99 },
  { date: '2026-04-28', description: 'Starbucks', amount: -5.95 },
  { date: '2026-04-29', description: 'AMC Theatres', amount: -32.5 },

  // ---- May 2026 ----
  { date: '2026-05-01', description: 'Paycheck - Direct Deposit Acme Corp', amount: 2455.8 },
  { date: '2026-05-01', description: 'Rent Payment - Oakwood Apartments', amount: -1650.0 },
  { date: '2026-05-02', description: "Trader Joe's", amount: -70.42 },
  { date: '2026-05-03', description: 'Starbucks', amount: -6.5 },
  { date: '2026-05-04', description: 'Grace Community Church Tithe', amount: -490.0 },
  { date: '2026-05-04', description: 'Cheesecake Factory', amount: -86.2 },
  { date: '2026-05-05', description: 'Shell Gas Station', amount: -45.3 },
  { date: '2026-05-06', description: 'Best Buy - Laptop', amount: -1799.0 },
  { date: '2026-05-07', description: 'Chipotle', amount: -13.95 },
  { date: '2026-05-08', description: 'Netflix', amount: -15.49 },
  { date: '2026-05-09', description: 'Whole Foods Market', amount: -94.66 },
  { date: '2026-05-10', description: 'Uber Trip', amount: -22.1 },
  { date: '2026-05-11', description: 'Starbucks', amount: -6.5 },
  { date: '2026-05-12', description: 'Planet Fitness', amount: -24.99 },
  { date: '2026-05-13', description: 'Comcast Xfinity Internet', amount: -79.99 },
  { date: '2026-05-14', description: 'PG&E Electric', amount: -98.7 },
  { date: '2026-05-15', description: 'Paycheck - Direct Deposit Acme Corp', amount: 2455.8 },
  { date: '2026-05-16', description: 'Sushi Palace', amount: -64.8 },
  { date: '2026-05-17', description: 'Amazon Purchase', amount: -119.34 },
  { date: '2026-05-18', description: 'Starbucks', amount: -7.1 },
  { date: '2026-05-19', description: 'Safeway', amount: -65.9 },
  { date: '2026-05-20', description: 'Lyft Ride', amount: -16.75 },
  { date: '2026-05-21', description: 'Verizon Wireless', amount: -85.0 },
  { date: '2026-05-22', description: 'Walgreens', amount: -18.2 },
  { date: '2026-05-23', description: 'Olive Garden', amount: -52.3 },
  { date: '2026-05-24', description: 'Spotify', amount: -10.99 },
  { date: '2026-05-25', description: 'Target', amount: -78.45 },
  { date: '2026-05-26', description: 'GoFundMe Donation', amount: -40.0 },
  { date: '2026-05-27', description: 'Starbucks', amount: -6.5 },
  { date: '2026-05-28', description: 'In-N-Out Burger', amount: -15.4 },
  { date: '2026-05-30', description: 'Tax Refund - IRS Treasury', amount: 420.0 },

  // ---- June 2026 (partial month to date) ----
  { date: '2026-06-01', description: 'Paycheck - Direct Deposit Acme Corp', amount: 2455.8 },
  { date: '2026-06-01', description: 'Rent Payment - Oakwood Apartments', amount: -1650.0 },
  { date: '2026-06-02', description: 'Grace Community Church Tithe', amount: -245.0 },
  { date: '2026-06-02', description: "Trader Joe's", amount: -58.12 },
  { date: '2026-06-02', description: 'Starbucks', amount: -6.5 },
  { date: '2026-06-03', description: 'Chipotle', amount: -14.25 },
  { date: '2026-06-03', description: 'Shell Gas Station', amount: -44.8 },
  { date: '2026-06-03', description: 'Planet Fitness', amount: -24.99 },
  { date: '2026-06-04', description: 'Netflix', amount: -15.49 },
  { date: '2026-06-04', description: 'Uber Trip', amount: -19.3 },
  { date: '2026-06-05', description: 'Whole Foods Market', amount: -76.55 },
  { date: '2026-06-05', description: 'Starbucks', amount: -6.5 },
]

/** Build fresh Transaction objects (with ids + auto categories) from the sample. */
export function loadSampleTransactions(): Transaction[] {
  return SAMPLE_ROWS.map((r) => ({
    id: newId(),
    date: r.date,
    description: r.description,
    amount: r.amount,
    category: categorize(r.description, r.amount),
  }))
}

/** CSV text of the sample, used by the "Download sample CSV" link. */
export function sampleCsv(): string {
  const header = 'Date,Description,Amount'
  const lines = SAMPLE_ROWS.map(
    (r) => `${r.date},"${r.description.replace(/"/g, '""')}",${r.amount.toFixed(2)}`,
  )
  return [header, ...lines].join('\n')
}
