/**
 * The general financial-literacy question bank behind the daily question.
 * These need no transaction data, so the daily habit works before any account
 * or CSV is added; once data exists, the daily question is personalized
 * instead (see lib/dailyQuestion). Tone matches the quiz: practical literacy
 * plus a few stewardship questions, each with a short explanation.
 */

export interface GeneralQuestion {
  prompt: string
  options: string[]
  correctIndex: number
  /** Shown after answering — the explanation. */
  answerDetail: string
  /** One-sentence takeaway, same voice as the quiz. */
  takeaway: string
}

export const GENERAL_QUESTIONS: GeneralQuestion[] = [
  {
    prompt: "What's usually the biggest monthly expense for most households?",
    options: ['Food & groceries', 'Housing (rent or mortgage)', 'Transportation', 'Entertainment'],
    correctIndex: 1,
    answerDetail:
      'Housing is typically the largest line item — often a third or more of take-home pay.',
    takeaway: 'Because housing dominates the budget, it’s the first number to get right.',
  },
  {
    prompt: 'The 50/30/20 budgeting rule suggests splitting take-home pay how?',
    options: [
      '50% wants, 30% needs, 20% savings',
      '50% savings, 30% needs, 20% wants',
      '50% needs, 30% wants, 20% savings & debt payoff',
      '50% needs, 30% savings, 20% wants',
    ],
    correctIndex: 2,
    answerDetail:
      '50% to needs, 30% to wants, and 20% to savings and paying down debt is the classic split.',
    takeaway: 'A simple ratio beats no plan — adjust the split to fit your season of life.',
  },
  {
    prompt: 'How much do experts usually recommend keeping in an emergency fund?',
    options: ['One week of expenses', 'One month of expenses', '3–6 months of expenses', 'A year of income'],
    correctIndex: 2,
    answerDetail:
      'Three to six months of essential expenses is the common target — enough to absorb a job loss or surprise repair.',
    takeaway: 'An emergency fund turns a crisis into an inconvenience.',
  },
  {
    prompt: 'What is compound interest?',
    options: [
      'Interest charged only on late payments',
      'Interest earned on both your money and the interest it already earned',
      'A fixed fee banks charge every month',
      'Interest that only applies to loans',
    ],
    correctIndex: 1,
    answerDetail:
      'Compounding means your interest earns interest — growth on top of growth, in savings or against you in debt.',
    takeaway: 'Compounding rewards the patient and punishes the borrower — time is the secret ingredient.',
  },
  {
    prompt: 'A tithe is traditionally what share of your income?',
    options: ['A fifth (20%)', 'A tenth (10%)', 'A quarter (25%)', 'Whatever is left over'],
    correctIndex: 1,
    answerDetail:
      'A tithe is a tenth (Leviticus 27:30) — giving off the top, not from the leftovers.',
    takeaway: 'Giving first sets the tone for every other dollar.',
  },
  {
    prompt: 'Proverbs 22:7 says the borrower is ___ to the lender.',
    options: ['A friend', 'A partner', 'Servant', 'A customer'],
    correctIndex: 2,
    answerDetail:
      '“The rich rule over the poor. The borrower is servant to the lender.” (Proverbs 22:7)',
    takeaway: 'Every dollar of debt retired buys back a piece of freedom.',
  },
  {
    prompt: 'What does APR on a loan or credit card tell you?',
    options: [
      'The monthly minimum payment',
      'The yearly cost of borrowing, as a percentage',
      'The bank’s annual profit',
      'How long you have to repay',
    ],
    correctIndex: 1,
    answerDetail:
      'APR — annual percentage rate — is what a year of borrowing costs you, interest and certain fees included.',
    takeaway: 'Compare APRs, not monthly payments — that’s where the real cost hides.',
  },
  {
    prompt: 'To protect your credit score, experts suggest keeping credit-card balances below what share of your limit?',
    options: ['90%', '50%', '30%', 'It doesn’t matter if you pay on time'],
    correctIndex: 2,
    answerDetail:
      'Keeping utilization under ~30% of your limit (lower is better) helps your score, even when you pay in full.',
    takeaway: 'A high balance can ding your score even if you never miss a payment.',
  },
  {
    prompt: 'What does “pay yourself first” mean?',
    options: [
      'Spend on what you enjoy before bills',
      'Move money to savings before you spend on anything else',
      'Pay off your smallest debt first',
      'Take your salary in cash',
    ],
    correctIndex: 1,
    answerDetail:
      'It means routing money to savings the moment you’re paid — before spending gets a chance.',
    takeaway: 'What’s saved automatically never has to survive willpower.',
  },
  {
    prompt: 'Which habit helps a credit score the most?',
    options: [
      'Paying every bill on time',
      'Opening many cards at once',
      'Carrying a small balance each month',
      'Closing your oldest card',
    ],
    correctIndex: 0,
    answerDetail:
      'Payment history is the single biggest factor in a credit score — on-time payments, every time.',
    takeaway: 'Carrying a balance doesn’t help your score — it just costs you interest.',
  },
  {
    prompt: 'Which of these is a need rather than a want?',
    options: ['Streaming subscriptions', 'Rent', 'Eating out', 'A newer phone'],
    correctIndex: 1,
    answerDetail:
      'Needs keep life running — housing, groceries, utilities, transport to work. The rest is wants.',
    takeaway: 'Sorting needs from wants is the fastest way to find money you didn’t know you had.',
  },
  {
    prompt: 'The “debt snowball” method pays off debts in what order?',
    options: [
      'Highest interest rate first',
      'Largest balance first',
      'Smallest balance first, for quick wins',
      'Newest debt first',
    ],
    correctIndex: 2,
    answerDetail:
      'The snowball clears the smallest balances first — the quick wins build momentum to keep going.',
    takeaway: 'Math favors high-interest-first, but momentum is what actually finishes the race.',
  },
  {
    prompt: 'What is a budget, really?',
    options: [
      'A record of what you already spent',
      'A plan for your money before you spend it',
      'A limit your bank sets for you',
      'Something only for people in debt',
    ],
    correctIndex: 1,
    answerDetail:
      'A budget assigns every dollar a job ahead of time — it’s a plan, not a post-mortem.',
    takeaway: 'Tell your money where to go, or you’ll wonder where it went.',
  },
  {
    prompt: 'Which purchase typically loses value the fastest?',
    options: ['A house', 'A brand-new car', 'An index fund', 'A college course'],
    correctIndex: 1,
    answerDetail:
      'A new car can shed roughly 20% of its value in the first year — depreciation starts at the lot.',
    takeaway: 'Buying lightly used lets someone else pay the steepest part of depreciation.',
  },
  {
    prompt: 'Luke 16:10 — being faithful with little means what for money?',
    options: [
      'Small amounts don’t matter',
      'How you handle small amounts shows how you’d handle much',
      'Only large gifts count',
      'Money shouldn’t be tracked',
    ],
    correctIndex: 1,
    answerDetail:
      '“He who is faithful in a very little is faithful also in much.” (Luke 16:10) — stewardship starts small.',
    takeaway: 'Tracking the small dollars is practice for being trusted with bigger ones.',
  },
]
