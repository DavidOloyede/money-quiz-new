/**
 * The daily question — one question a day, the habit hook behind the streak.
 *
 * With transaction data it's a personalized question about *your own* money
 * (drawn from the quiz generators); without any data it falls back to a
 * general financial-literacy question, so a brand-new user can start a streak
 * before connecting anything. The day's question is generated once and saved,
 * so reloads show the same question, and it rolls over at local midnight.
 */
import type { Transaction } from '../types'
import { GENERAL_QUESTIONS } from '../data/generalQuestions'
import { todayKey, XP } from './gamification'
import { generateQuiz, type QuizOptions, type QuizQuestion } from './quiz'
import { loadJSON, saveJSON, STORAGE_KEYS } from './storage'

export interface DailyState {
  /** YYYY-MM-DD (local) the question was generated for. */
  day: string
  question: QuizQuestion
  /** Personalized from the user's data, or from the general literacy bank. */
  source: 'personal' | 'general'
  /** The option the user picked; null until answered. */
  answer: number | null
}

/**
 * The general question for a given day — same days-since-epoch rotation as the
 * verse of the day, so it's deterministic without storing anything.
 */
export function generalQuestionForDay(date: Date = new Date()): QuizQuestion {
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const idx = ((days % GENERAL_QUESTIONS.length) + GENERAL_QUESTIONS.length) % GENERAL_QUESTIONS.length
  const g = GENERAL_QUESTIONS[idx]
  return {
    id: `general-${idx}`,
    kind: 'general',
    prompt: g.prompt,
    options: g.options,
    correctIndex: g.correctIndex,
    answerDetail: g.answerDetail,
    takeaway: g.takeaway,
  }
}

/** Build today's question: personalized when the data supports it, general otherwise. */
export function buildDailyQuestion(
  transactions: Transaction[],
  opts: QuizOptions = {},
): Pick<DailyState, 'question' | 'source'> {
  const personal = generateQuiz(transactions, { ...opts, count: 5 })[0]
  if (personal) return { question: personal, source: 'personal' }
  return { question: generalQuestionForDay(opts.now), source: 'general' }
}

/**
 * Load today's daily question, generating and saving a fresh one if the saved
 * one is from a previous day (or missing). Idempotent within a day.
 */
export function getDailyState(transactions: Transaction[], opts: QuizOptions = {}): DailyState {
  const day = todayKey(opts.now)
  const saved = loadJSON<DailyState | null>(STORAGE_KEYS.daily, null)
  if (saved && saved.day === day && saved.question) return saved
  const next: DailyState = { day, ...buildDailyQuestion(transactions, opts), answer: null }
  saveJSON(STORAGE_KEYS.daily, next)
  return next
}

/** Record the user's answer (first answer wins) and persist it. */
export function answerDaily(state: DailyState, choice: number): DailyState {
  if (state.answer !== null) return state
  const next = { ...state, answer: choice }
  saveJSON(STORAGE_KEYS.daily, next)
  return next
}

/** XP for answering the daily question — showing up earns, correct earns more. */
export function dailyQuestionXp(correct: boolean): number {
  return XP.dailyQuestion + (correct ? XP.dailyQuestionCorrectBonus : 0)
}
