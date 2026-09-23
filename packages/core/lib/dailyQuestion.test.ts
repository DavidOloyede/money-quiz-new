import { afterEach, describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { GENERAL_QUESTIONS } from '../data/generalQuestions'
import { XP } from './gamification'
import {
  answerDaily,
  buildDailyQuestion,
  dailyQuestionXp,
  generalQuestionForDay,
  getDailyState,
  type DailyState,
} from './dailyQuestion'
import { setStorageBackend, type KVBackend } from './storage'

/** Map-backed fake store, so save/load round-trips are real in tests. */
function memoryBackend(): KVBackend {
  const mem = new Map<string, string>()
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  }
}

afterEach(() => setStorageBackend(null))

let n = 0
function tx(date: string, amount: number, category: string, description: string): Transaction {
  return { id: `t${n++}`, date, description, amount, category }
}

const NOW = new Date(2026, 5, 9)

describe('general question bank', () => {
  it('is well-formed', () => {
    for (const g of GENERAL_QUESTIONS) {
      expect(g.options.length).toBeGreaterThanOrEqual(3)
      expect(new Set(g.options).size).toBe(g.options.length)
      expect(g.correctIndex).toBeGreaterThanOrEqual(0)
      expect(g.correctIndex).toBeLessThan(g.options.length)
      expect(g.answerDetail).toBeTruthy()
      expect(g.takeaway).toBeTruthy()
    }
  })

  it('rotates deterministically by day, like the verse of the day', () => {
    const today = generalQuestionForDay(NOW)
    expect(generalQuestionForDay(new Date(2026, 5, 9, 23, 59)).id).toBe(today.id)
    const tomorrow = generalQuestionForDay(new Date(2026, 5, 10))
    expect(tomorrow.id).not.toBe(today.id)
  })
})

describe('buildDailyQuestion', () => {
  it('falls back to a general question with no data', () => {
    const { question, source } = buildDailyQuestion([], { now: NOW })
    expect(source).toBe('general')
    expect(question.kind).toBe('general')
    expect(question.options.length).toBeGreaterThanOrEqual(3)
  })

  it('personalizes once there is transaction data', () => {
    const txs = [
      tx('2026-05-01', 3000, 'income', 'Paycheck'),
      tx('2026-05-02', -1200, 'rent', 'Rent Payment'),
      tx('2026-05-10', -150, 'groceries', 'Safeway'),
      tx('2026-05-12', -45, 'dining', 'Chipotle'),
    ]
    const { source } = buildDailyQuestion(txs, { now: NOW })
    expect(source).toBe('personal')
  })

  it('carries the receipts, so the day\'s figure can be checked', () => {
    const txs = [
      tx('2026-05-01', 3000, 'income', 'Paycheck'),
      tx('2026-05-02', -1200, 'rent', 'Rent Payment'),
      tx('2026-05-10', -150, 'groceries', 'Safeway'),
      tx('2026-05-12', -45, 'dining', 'Chipotle'),
    ]
    const { question } = buildDailyQuestion(txs, { now: NOW })
    expect(question.evidence?.length).toBeGreaterThan(0)
    expect(question.evidence![0].items.length).toBeGreaterThan(0)
  })

  it('keeps the evidence across the save/load round-trip', () => {
    const txs = [
      tx('2026-05-01', 3000, 'income', 'Paycheck'),
      tx('2026-05-02', -1200, 'rent', 'Rent Payment'),
      tx('2026-05-10', -150, 'groceries', 'Safeway'),
      tx('2026-05-12', -45, 'dining', 'Chipotle'),
    ]
    setStorageBackend(memoryBackend())
    const fresh = getDailyState(txs, { now: NOW })
    expect(fresh.source).toBe('personal')
    // Same day again: the saved copy comes back, receipts intact.
    const reloaded = getDailyState(txs, { now: NOW })
    expect(reloaded.question.id).toBe(fresh.question.id)
    expect(reloaded.question.evidence).toEqual(fresh.question.evidence)
    expect(reloaded.question.evidence!.length).toBeGreaterThan(0)
  })
})

describe('getDailyState / answerDaily', () => {
  it('stamps the local day and starts unanswered', () => {
    const state = getDailyState([], { now: NOW })
    expect(state.day).toBe('2026-06-09')
    expect(state.answer).toBeNull()
  })

  it('records the first answer only', () => {
    const state: DailyState = {
      day: '2026-06-09',
      question: generalQuestionForDay(NOW),
      source: 'general',
      answer: null,
    }
    const answered = answerDaily(state, 1)
    expect(answered.answer).toBe(1)
    expect(answerDaily(answered, 2).answer).toBe(1)
  })
})

describe('dailyQuestionXp', () => {
  it('pays for showing up, more for being right', () => {
    expect(dailyQuestionXp(false)).toBe(XP.dailyQuestion)
    expect(dailyQuestionXp(true)).toBe(XP.dailyQuestion + XP.dailyQuestionCorrectBonus)
  })
})
