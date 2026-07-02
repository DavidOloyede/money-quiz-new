import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { askedKinds, generateQuiz, quizInsights } from './quiz'

let n = 0
function tx(date: string, amount: number, category: string, description: string): Transaction {
  return { id: `t${n++}`, date, description, amount, category }
}

// Quizzes are generated relative to "now"; keep everything inside this year.
const NOW = new Date(2026, 5, 9)

/** Rich enough to feed many generators: income, varied spend, repeats, tithes. */
function richFixture(): Transaction[] {
  const out: Transaction[] = []
  for (const m of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']) {
    out.push(tx(`${m}-01`, 3000, 'income', 'Paycheck'))
    out.push(tx(`${m}-01`, -1200, 'rent', 'Rent Payment'))
    out.push(tx(`${m}-05`, -300, 'tithes', 'Church Tithe'))
    out.push(tx(`${m}-08`, -220, 'loans', 'Student Loan Payment'))
    out.push(tx(`${m}-10`, -150.25, 'groceries', 'Safeway'))
    out.push(tx(`${m}-12`, -45.5, 'dining', 'Chipotle'))
    out.push(tx(`${m}-15`, -15.49, 'subscriptions', 'Netflix'))
  }
  out.push(tx('2026-05-20', -899, 'shopping', 'Best Buy - TV'))
  return out
}

describe('generateQuiz', () => {
  it('returns no questions without data', () => {
    expect(generateQuiz([], { now: NOW })).toEqual([])
  })

  it('produces well-formed, deduplicated questions', () => {
    const qs = generateQuiz(richFixture(), { now: NOW })
    expect(qs.length).toBeGreaterThanOrEqual(5)
    expect(qs.length).toBeLessThanOrEqual(10)
    const kinds = qs.map((q) => q.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    for (const q of qs) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThan(q.options.length)
      expect(q.prompt).toBeTruthy()
      expect(q.answerDetail).toBeTruthy()
      expect(q.takeaway).toBeTruthy()
    }
  })

  it('asks the tithe question when giving dominates the data (eventually — generation shuffles)', () => {
    const txs = [
      tx('2026-03-01', 3000, 'income', 'Paycheck'),
      tx('2026-03-05', -300, 'tithes', 'Church Tithe'),
      tx('2026-04-01', 3000, 'income', 'Paycheck'),
      tx('2026-04-05', -300, 'tithes', 'Church Tithe'),
    ]
    let sawTithe = false
    for (let i = 0; i < 20 && !sawTithe; i++) {
      const kinds = askedKinds(generateQuiz(txs, { now: NOW }))
      sawTithe = kinds.has('titheGiving') || kinds.has('tithePercent')
    }
    expect(sawTithe).toBe(true)
  })
})

/** Generate quizzes until a question of the given kind appears (generation shuffles). */
function findQuestion(txs: Transaction[], kind: string, tries = 50) {
  for (let i = 0; i < tries; i++) {
    const q = generateQuiz(txs, { now: NOW }).find((x) => x.kind === kind)
    if (q) return q
  }
  return undefined
}

describe('income, refunds & transaction count in questions', () => {
  it('counts expenses only in the transaction-count question', () => {
    // richFixture: 31 expenses + 5 paychecks this year — the question counts 31.
    const q = findQuestion(richFixture(), 'txnCount:thisYear')
    expect(q).toBeDefined()
    expect(q!.answerDetail).toContain('You spent money 31 times')
  })

  it('excludes refunds from the income question', () => {
    const txs = [
      tx('2026-04-01', 3000, 'income', 'Paycheck'),
      tx('2026-05-01', 3000, 'income', 'Paycheck'),
      tx('2026-05-10', -200, 'shopping', 'Best Buy'),
      tx('2026-05-20', 60, 'shopping', 'Best Buy Refund'),
      tx('2026-05-12', -45, 'dining', 'Chipotle'),
    ]
    const q = findQuestion(txs, 'totalIncome:thisYear')
    expect(q).toBeDefined()
    expect(q!.answerDetail).toContain('$6,000.00') // not $6,060
  })

  it('asks about recurring bills only — habits like Amazon are left out', () => {
    const txs: Transaction[] = []
    for (const m of ['2026-01', '2026-02', '2026-03']) {
      txs.push(tx(`${m}-01`, -1200, 'rent', 'Rent Payment'))
      txs.push(tx(`${m}-08`, -90 - Math.random(), 'utilities', 'Champion Energy'))
      txs.push(tx(`${m}-15`, -15.49, 'subscriptions', 'Netflix'))
    }
    // A varying discretionary repeat — a habit, not a bill.
    txs.push(tx('2026-01-12', -35.2, 'shopping', 'Amazon Marketplace'))
    txs.push(tx('2026-02-12', -78.5, 'shopping', 'Amazon Marketplace'))
    txs.push(tx('2026-03-12', -12.99, 'shopping', 'Amazon Marketplace'))
    const q = findQuestion(txs, 'recurringCount')
    expect(q).toBeDefined()
    expect(q!.answerDetail).toContain('3 recurring bills')
  })
})

describe('quizInsights', () => {
  it('reports tithes with the exact percent of income', () => {
    const txs = [
      tx('2026-04-01', 3000, 'income', 'Paycheck'),
      tx('2026-04-05', -300, 'tithes', 'Church Tithe'),
    ]
    const insights = quizInsights(txs, new Set(['titheGiving']))
    const tithe = insights.find((s) => s.includes('tithes & offerings'))
    expect(tithe).toContain('$300.00')
    expect(tithe).toContain('10% of income')
  })

  it('only surfaces topics that were asked', () => {
    const insights = quizInsights(richFixture(), new Set(['debtPayments']))
    expect(insights.some((s) => s.includes('loans & debt'))).toBe(true)
    expect(insights.some((s) => s.includes('tithes'))).toBe(false)
  })
})

describe('askedKinds', () => {
  it('strips the range suffix down to the base type', () => {
    const qs = generateQuiz(richFixture(), { now: NOW })
    for (const k of askedKinds(qs)) expect(k).not.toContain(':')
  })
})
