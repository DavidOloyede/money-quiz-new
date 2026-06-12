# How Money Quiz Works — Explained Simply

This guide explains how the whole app is built, as if you were in sixth grade.
No computer-science degree needed. 🙂

---

## 1. What is this app?

Money Quiz is a website that:

1. **Reads your bank transactions** (the list of stuff you bought).
2. **Sorts them into groups** like "Food", "Shopping", and "Rent".
3. **Draws charts** so you can see where your money goes.
4. **Gives you a quiz** about your own spending to help you learn.

Think of it like a **smart notebook** that reads your receipts, organizes them,
and then quizzes you like a friendly teacher.

---

## 2. The two big pieces

The app is made of **two programs**:

| Piece | What it is | Does it always run? |
|-------|------------|---------------------|
| **The website** (the part you see) | Runs *inside your web browser*, like a game on a website. | Always. |
| **The Plaid helper** (a tiny server) | A little program that talks to your bank through a company called Plaid. | Only if you want to connect a real bank. |

> 🔒 **Big idea:** If you just upload a spreadsheet (CSV) of your transactions,
> **everything stays on your own computer** — nothing is sent anywhere. The Plaid
> helper is the *only* part that talks to the internet, and only if you turn it on.

---

## 3. Where your data is kept

The app remembers your transactions in something called **`localStorage`**.

Imagine `localStorage` as a **notebook that lives inside your browser**. When you
close the tab and come back later, the notebook is still there. If you click
**"Clear all data,"** you rip all the pages out of the notebook.

Nobody else can read your notebook — it's only on your device.

---

## 4. The journey of one transaction 🧾

Here's the path a single purchase (say, "STARBUCKS #123 — $5.75") takes:

```
You add data (upload a CSV  OR  connect a bank with Plaid)
        │
        ▼
The app reads it and makes a neat "Transaction" card:
    { date, store name, amount, category }
        │
        ▼
A "sorter" guesses the category → "Dining"
        │
        ▼
The Transaction is saved in the notebook (localStorage)
        │
        ▼
The math helpers add it up → totals, charts, trends
        │
        ▼
You see it on the Dashboard, and the Quiz asks you about it
```

Every feature is just a different view of those little Transaction cards.

---

## 5. The screens you see (the `src/components` folder)

Each "screen" or button on the page is a **component** — a reusable Lego brick.

- **`App.tsx`** — The boss. It shows the menu and decides which screen you're
  looking at (Import, Dashboard, **Year Sheet**, Quiz, or Settings). The
  Dashboard and Year Sheet are loaded lazily so the chart library doesn't slow
  down the first page load. It also pops up the "Are you sure?" box when you
  clear data and the "Leave the quiz?" warning when you navigate away mid-quiz.
- **`Nav.tsx`** — The menu (on the side for computers, on top for phones). Also
  has the **light/dark mode** switch.
- **`ImportView.tsx`** — The **Import** screen, where you add data.
- **`ConnectBank.tsx`** — The "Connect a bank or card" card that uses Plaid.
- **`ColumnMapping.tsx`** — When you upload a spreadsheet, this asks "which
  column is the date? which is the amount?" because every bank's file looks
  different.
- **`ImportedFiles.tsx`** — The list of files and connected accounts you added,
  with **Sync** and **Delete** buttons.
- **`TransactionTable.tsx`** — The big list of all your transactions. You can
  search, filter, and **change a category**. You can also select many at once.
  Each row has a **★ star** for **recurring payments** — it lights up on its
  own when the charge belongs to a group already shown in the Recurring &
  subscriptions card, and you can tap it to flag a charge yourself. There's
  also a "Recurring" filter to show only those.
- **`ApplyToSimilar.tsx`** — The little popup after you change a category. It
  offers to update the charges that share the **same amount and a similar name**
  (e.g. the $100 "Holiday Pines" dues, not the $45 ones), with a secondary
  option to update **all** charges from that merchant (handy for a power bill
  that varies every month).
- **`RenameDescription.tsx`** — Inline rename for a transaction (a pencil next to
  the name in the modals). Renaming works like a category change: it's saved as a
  merchant alias and then offers to **rename the other similarly-named charges
  too**, which merges fragmented descriptors into one group.
- **`RecurringSimilar.tsx`** — The same idea for the ★ star: flag one charge as
  recurring and a little popup offers to **mark the merchant's other charges
  too**. Accepting flags the whole merchant, so future imports come in already
  starred.
- **`SortHeader.tsx`** — The shared **sortable column header** used by every
  table (transaction list, Dashboard category table, drill-in modals). It always
  reserves space for the ↑/↓ arrow so the columns never shift when you change
  the sort, and on right-aligned columns (Amount) the arrow sits to the *left*
  of the label so the numbers stay lined up.
- **`CategoryDetailModal.tsx`** — The shared **drill-in list**: it opens when you
  click a category, the Income/Spending stat cards, a **month on the trend
  chart** (showing that month's income *and* spending together), or a **Year
  Sheet cell**. Columns are **Date, Category, Amount, Description**, and each
  header sorts the list (Category only when the list actually mixes
  categories). Each row can be **recategorized**, **renamed**, or **★-flagged
  as recurring** (per charge — so a single Amazon charge can repeat).
- **`GroupDetailModal.tsx`** — Click any recurring payment, subscription, or
  recurring transfer to open this: it lists the underlying charges (each
  renamable / recategorizable / ★-flaggable as recurring), lets you **rename** the
  whole group, ★-**mark it recurring**, toggle **Show in recurring payments**
  (remove a false positive like "Amazon"), re-file it with **Treat as: Expected
  bill | Habit** (moves it between the Recurring and Spending-habits cards),
  **make it a subscription** (move it into the Subscriptions category), set the
  **charge day** for any recurring bill, and — for subscriptions — choose
  **monthly/annual**, the **renewal date**, and an **ended date**. The name,
  cadence, and charge date are staged and applied with a **Save** button.
- **`Dashboard.tsx`** — The charts-and-numbers screen. The **Income** and
  **Spending** stat cards are clickable and open the full list of transactions
  behind each number (transfers & Zelle excluded, same as the totals), and
  clicking a **month on the Monthly trend chart** opens that month's income and
  spending the same way.
  **Refunds & cashback** (money back from a store) are *not* income — they're
  subtracted from spending in their own category instead, and the Income card
  shows a small "+ $X refunds, counted against spending" note when there are any.
- **`YearSheetView.tsx`** — The **Year Sheet** screen: a spreadsheet-style grid
  (like a Google Sheets budget) with a column per month and sections for Income,
  Daily Living, Home, Transportation, Subscriptions & Entertainment, Giving, and
  Debt & Fees. Months that already happened show real numbers; future months show
  *projected* numbers in italics (your budget for that category if you set one,
  otherwise the average so far). An editable **starting balance** (saved per
  year) feeds the **Projected End Balance** row, and the **NET** row is green or
  red per month. The month header and the four summary rows **stay frozen**
  while you scroll, a second horizontal scrollbar sits above the sheet, and
  credit-card credits in spending categories are folded into one
  **Refunds & Cashback** income row. Every filled-in *actual* cell is
  **clickable** — it opens the drill-in list with exactly the transactions that
  cell summed (the totals rows, the frozen block, blanks, and projected cells
  aren't clickable, since there are no transactions behind them).
- **`ProgressWidget.tsx`** — Your **level, XP bar, daily streak 🔥, and badge
  count 🏅** (the full card in the sidebar, a tiny chip on phones).
- **`VerseOfDay.tsx`** — A daily **scripture banner** at the top of the
  Dashboard (one verse about money/stewardship per day, rotating at midnight).
- **`GivingCard.tsx`** — The **Giving & Generosity** box: tithes + charity for
  the selected period, what % of income that is (with a 10% tithe benchmark
  line), a **giving goal** you can set as a % of income, and a monthly trend.
- **`DebtCard.tsx`** — The **Debt freedom** box: recurring loan payments and
  their monthly trend, plus "possibly paid off?" detection when a loan goes
  quiet — confirm it to celebrate 🎉 (and earn the Debt Slayer badge).
- **`BadgesCard.tsx`** — The badge case on the Quiz screen: earned badges in
  color with their dates, locked ones grayed out with how to earn them.
- **`BudgetsCard.tsx`, `RecurringCard.tsx`, `RecurringTransfersCard.tsx`,
  `TrendsCard.tsx`, `TopMerchantsCard.tsx`** — The info boxes on the Dashboard
  (budgets, repeating bills + subscriptions, recurring transfers, "spending went
  up/down", and favorite stores).
  - **`RecurringCard.tsx`** is one **"Recurring & subscriptions"** box listing
    the **expected bills** that repeat — fixed monthly payments (rent, student
    loan), subscriptions, and variable bills (power, water) **averaged** to a
    per-month number. Same-amount charges are marked "fixed". Charges in the
    **Subscriptions category** get a **"sub"** badge and their billing cadence; a
    **Show: All | Subscriptions** toggle narrows to just those (with a
    subscriptions-only monthly subtotal, ended ones struck through and excluded).
    Tap a row to open its detail/rename. Every row's **★ is lit** — being in
    this list is what the star means — and un-tapping it removes the group from
    the list (and turns off its stars everywhere).
    Repeat *shopping habits* are kept out of this card on purpose (see below).
  - **`SpendingHabitsCard.tsx`** — the **"Spending habits"** box: merchants you
    keep going back to with *varying* amounts (Amazon, the pharmacy, a burger
    spot). They repeat, but they're **patterns, not bills**, so they live here
    instead of the recurring card. Tap a row to open its detail, where a
    **"Treat as: Expected bill | Habit"** toggle re-files it (remembered).
  - **`RecurringTransfersCard.tsx`** surfaces same-amount, same-day Zelle/transfers
    (e.g. a monthly phone Zelle). They **count toward spending/income by
    default**; untick "Counts" for genuine account-to-account moves.
- **`charts/CategoryDonut.tsx`, `charts/MonthlyTrend.tsx`** — The actual pie
  chart and bar chart (drawn with a tool called Recharts).
- **`QuizView.tsx`** — The Quiz screen. After you answer, most questions show
  **"the numbers behind this answer"** — the actual transactions (or recurring
  bills) the figure came from; trend questions show the two months side by
  side. Leaving mid-quiz pops a **"Leave the quiz?"** warning so progress isn't
  lost by accident.
- **`DailyQuestionCard.tsx`** — The **Question of the day** at the top of the
  Quiz screen: one question per day, same question all day, a new one at local
  midnight. With data it's personalized from *your* transactions; **with no data
  it asks a general money-literacy question** (so a brand-new user can start a
  streak before connecting anything). Answering earns XP — a little more when
  you're right — and the card shows your 🔥 streak.
- **`QuizHistory.tsx`** — Your past scores and your "day streak".
- **`SettingsView.tsx`** — Theme, custom categories, and the export/clear buttons.
- **`StatCard.tsx`, `EmptyState.tsx`, `icons.tsx`** — Tiny shared pieces (a
  number box, a "nothing here yet" message, and all the little drawings/icons).

---

## 6. The "thinking" helpers (the `src/lib` folder)

These files don't draw anything — they're the **brains** that do the math and the
sorting. Keeping them separate from the screens keeps the code tidy.

- **`storage.ts`** — Talks to the notebook (`localStorage`): save and load.
- **`parse.ts`** — Understands messy **dates** ("04/03/2026", "April 3") and
  **money** ("$1,234.56", "(45.00)") and turns them into clean numbers.
- **`categorize.ts`** — The **sorter**. It looks at the store name and guesses a
  category using keywords (e.g., the word "Starbucks" → Dining). It also gives
  **Zelle** and **Transfers** (money you move between your own accounts) their own
  groups so they don't look like real spending.
- **`categories.ts`** — The **list of bins** and their names, colors, and emojis.
  There's a rich built-in set — Groceries, Dining, Transport, Utilities,
  Rent/Mortgage, **Home & HOA**, **Insurance**, **Loans & Debt**, Shopping,
  **Personal Care**, Entertainment, Subscriptions, **Education**, Health,
  **Pets**, **Charity & Gifts**, **Tithes & Offerings**, **Fees & Taxes** — plus
  Zelle/Income/Transfers/Other. This is also what lets you **make your own
  categories** in Settings.
- **`merchant.ts`** — Cleans up ugly store names so "STARBUCKS #123 SEATTLE" and
  "STARBUCKS 8th AVE" are recognized as the **same store**. It strips bank noise
  (card masks, "null", "SVC/SERVICE", single-letter junk) so variants like
  "CHAMPION ENERGY SVC…" and "CHAMPION ENERGY SERVIC…" collapse together. Grouping
  (`groupKey`) is by the **display name** (alias if set, else the cleaned label),
  so renaming two different descriptors to the same name reliably merges them —
  even renaming one to match a label another already shows. `txSignature` gives a
  stable per-transaction id (date+desc+amount) used to remember per-charge flags.
- **`importCsv.ts`** — Turns a spreadsheet into Transaction cards. It also
  **removes credit-card "payments"** so your spending isn't counted twice.
- **`analysis.ts`** — The **calculator**: totals, spending by category, monthly
  trends, repeating payments, budgets, and top stores. It normally **ignores**
  Transfers and Zelle, with one exception: `recurringTransfers` finds same-amount,
  same-day repeats (a monthly phone Zelle) and `recurringTransferIds` marks them
  to **count** toward totals (so `countsTowardTotals` returns true for them) —
  unless you opted that group out. **Refunds** (a positive amount in a spending
  category — `isRefund`) are *not* income: they subtract from spending in their
  own category and month, so `totalIncome` is real income only (`isRealIncome`),
  `totalSpending` is net of refunds, and the net is unchanged. Its time ranges
  are **This month / Last month / This year** (plus a custom window).
  `recurringPayments` groups charges by the display-name identity, leans on the
  **same amount** repeating to decide fixed vs. **averaged** variable bills, and
  skips groups you've **removed** from the list. A charge qualifies as
  **recurring** when it's ★-flagged, sits in the **Subscriptions category**, or
  simply repeats; the **subscriptions** subset is just the recurring charges
  whose category is Subscriptions. Every recurring group is also filed as an
  expected **bill** or a spending **habit** (`kind`): ★-flagged, subscription,
  bill-like category (rent, utilities, insurance, loans, fees), or same-amount
  repeats are bills; a varying amount at a discretionary merchant is a habit.
  `recurringBills` / `spendingHabits` return each half, and the user's re-filings
  (`recurringKinds` in the store) override the guess. `autoRecurringBill`
  answers "would this group be in the recurring list even with no ★ flags?" —
  the store uses it when you un-star something the app detected on its own, so
  the group is also hidden from the list instead of lighting right back up.
- **`yearly.ts`** — Builds the **Year Sheet** numbers: per-category monthly
  actuals for a year, grouped into sections, plus **projections** for the months
  that haven't happened yet (budget if set, else the average of the months your
  data covers) and the running end-of-month balance.
- **`gamification.ts`** — The **points & streak brain**: opening the app on a
  new day checks you in (+XP, streak grows), quizzes, the daily question, and
  imports earn more XP, and XP adds up to **levels** with stewardship titles
  (Steward in Training → Good & Faithful Steward, after Luke 16:10). Your level
  survives "Clear all data" on purpose.
- **`dailyQuestion.ts`** — The **question-of-the-day maker**: builds one
  question per day (personalized from your data via the quiz maker, or a
  general literacy question from `data/generalQuestions.ts` when there's no
  data), saves it so reloads show the same question, and pays XP for answering
  (+bonus when correct). Rolls over at local midnight, like the verse.
- **`giving.ts`** — The **generosity calculator**: tithes + charity totals,
  giving as a % of income, per-month giving, and progress toward a giving goal.
- **`badges.ts`** — The **badge rules**: one-time achievements (First Steps,
  Cheerful Giver, First Fruits, Debt Slayer, streaks, perfect quiz) earned from
  real behavior. Giving earns badges, never XP — generosity isn't a points game.
- **`debt.ts`** — The **debt-freedom helper**: loan payments by month and a
  detector for recurring loans that go quiet (paid off?), measured against the
  newest data so a stale import doesn't cry wolf.
- **`quiz.ts`** — The **quiz maker**. It builds questions from your real numbers
  ("How much did you spend on Dining?"), including **faith-informed** ones on
  tithes/offerings and debt payments (with short scripture takeaways), plus the
  end-of-quiz insights. The income question counts **real income only** (refunds
  net against spending), the transaction-count question counts **expenses only**
  (how often money went *out*), and the recurring questions ask about
  **bills only** — repeat habits like Amazon runs are left out.
- **`format.ts`** — Makes numbers and dates look nice ("$1,234.56", "Apr 3, 2026").
- **`plaid.ts`** — Talks to the Plaid helper server (start a connection, sync,
  disconnect).
- **`plaidMap.ts`** — Translates Plaid's data into our Transaction cards and maps
  Plaid's categories onto ours.
- **`exportData.ts`** — Builds the **download** files (CSV, JSON, and a printable
  report).

And in **`src/data/`**: **`sampleData.ts`** is a pretend set of 68 transactions
(including a monthly church tithe and small donations, so the giving features
have something to show), **`verses.ts`** holds ~49 scripture verses about
money (World English Bible — public domain) with the verse-of-the-day picker,
and **`generalQuestions.ts`** is the bank of 15 general money-literacy
questions (budgeting rules, emergency funds, debt, a couple on stewardship)
behind the daily question when no data is connected.

The math helpers are covered by **unit tests** (`src/**/*.test.ts`, run with
`npm test` via Vitest), so future changes can't silently break the numbers.

---

## 7. The brain that remembers everything (`store.tsx` and `types.ts`)

- **`types.ts`** — The **shapes** of the data. A Transaction has a date,
  description, amount, and category, plus optional flags: `recurring` (you
  ★-marked it), `counts` (a recurring transfer promoted into your totals).
  `SubscriptionMeta` holds a subscription's cadence, billing day, renewal, and
  ended dates.
- **`store.tsx`** — The **central brain**. It holds the **raw** transactions plus
  the remembered edits, and derives the live list — stamping two flags that are
  never persisted on the rows: `recurring` (merchant ★-flagged, this exact
  charge flagged, **or** the charge belongs to a group already shown in the
  Recurring & subscriptions card — so detected bills are starred without you
  lifting a finger) and `counts` (recurring same-amount transfers, minus
  opted-out groups). Un-starring something the app detected on its own also
  hides that group from the recurring list (otherwise the star would relight
  immediately). The remembered edits:
  - **category edits** — remembered at **two levels**: by the exact (normalized)
    description when you fix one transaction, and by merchant when you say
    "apply to all charges from this store". Both are re-applied on re-import,
    exact-description first.
  - **renames (aliases)** — per merchant, survive re-imports.
  - **recurring flags** — a per-merchant flag (whole-merchant repeats like Rent)
    **and** `recurringTxns`, a per-charge flag by signature (one Amazon charge that
    repeats). *(Subscriptions are instead identified by the Subscriptions
    category.)*
  - **`groupMeta`** — cadence / charge day / renewal / ended for any group.
  - **`ignoredTransfers`** — recurring transfers you opted out of counting.
  - **`dismissedRecurring`** — groups removed from the Recurring payments list.
  - **`recurringKinds`** — your bill ⇄ habit re-filings ("Treat as" in the
    group detail), overriding the automatic guess.
  It exposes the actions the screens use (import, recategorize, rename, flag a
  charge recurring per-charge or per-group, set a charge/renewal date,
  include/exclude a transfer or recurring group, budget, connect a bank, …) and
  auto-saves everything to the notebook.

Every screen "plugs into" the store to read data and to make changes, so
everything stays in sync. Change a category in one place and the charts update
everywhere.

---

## 8. The Plaid helper server (`server/plaidServer.mjs`)

Banks won't let a website talk to them directly with a secret password — that
would be unsafe. So there's a **tiny separate program** that holds the secret and
does the bank-talking. The website asks *it*, and it asks Plaid.

- If you **don't** give it Plaid keys, it runs in **"pretend" (mock) mode** and
  serves fake-but-realistic transactions, so you can try the whole "connect a
  bank" flow for free.
- If you **do** add real Plaid keys, it talks to real banks.

It keeps your bank "access token" in a hidden file on your own computer
(`server/.data/`), which is never shared or uploaded to GitHub.

---

## 9. The tools the project is built with

- **React** — the toolkit for building the screens out of Lego-brick components.
- **TypeScript** — JavaScript with "fill-in-the-blank" rules (types) that catch
  mistakes before they happen.
- **Vite** — the tool that runs the app while you build it and packages it for the
  web.
- **Tailwind CSS** — the styling shortcuts (colors, spacing) that make it look
  nice, including dark mode.
- **Recharts** — draws the pie and bar charts.
- **PapaParse** — reads spreadsheet (CSV) files.

---

## 10. Quick glossary

- **Component** — a reusable piece of the screen (a button, a card, a chart).
- **localStorage** — the browser's private notebook that remembers your data.
- **Transaction** — one purchase or deposit (date, store, amount, category).
- **Category** — a bin like Groceries or Dining.
- **Subscription** — a charge in the **Subscriptions category** (Apple, iCloud,
  GitHub…), optionally monthly/annual with a billing day, renewal, or ended date.
  Badged and folded into the Recurring & subscriptions list.
- **Recurring payment** — anything that repeats monthly: ★-flagged charges,
  subscriptions, fixed bills (rent, student loan), and variable bills (power,
  water) averaged per month. The **★ star** means "this charge is in the
  Recurring & subscriptions list" — it lights up automatically for detected
  bills, and tapping it flags (or unflags) a charge yourself.
- **Bill vs. habit** — every recurring group is filed one of two ways. A
  **bill** is expected (rent, the power bill, a subscription — owed even when
  the amount varies). A **habit** is a repeat *pattern* with varying amounts at
  a discretionary store (Amazon, the pharmacy). Bills show in the Recurring
  card; habits in the Spending habits card; "Treat as" re-files either way.
- **Refund / cashback** — money back in a spending category. Not income: it
  subtracts from that category's spending in the month it lands.
- **Alias / rename** — a clean display name you give a merchant; every messy
  variant folds under it, in display and in grouping.
- **Recurring transfer** — a same-amount, same-day Zelle/transfer that's really a
  monthly bill; counted toward your totals (unless you opt it out).
- **Source** — one thing you added (an uploaded file or a connected bank).
- **Transfer / Zelle** — money moved between your own accounts; not counted as
  spending — unless it's a recurring same-amount bill (see above).
- **Plaid** — the company that securely connects apps to real banks.
- **Mock mode** — the "pretend" mode that uses fake data so you can try things
  for free.

---

### The one-sentence version

> The **website** turns your transactions into neat cards, the **brain
> (`store`)** remembers them in your browser's **notebook**, the **lib helpers**
> do all the math and sorting, the **components** draw the screens, and an
> **optional tiny server** safely connects to real banks through Plaid.
