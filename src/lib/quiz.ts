import type { Transaction } from '../types'
import { allCategories, categoryLabel } from './categories'
import { formatAbs, formatCurrency, formatMonth, formatPercent } from './format'
import {
  avgDailySpend,
  countsTowardTotals,
  filterByRange,
  merchantStats,
  monthKey,
  netTotal,
  rangeLabel,
  recurringPayments,
  spanDays,
  spendingByCategory,
  topExpenses,
  totalIncome,
  totalSpending,
  type TimeRange,
} from './analysis'
import { newId } from './storage'

export interface QuizQuestion {
  id: string
  /** type[:range] — used to keep a quiz varied and free of duplicates */
  kind: string
  prompt: string
  options: string[]
  correctIndex: number
  /** the real figure, shown after answering */
  answerDetail: string
  /** one-sentence takeaway about the user's habits */
  takeaway: string
}

// ----------------------------- random helpers -----------------------------

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive)
}

function pick<T>(arr: T[]): T {
  return arr[randInt(arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ----------------------------- option builders -----------------------------

interface Choices {
  options: string[]
  correctIndex: number
}

function assemble(correct: string, distractors: string[]): Choices | null {
  const uniq: string[] = []
  for (const d of distractors) {
    if (d !== correct && !uniq.includes(d)) uniq.push(d)
  }
  if (uniq.length < 3) return null
  const options = shuffle([correct, ...uniq.slice(0, 3)])
  return { options, correctIndex: options.indexOf(correct) }
}

/** Round to a tidy figure so the correct option doesn't stand out by precision. */
function roundMoney(n: number): number {
  const abs = Math.abs(n)
  if (abs >= 100) return Math.round(n)
  if (abs >= 20) return Math.round(n * 2) / 2
  return Math.round(n * 100) / 100
}

function moneyDistractorValues(correct: number, n = 3): number[] {
  const factors = [0.4, 0.55, 0.7, 0.8, 0.9, 1.1, 1.2, 1.35, 1.5, 1.8, 2.2]
  const seen = new Set<number>([roundMoney(correct)])
  const out: number[] = []
  for (const f of shuffle(factors)) {
    if (out.length >= n) break
    const v = roundMoney(correct * f)
    if (v <= 0 || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  let step = 1
  while (out.length < n && step < 60) {
    const v = roundMoney(correct + step * Math.max(1, correct * 0.07))
    if (v > 0 && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
    step++
  }
  return out
}

function moneyChoices(correct: number, anchors: number[] = []): Choices | null {
  const c = roundMoney(correct)
  const seen = new Set<number>([c])
  const values: number[] = []
  for (const a of anchors) {
    const r = roundMoney(a)
    if (r > 0 && !seen.has(r)) {
      seen.add(r)
      values.push(r)
    }
  }
  for (const v of moneyDistractorValues(correct)) {
    if (values.length >= 3) break
    if (!seen.has(v)) {
      seen.add(v)
      values.push(v)
    }
  }
  return assemble(formatCurrency(c), values.map((v) => formatCurrency(v)))
}

function countDistractorValues(correct: number, n = 3): number[] {
  const seen = new Set<number>([correct])
  const out: number[] = []
  const small = [-3, -2, -1, 1, 2, 3, 4]
  const candidates =
    correct >= 14
      ? [
          Math.round(correct * 0.6),
          Math.round(correct * 0.75),
          Math.round(correct * 1.25),
          Math.round(correct * 1.5),
          correct + 5,
          correct - 5,
        ]
      : small.map((d) => correct + d)
  for (const v of shuffle(candidates)) {
    if (out.length >= n) break
    if (v >= 0 && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  let k = 4
  while (out.length < n && k < 40) {
    const v = correct + k
    if (!seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
    k++
  }
  return out
}

function countChoices(correct: number, unit: string): Choices | null {
  const label = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`
  return assemble(
    label(correct),
    countDistractorValues(correct).map(label),
  )
}

function pctChoices(correct: number): Choices | null {
  const c = Math.round(correct)
  const seen = new Set<number>([c])
  const out: number[] = []
  const offsets = [-22, -16, -12, -8, -5, 5, 8, 12, 16, 22, 28]
  for (const o of shuffle(offsets)) {
    if (out.length >= 3) break
    const v = Math.min(99, Math.max(1, c + o))
    if (!seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return assemble(formatPercent(c), out.map((v) => formatPercent(v)))
}

/** Signed money question (up/down, positive/negative) with mixed-direction distractors. */
function signedChoices(correct: number, labeler: (x: number) => string): Choices | null {
  const c = roundMoney(correct)
  const correctLabel = labeler(c)
  const seen = new Set<string>([correctLabel])
  const distractors: string[] = []
  const candidates = [
    -c,
    roundMoney(c * 1.6),
    roundMoney(c * 0.5),
    roundMoney(-c * 0.6),
    roundMoney(c * 1.25),
    roundMoney(-c * 1.3),
  ]
  for (const v of shuffle(candidates)) {
    if (distractors.length >= 3) break
    if (v === 0) continue
    const lbl = labeler(v)
    if (!seen.has(lbl)) {
      seen.add(lbl)
      distractors.push(lbl)
    }
  }
  let k = 1
  while (distractors.length < 3 && k < 30) {
    const base = Math.abs(c) || 10
    const v = roundMoney((c >= 0 ? -1 : 1) * base * (0.2 * k + 0.1))
    const lbl = labeler(v)
    if (v !== 0 && !seen.has(lbl)) {
      seen.add(lbl)
      distractors.push(lbl)
    }
    k++
  }
  return assemble(correctLabel, distractors)
}

function upDownLabel(x: number): string {
  return x >= 0 ? `Up by about ${formatAbs(x)}` : `Down by about ${formatAbs(x)}`
}

function posNegLabel(x: number): string {
  return x >= 0
    ? `Positive — about ${formatAbs(x)}`
    : `Negative — about ${formatAbs(x)}`
}

// ----------------------------- context -----------------------------

interface Ctx {
  now: Date
  all: Transaction[]
  budgets: Record<string, number>
  rangesWithData: TimeRange[]
  tx: (r: TimeRange) => Transaction[]
}

function buildCtx(
  transactions: Transaction[],
  now: Date,
  budgets: Record<string, number>,
): Ctx {
  const cache = new Map<TimeRange, Transaction[]>()
  const tx = (r: TimeRange) => {
    if (!cache.has(r)) cache.set(r, filterByRange(transactions, r, now))
    return cache.get(r)!
  }
  const rangesWithData = (['thisMonth', 'lastMonth', 'thisYear'] as TimeRange[]).filter(
    (r) => tx(r).length > 0,
  )
  return { now, all: transactions, budgets, rangesWithData, tx }
}

function mk(
  kind: string,
  prompt: string,
  choices: Choices,
  answerDetail: string,
  takeaway: string,
): QuizQuestion {
  return {
    id: newId(),
    kind,
    prompt,
    options: choices.options,
    correctIndex: choices.correctIndex,
    answerDetail,
    takeaway,
  }
}

// ----------------------------- generators -----------------------------

function genCategorySpend(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const cats = spendingByCategory(ctx.tx(range)).filter((c) => c.total > 0)
  if (cats.length === 0) return null
  const choiceCat = pick(cats.slice(0, Math.min(5, cats.length)))
  const choices = moneyChoices(choiceCat.total)
  if (!choices) return null
  const label = categoryLabel(choiceCat.category)
  return mk(
    `categorySpend:${range}`,
    `How much did you spend on ${label} ${rangeLabel(range)}?`,
    choices,
    `You spent ${formatCurrency(choiceCat.total)} on ${label} ${rangeLabel(range)} across ${choiceCat.count} transaction${choiceCat.count === 1 ? '' : 's'}.`,
    `${label} is one of your active spending buckets — worth a glance when you trim.`,
  )
}

function genBiggestCategory(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const cats = spendingByCategory(txs)
  if (cats.length < 2) return null
  const total = totalSpending(txs)
  const winner = cats[0]
  const present = cats.slice(1).map((c) => categoryLabel(c.category))
  const extra = allCategories()
    .filter((d) => d.kind === 'spending' && d.id !== winner.category)
    .map((d) => d.label)
  const distractors = [...present, ...extra.filter((e) => !present.includes(e))]
  const choices = assemble(categoryLabel(winner.category), distractors)
  if (!choices) return null
  const pct = total > 0 ? (winner.total / total) * 100 : 0
  return mk(
    `biggestCategory:${range}`,
    `Which category did you spend the most on ${rangeLabel(range)}?`,
    choices,
    `${categoryLabel(winner.category)} led at ${formatCurrency(winner.total)} — about ${formatPercent(pct)} of your spending ${rangeLabel(range)}.`,
    `Your largest category is where small percentage cuts free up the most cash.`,
  )
}

function genPercentToCategory(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const total = totalSpending(txs)
  if (total <= 0) return null
  const cats = spendingByCategory(txs).filter((c) => c.total > 0)
  if (cats.length < 2) return null
  const choiceCat = pick(cats.slice(0, Math.min(4, cats.length)))
  const pct = (choiceCat.total / total) * 100
  const choices = pctChoices(pct)
  if (!choices) return null
  const label = categoryLabel(choiceCat.category)
  return mk(
    `pctCategory:${range}`,
    `Roughly what percentage of your spending ${rangeLabel(range)} went to ${label}?`,
    choices,
    `${label} was ${formatPercent(pct)} of your ${formatCurrency(total)} in spending ${rangeLabel(range)}.`,
    `Knowing each category's share makes it obvious where your money actually goes.`,
  )
}

function genLargestExpenseAmount(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const top = topExpenses(ctx.tx(range), 6)
  if (top.length < 2) return null
  const winner = top[0]
  const anchors = top.slice(1).map((e) => e.amount)
  const choices = moneyChoices(winner.amount, anchors)
  if (!choices) return null
  return mk(
    `largestExpenseAmt:${range}`,
    `What was your single largest expense ${rangeLabel(range)}?`,
    choices,
    `Your biggest single charge ${rangeLabel(range)} was ${formatCurrency(winner.amount)} at ${winner.description}.`,
    `One large purchase can outweigh weeks of small ones — large charges deserve scrutiny.`,
  )
}

function genLargestExpenseMerchant(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const top = topExpenses(ctx.tx(range), 8)
  if (top.length < 4) return null
  const winner = top[0]
  const distractors = top.slice(1).map((e) => e.description)
  const choices = assemble(winner.description, distractors)
  if (!choices) return null
  return mk(
    `largestExpenseMerchant:${range}`,
    `Which of these was your single largest expense ${rangeLabel(range)}?`,
    choices,
    `${winner.description} was your largest expense ${rangeLabel(range)} at ${formatCurrency(winner.amount)}.`,
    `Recognizing your biggest line items is the first step to questioning them.`,
  )
}

function genMerchantCount(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const minCount = range === 'thisYear' ? 3 : 2
  const merchants = merchantStats(ctx.tx(range)).filter((m) => m.count >= minCount)
  if (merchants.length === 0) return null
  const m = pick(merchants.slice(0, Math.min(4, merchants.length)))
  const choices = countChoices(m.count, 'time')
  if (!choices) return null
  return mk(
    `merchantCount:${range}`,
    `How many times did you transact at ${m.merchant} ${rangeLabel(range)}?`,
    choices,
    `You transacted at ${m.merchant} ${m.count} times ${rangeLabel(range)}, totaling ${formatCurrency(m.total)}.`,
    `Frequent small purchases add up fast — ${m.merchant} is one of your repeat stops.`,
  )
}

function genAvgDaily(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const spend = totalSpending(txs)
  if (spend <= 0) return null
  const avg = avgDailySpend(txs)
  const choices = moneyChoices(avg)
  if (!choices) return null
  return mk(
    `avgDaily:${range}`,
    `What was your average spending per day ${rangeLabel(range)}?`,
    choices,
    `You averaged ${formatCurrency(avg)} per day — ${formatCurrency(spend)} over ${spanDays(txs)} days ${rangeLabel(range)}.`,
    `A daily-spend number turns a big total into something you can feel day to day.`,
  )
}

function genNet(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const income = totalIncome(txs)
  const spend = totalSpending(txs)
  if (income === 0 && spend === 0) return null
  const net = netTotal(txs)
  const choices = signedChoices(net, posNegLabel)
  if (!choices) return null
  return mk(
    `net:${range}`,
    `Was your net (income minus spending) ${rangeLabel(range)} positive or negative — and by about how much?`,
    choices,
    `Your net ${rangeLabel(range)} was ${formatCurrency(net)} (income ${formatCurrency(income)} minus spending ${formatCurrency(spend)}).`,
    net >= 0
      ? `You lived within your means ${rangeLabel(range)} — that surplus is what builds savings.`
      : `You spent more than you earned ${rangeLabel(range)} — a signal to watch next month.`,
  )
}

function genTotalSpending(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const spend = totalSpending(txs)
  if (spend <= 0) return null
  const choices = moneyChoices(spend)
  if (!choices) return null
  return mk(
    `totalSpending:${range}`,
    `What was your total spending ${rangeLabel(range)}?`,
    choices,
    `You spent ${formatCurrency(spend)} ${rangeLabel(range)}.`,
    `Knowing your headline spend is the anchor for every budgeting decision.`,
  )
}

function genTotalIncome(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const txs = ctx.tx(range)
  const income = totalIncome(txs)
  if (income <= 0) return null
  const choices = moneyChoices(income)
  if (!choices) return null
  return mk(
    `totalIncome:${range}`,
    `What was your total income ${rangeLabel(range)}?`,
    choices,
    `You took in ${formatCurrency(income)} ${rangeLabel(range)}.`,
    `Tracking income alongside spending is what makes a net number meaningful.`,
  )
}

function genTxnCount(ctx: Ctx, range: TimeRange): QuizQuestion | null {
  const n = ctx.tx(range).length
  if (n < 4) return null
  const choices = countChoices(n, 'transaction')
  if (!choices) return null
  return mk(
    `txnCount:${range}`,
    `How many transactions did you record ${rangeLabel(range)}?`,
    choices,
    `You recorded ${n} transactions ${rangeLabel(range)}.`,
    `More transactions mean more small decisions — each is a chance to spend mindfully.`,
  )
}

function monthOffsetKey(now: Date, back: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function genCategoryTrend(ctx: Ctx): QuizQuestion | null {
  const curKey = monthOffsetKey(ctx.now, 1) // last full month
  const prevKey = monthOffsetKey(ctx.now, 2) // the month before that
  const cur = ctx.all.filter((t) => monthKey(t.date) === curKey)
  const prev = ctx.all.filter((t) => monthKey(t.date) === prevKey)
  if (cur.length === 0 || prev.length === 0) return null

  const curCats = new Map(spendingByCategory(cur).map((c) => [c.category, c.total]))
  const prevCats = new Map(spendingByCategory(prev).map((c) => [c.category, c.total]))
  const candidates = [...curCats.keys()].filter((c) => {
    const cv = curCats.get(c) ?? 0
    const pv = prevCats.get(c) ?? 0
    return cv > 0 && pv > 0 && Math.abs(cv - pv) >= 1
  })
  if (candidates.length === 0) return null

  const category = pick(candidates)
  const cv = curCats.get(category) ?? 0
  const pv = prevCats.get(category) ?? 0
  const delta = cv - pv
  const choices = signedChoices(delta, upDownLabel)
  if (!choices) return null
  const label = categoryLabel(category)
  const dir = delta >= 0 ? 'up' : 'down'
  return mk(
    'categoryTrend',
    `From ${formatMonth(prevKey)} to ${formatMonth(curKey)}, did your ${label} spending go up or down — and by about how much?`,
    choices,
    `${label} went ${dir} ${formatCurrency(Math.abs(delta))}: ${formatCurrency(pv)} in ${formatMonth(prevKey)} versus ${formatCurrency(cv)} in ${formatMonth(curKey)}.`,
    `Month-over-month shifts in a single category are the early warning signs of lifestyle creep.`,
  )
}

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function genBusiestDay(ctx: Ctx): QuizQuestion | null {
  const byDow = [0, 0, 0, 0, 0, 0, 0]
  for (const t of ctx.all) {
    if (t.amount < 0 && countsTowardTotals(t)) {
      const dow = new Date(`${t.date}T00:00:00Z`).getUTCDay()
      byDow[dow] += -t.amount
    }
  }
  const total = byDow.reduce((a, b) => a + b, 0)
  const active = byDow.filter((v) => v > 0).length
  if (total <= 0 || active < 3) return null
  let maxIdx = 0
  for (let i = 1; i < 7; i++) if (byDow[i] > byDow[maxIdx]) maxIdx = i
  const winner = DOW[maxIdx]
  const choices = assemble(
    winner,
    DOW.filter((_, i) => i !== maxIdx),
  )
  if (!choices) return null
  return mk(
    'busiestDay',
    'Which day of the week do you spend the most on?',
    choices,
    `You spend the most on ${winner}s — ${formatCurrency(byDow[maxIdx])} in total.`,
    'Knowing your heaviest spending day can reveal habits worth a second look.',
  )
}

function genRecurringCount(ctx: Ctx): QuizQuestion | null {
  const rec = recurringPayments(ctx.all)
  if (rec.length < 3) return null
  const choices = countChoices(rec.length, 'recurring payment')
  if (!choices) return null
  return mk(
    'recurringCount',
    'How many recurring payments do you have (charges that repeat across 3+ months)?',
    choices,
    `We spotted ${rec.length} recurring payments, like ${rec[0].merchant} and ${rec[1].merchant}.`,
    'Recurring charges are easy to forget — counting them is the first step to pruning.',
  )
}

function genRecurringTotal(ctx: Ctx): QuizQuestion | null {
  const rec = recurringPayments(ctx.all)
  if (rec.length < 2) return null
  const monthly = rec.reduce((s, r) => s + r.monthlyEstimate, 0)
  const choices = moneyChoices(monthly)
  if (!choices) return null
  return mk(
    'recurringTotal',
    'About how much do your recurring payments cost you per month?',
    choices,
    `Your recurring payments run about ${formatCurrency(monthly)} per month across ${rec.length} merchants.`,
    'Recurring costs quietly set your baseline — trimming one compounds every month.',
  )
}

function genBudget(ctx: Ctx): QuizQuestion | null {
  const budgeted = Object.entries(ctx.budgets).filter(([, b]) => b > 0)
  if (budgeted.length === 0) return null
  const lastKey = monthOffsetKey(ctx.now, 1)
  const lastTx = ctx.all.filter((t) => monthKey(t.date) === lastKey)
  const spent = new Map(spendingByCategory(lastTx).map((c) => [c.category, c.total]))
  const candidates = budgeted
    .map(([cat, budget]) => ({ cat, budget, spend: spent.get(cat) ?? 0 }))
    .filter((c) => c.spend > 0)
  if (candidates.length === 0) return null
  const choice = pick(candidates)
  const choices = moneyChoices(choice.spend)
  if (!choices) return null
  const label = categoryLabel(choice.cat)
  const verdict = choice.spend > choice.budget ? 'over' : 'under'
  return mk(
    'budget',
    `You set a ${formatCurrency(choice.budget)} budget for ${label}. About how much did you actually spend last month?`,
    choices,
    `You spent ${formatCurrency(choice.spend)} on ${label} last month — ${verdict} your ${formatCurrency(choice.budget)} budget.`,
    'Comparing real spend to your budget is where intentions meet reality.',
  )
}

// ----------------------------- assembly -----------------------------

const RANGE_GENERATORS: ((ctx: Ctx, r: TimeRange) => QuizQuestion | null)[] = [
  genCategorySpend,
  genBiggestCategory,
  genPercentToCategory,
  genLargestExpenseAmount,
  genLargestExpenseMerchant,
  genMerchantCount,
  genAvgDaily,
  genNet,
  genTotalSpending,
  genTotalIncome,
  genTxnCount,
]

function baseType(kind: string): string {
  return kind.split(':')[0]
}

/** Round-robin across question types so a quiz feels varied, not repetitive. */
function pickSpread(questions: QuizQuestion[], n: number): QuizQuestion[] {
  const groups = new Map<string, QuizQuestion[]>()
  for (const q of questions) {
    const b = baseType(q.kind)
    if (!groups.has(b)) groups.set(b, [])
    groups.get(b)!.push(q)
  }
  const order = shuffle([...groups.keys()])
  const out: QuizQuestion[] = []
  let progressed = true
  while (out.length < n && progressed) {
    progressed = false
    for (const b of order) {
      const arr = groups.get(b)!
      if (arr.length > 0) {
        out.push(arr.shift()!)
        progressed = true
        if (out.length >= n) break
      }
    }
  }
  return out
}

export interface QuizOptions {
  now?: Date
  count?: number
  budgets?: Record<string, number>
}

/**
 * Build a fresh, randomized quiz from the user's own transactions. Returns
 * between 5 and `count` (default 10) questions, varied across types and ranges.
 * Each call reshuffles, so retaking yields different questions.
 */
export function generateQuiz(
  transactions: Transaction[],
  opts: QuizOptions = {},
): QuizQuestion[] {
  const now = opts.now ?? new Date()
  const desired = Math.min(10, Math.max(5, opts.count ?? 10))
  const ctx = buildCtx(transactions, now, opts.budgets ?? {})
  if (ctx.all.length === 0) return []

  const candidates: QuizQuestion[] = []
  const seenKinds = new Set<string>()
  const add = (q: QuizQuestion | null) => {
    if (q && !seenKinds.has(q.kind)) {
      seenKinds.add(q.kind)
      candidates.push(q)
    }
  }

  for (const range of ctx.rangesWithData) {
    for (const gen of shuffle(RANGE_GENERATORS)) {
      add(gen(ctx, range))
    }
  }
  add(genCategoryTrend(ctx))
  add(genBusiestDay(ctx))
  add(genRecurringCount(ctx))
  add(genRecurringTotal(ctx))
  add(genBudget(ctx))

  return pickSpread(shuffle(candidates), desired)
}

/**
 * A few plain-language insights for the end-of-quiz summary. Each insight is
 * only shown when the quiz actually asked about that topic, so "What this quiz
 * revealed" never surfaces a figure (like your largest expense) that the player
 * was never quizzed on. Pass the set of base question kinds that were asked;
 * omit it to show everything.
 */
export function quizInsights(transactions: Transaction[], askedKinds?: Set<string>): string[] {
  if (transactions.length === 0) return []
  const wants = (...kinds: string[]) => !askedKinds || kinds.some((k) => askedKinds.has(k))
  const out: string[] = []
  const cats = spendingByCategory(transactions)
  const spend = totalSpending(transactions)
  const income = totalIncome(transactions)

  if (wants('biggestCategory', 'pctCategory', 'categorySpend') && cats[0] && spend > 0) {
    out.push(
      `Your biggest spending category is ${categoryLabel(cats[0].category)} at ${formatCurrency(cats[0].total)} (${formatPercent((cats[0].total / spend) * 100)} of all spending).`,
    )
  }
  if (wants('largestExpenseAmt', 'largestExpenseMerchant')) {
    const top = topExpenses(transactions, 1)[0]
    if (top) {
      out.push(
        `Your single largest expense was ${formatCurrency(top.amount)} at ${top.description}.`,
      )
    }
  }
  if (wants('net', 'totalIncome', 'totalSpending') && income > 0) {
    const rate = ((income - spend) / income) * 100
    out.push(
      rate >= 0
        ? `You kept about ${formatPercent(rate)} of your income — a positive savings rate.`
        : `You spent more than you earned overall, a savings rate of ${formatPercent(rate)}.`,
    )
  }
  if (wants('merchantCount')) {
    const merch = merchantStats(transactions)[0]
    if (merch && merch.count >= 3) {
      out.push(`Your most frequent merchant is ${merch.merchant} with ${merch.count} visits.`)
    }
  }
  if (wants('recurringCount', 'recurringTotal')) {
    const rec = recurringPayments(transactions)
    if (rec.length >= 2) {
      const monthly = rec.reduce((s, r) => s + r.monthlyEstimate, 0)
      out.push(
        `You have ${rec.length} recurring payments costing about ${formatCurrency(monthly)}/month.`,
      )
    }
  }
  if (wants('busiestDay')) {
    const byDow = [0, 0, 0, 0, 0, 0, 0]
    for (const t of transactions) {
      if (t.amount < 0 && countsTowardTotals(t)) {
        byDow[new Date(`${t.date}T00:00:00Z`).getUTCDay()] += -t.amount
      }
    }
    if (byDow.some((v) => v > 0)) {
      let maxIdx = 0
      for (let i = 1; i < 7; i++) if (byDow[i] > byDow[maxIdx]) maxIdx = i
      out.push(`${DOW[maxIdx]} is your heaviest spending day of the week.`)
    }
  }
  return out
}

/** The set of base question types present in a quiz (e.g. "biggestCategory"). */
export function askedKinds(questions: QuizQuestion[]): Set<string> {
  return new Set(questions.map((q) => baseType(q.kind)))
}
