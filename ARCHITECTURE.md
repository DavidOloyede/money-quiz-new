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
  looking at (Import, Dashboard, Quiz, or Settings). It also pops up the
  "Are you sure?" box when you clear data.
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
  Each row has a **★ star** to flag the charge as a **subscription** (remembered
  for every charge from that store), plus a "Subscriptions" filter to show only
  those.
- **`ApplyToSimilar.tsx`** — The little popup after you change a category. It
  offers to update the charges that share the **same amount and a similar name**
  (e.g. the $100 "Holiday Pines" dues, not the $45 ones), with a secondary
  option to update **all** charges from that merchant (handy for a power bill
  that varies every month).
- **`CategoryDetailModal.tsx`** — When you click a category, this window shows
  every transaction in it.
- **`GroupDetailModal.tsx`** — Click any recurring payment, subscription, or
  recurring transfer to open this: it lists the underlying charges, lets you
  **rename** the whole group, fix categories inline, and (for subscriptions) set
  whether it's **monthly or annual**, the **billing day** / **renewal date**, and
  an **ended date** if you've cancelled it.
- **`Dashboard.tsx`** — The charts-and-numbers screen.
- **`BudgetsCard.tsx`, `RecurringCard.tsx`, `SubscriptionsCard.tsx`,
  `RecurringTransfersCard.tsx`, `TrendsCard.tsx`, `TopMerchantsCard.tsx`** — The
  info boxes on the Dashboard (budgets, repeating bills, your subscriptions,
  recurring transfers, "spending went up/down", and favorite stores).
  - **`RecurringCard.tsx`** lists everything that repeats — fixed monthly
    payments (rent, student loan), subscriptions, and variable bills (power,
    water) **averaged** to a per-month number. Same-amount charges are marked
    "fixed". Tap a row to open its detail/rename; tap ★ to flag a subscription.
  - **`SubscriptionsCard.tsx`** is just the things you flagged as subscriptions,
    with each one's cadence / next-charge / ended date and a combined monthly
    total (ended ones are struck through and left out of the total).
  - **`RecurringTransfersCard.tsx`** surfaces same-amount, same-day Zelle/transfers
    (e.g. a monthly phone Zelle). They **count toward spending/income by
    default**; untick "Counts" for genuine account-to-account moves.
- **`charts/CategoryDonut.tsx`, `charts/MonthlyTrend.tsx`** — The actual pie
  chart and bar chart (drawn with a tool called Recharts).
- **`QuizView.tsx`** — The Quiz screen.
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
  "CHAMPION ENERGY SVC…" and "CHAMPION ENERGY SERVIC…" collapse together. It also
  exposes **alias-aware grouping** (`groupKey`/`groupLabel`/`displayDescription`):
  when you **rename** a merchant, every variant that maps to it folds under that
  one clean name — across the table, recurring list, and totals.
- **`importCsv.ts`** — Turns a spreadsheet into Transaction cards. It also
  **removes credit-card "payments"** so your spending isn't counted twice.
- **`analysis.ts`** — The **calculator**: totals, spending by category, monthly
  trends, repeating payments, budgets, and top stores. It normally **ignores**
  Transfers and Zelle, with one exception: `recurringTransfers` finds same-amount,
  same-day repeats (a monthly phone Zelle) and `recurringTransferIds` marks them
  to **count** toward totals (so `countsTowardTotals` returns true for them) —
  unless you opted that group out. Its time ranges are **This month / Last month
  / This year** (plus a custom window). `recurringPayments` groups charges by the
  alias-aware identity, leans on the **same amount** repeating to decide fixed vs.
  **averaged** variable bills, and folds in your flagged subscriptions;
  `subscriptions` returns just the flagged ones.
- **`quiz.ts`** — The **quiz maker**. It builds questions from your real numbers
  ("How much did you spend on Dining?"), including **faith-informed** ones on
  tithes/offerings and debt payments (with short scripture takeaways), plus the
  end-of-quiz insights.
- **`format.ts`** — Makes numbers and dates look nice ("$1,234.56", "Apr 3, 2026").
- **`plaid.ts`** — Talks to the Plaid helper server (start a connection, sync,
  disconnect).
- **`plaidMap.ts`** — Translates Plaid's data into our Transaction cards and maps
  Plaid's categories onto ours.
- **`exportData.ts`** — Builds the **download** files (CSV, JSON, and a printable
  report).

And **`src/data/sampleData.ts`** is a pretend set of ~60 transactions so you can
try the whole app without uploading anything.

---

## 7. The brain that remembers everything (`store.tsx` and `types.ts`)

- **`types.ts`** — The **shapes** of the data. A Transaction has a date,
  description, amount, and category, plus optional flags: `subscription` (you
  marked it), `counts` (a recurring transfer promoted into your totals).
  `SubscriptionMeta` holds a subscription's cadence, billing day, renewal, and
  ended dates.
- **`store.tsx`** — The **central brain**. It holds *all* the data and the
  remembered edits — keyed **per merchant** so they survive re-imports:
  - **category edits**, **subscription flags + details**, and **renames
    (aliases)**; renaming or flagging applies to every charge from that merchant.
  - **`ignoredTransfers`** — recurring transfers you opted out of counting.
  - It keeps the **raw** transactions and derives the live list, stamping
    `counts` onto recurring same-amount transfers (minus the opted-out ones).
  It exposes actions the screens use: import, change a category, flag/detail a
  subscription, rename a group, choose whether a transfer counts, set a budget,
  connect a bank, etc. Everything auto-saves to the notebook.

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
- **Subscription** — a charge you've ★-flagged as a recurring sign-up (Netflix,
  iCloud…), optionally monthly/annual with a billing day, renewal, or ended date.
  Shown in its own list and folded into Recurring payments.
- **Recurring payment** — anything that repeats monthly: subscriptions, fixed
  bills (rent, student loan), and variable bills (power, water) averaged per
  month.
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
