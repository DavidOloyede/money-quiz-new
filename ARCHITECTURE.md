# How Manna Money Works — Explained Simply

*Last verified against the working tree: 2026-09-22 (commit `f945b3b`); Import column-matching screen updated 2026-09-24; web addresses, celebrations, sound and the illustrated people added 2026-10-03; the streak moment added and the illustrated people taken out (to be redrawn) 2026-10-06; Omer the mascot, the drawn streak flame and the names above the sign-in boxes added 2026-10-07; Omer's own moves and the paid-off party added later that day.*

This guide explains how the whole app is built, as if you were in sixth grade.
No computer-science degree needed. 🙂

*(Manna Money used to be called "Money Quiz." The name on the screen changed;
the machinery below — package names, saved-data keys — deliberately kept the
old name so nobody's data gets lost.)*

---

## 1. What is this app?

Manna Money is a website that:

1. **Reads your bank transactions** (the list of stuff you bought).
2. **Sorts them into groups** like "Food", "Shopping", and "Rent".
3. **Draws charts** so you can see where your money goes.
4. **Gives you a quiz** about your own spending to help you learn.

Think of it like a **smart notebook** that reads your receipts, organizes them,
and then quizzes you like a friendly teacher.

---

## 2. The big pieces

The app is **a React/TypeScript frontend + a Node.js backend + a PostgreSQL
database**, plus a sign-in helper:

| Piece | What it is | Does it always run? |
|-------|------------|---------------------|
| **The website** (the part you see) | The React app, running *inside your web browser*. | Always. |
| **The Node.js backend** (`server/`, Fastify) | The API the website talks to for everything online: cross-device sync, the bank connector, support tickets, the admin panel, and activity logging. It owns the database. | Only when accounts are turned on. |
| **PostgreSQL** | The database the Node server reads and writes. | With the backend. |
| **Supabase Auth** | A sign-in service (Google + email/password + password-reset emails). It only checks *who you are* and hands the browser a signed token; it never sees your money data. | With the backend. |

> 🔒 **Big idea:** Signed out, **everything stays on your own computer** —
> nothing is sent anywhere. Signing in turns on the backend, and then the Node
> server checks *who you are* on every single request (using the signed token
> from Supabase) and only ever hands back your own data.

### Where the code lives (since July 2026)

The project is getting a phone app, so the code that both apps share was
moved into its own package — think of it as **taking the engine out of the
car so a second car can use the same engine**:

- **`packages/core`** (called `@moneyquiz/core`) — the shared engine: the
  central brain (`store.tsx`), the data shapes (`types.ts`), all the math
  and sorting helpers (`lib/`), and the sample data, verses, and question
  bank (`data/`). Nothing in here may touch browser-only features — that's
  what keeps it runnable on a phone. The shared design tokens (the exact
  colors and fonts) live here too, in `theme.ts`.
- **`src/`** — everything that is web-only: the screens
  (`components/`), sign-in wiring (`auth.tsx`), and seven small helpers that
  genuinely need a browser (`src/lib/`: the Supabase sign-in client, the
  activity logger, file downloads, Plaid's pop-up, the startup wiring, the
  map of web addresses, and the sound player).
  The web's stylesheet tokens (`src/theme.css`) are **generated** from
  `packages/core/theme.ts` by `npm run gen:theme` — change colors there, not
  in the CSS.
- **`apps/mobile`** — the iPhone app (built July 2026; not yet in the App
  Store). It's the second car using the same engine: all the money math, the
  central brain, and the colors/fonts come from `packages/core`; this folder
  is just the phone's body around them. On the phone the "notebook" isn't the
  browser's `localStorage` — it's a phone-native notebook called **MMKV** that
  the shared brain plugs into. Same pages, same page names, so cloud sync
  works between the website and the phone. You can **sign into your account
  on the phone** (email + password, or Google) — same login service, same
  account as the website — and **your data follows you**: edit a budget on
  the laptop, tap "Sync now" on the phone (or just reopen the app) and the
  change is there, and the other way around too. Signing out on the phone
  clears its local copy, exactly like the website.

  The phone app has five tabs along the bottom:

  - **Today** — the daily rhythm in one place: the verse of the day, the
    question of the day (personalized once you have data, a general money
    question before that — with the transactions behind the answer, same as
    the quiz), and your level/streak/badge progress. A new verse
    and question arrive at midnight, and answering the question of the day
    is what counts the day toward your streak.
  - **Quiz** — the same quiz as the website, built from your own
    transactions, with the "receipts" behind every answer and the insights
    at the end.
  - **Dashboard** — the phone-sized read on your money, with the same cards
    as the website: income/spending/net, spending by category (tap one to
    see its transactions), a monthly trend chart, **Top merchants** with
    company logos ("View all" opens every merchant plus your spending
    habits), **Recurring & subscriptions** on a month calendar, budgets,
    giving, **Debt freedom**, **Trends**, and **Transfers & Zelle**. Two
    buttons near the top open **All transactions** (search by name, or type
    an amount like "118"; filter by category or ★) and the **Year Sheet**
    (one month at a time: swipe through the year with the arrows or the
    little bars, with the months ahead shown as estimates).

    Since September 2026 the phone can also make the **everyday changes**:
    tap any charge to star it as recurring, rename it, or move it to another
    category (it changes just that charge, then offers the similar ones,
    which you can look over and untick first, same as the website); tap a
    budget to change or remove it, or add one; set a giving goal; and
    confirm a paid-off debt. The bigger tools stay on the website, where
    there's room: deciding what each transfer was, linking a refund to its
    charge, changing many rows at once, and category rules.
  - **Welcome** — someone who opens the app signed out with no data first
    sees one calm welcome screen (the phone's short version of the website's
    landing page): Omer waving hello, what Manna Money does, three steps,
    and the ways in: create an account, try the sample data, connect a
    bank, or look around first.
  - **Import** — connect a bank or card through Plaid, right on the phone
    (same rules: your bank login happens inside Plaid's own screen; the app
    never sees it; connecting a bank needs you signed in), or **upload a CSV**
    your bank gave you: pick it from the Files app, tell the app which
    column is the date, the description and the amount (it guesses first and
    shows a preview), and it's added. That works signed out too, and the
    file never leaves the phone. The website reads CSVs with the very same
    code, so a file imports the same way in both places.
  - **Settings** — your account (sign in / sync / sign out), light or dark
    look, the **daily reminder**, data controls, and Help & support tickets
    (same tickets as the website — replies appear in both places).

  The **daily reminder** is the phone's special power: pick a time and iOS
  itself taps you on the shoulder ("Your daily bread is ready 🍞") even if
  the app is closed. It's a *local* alarm the app sets on your phone — no
  message is sent from any server, so it works with zero setup and nothing
  about your money ever leaves the device for it.

  The phone has **the same fun moments as the website** (October 2026): the
  right answer pops with a chime and a little "you got it" buzz in your hand,
  "not quite" shakes gently with a soft tone, finishing a quiz counts up
  around a ring with confetti, going up a level (or earning a badge) fills
  the screen with the same sunburst, jumping Omer, flipping title and row of
  cheering sparkles, and answering the question of the day lights the same
  streak flame as the website (see `StreakOverlay` below), and confirming a
  loan paid off throws the same flying-hero "PAID OFF!" party, with a heavy
  buzz. Omer, the mascot, turns up at exactly the same moments, in the same
  outfits and with the same moves, as on the website (see `Omer.tsx`
  below). The sounds are the very same
  files as the website's. They stay quiet when the phone's silent switch is
  on, they play *alongside* your music instead of stopping it, and Settings
  has a **Sounds** switch.

  (One fix along the way: the fonts on the phone had all been drawn at a
  single weight. Every bold and semi-bold font file carried the same inner
  name, and iPhones tell fonts apart by that name, so they all looked like
  one. Each file now has its own name, and headings and buttons are bold
  again.)
- **`server/`** — the Node.js backend, unchanged.

---

## 3. Where your data is kept

The app remembers your transactions in something called **`localStorage`**.

Imagine `localStorage` as a **notebook that lives inside your browser**. When you
close the tab and come back later, the notebook is still there. If you click
**"Clear all data,"** you rip all the pages out of the notebook.

Signed out, nobody else can read your notebook — it's only on your device.

**Signed in**, every page of the notebook is also photocopied to the Node
server, which stores it in your account (a table called `user_slices`, one row
per notebook page) a couple of seconds after you change something. Sign in on
your phone and the same notebook appears. Sign out on a shared computer and the
local copy is wiped — your account still has it. Even the app's admin can't
read those pages: the server has no route that hands anyone else's
`user_slices` back, so only *you* ever see them.

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
    (using the store name AND whether money came in or went out)
        │
        ▼
If your bank put its own label on the row, that's the backup answer —
our guess wins when we recognize the store, because bank labels are
often wrong (one bank files a software subscription under "Restaurants")
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
  If you're **signed out and have no data yet**, it shows the welcome page
  (below) instead of the menu.

  **Every screen has its own web address** (since October 2026), like rooms
  in a house each with their own door: `/dashboard`, `/year` (the Year
  Sheet), `/quiz`, `/import`, `/settings`, `/account` (plus `/signin` and
  `/signup`, which open the Account screen ready to sign in or sign up), and
  `/admin`. The welcome page lives at `/`. So you can bookmark a screen, send
  someone a link, open one in a new tab, and the browser's Back and Forward
  buttons work. The tab's title names the screen ("Quiz · Manna Money").
  A few things are deliberate:

  - **New visitors meet the welcome page first.** Someone with no data and no
    account who opens, say, `/quiz` is taken to `/` instead. The only doors
    straight in are the ones the welcome page itself points to: `/import`,
    `/signin` and `/signup`. Once they've stepped in, they can move around
    freely for that visit.
  - **`/` is always the welcome page**, for everyone: signed in or not, with
    data or without. It adjusts its buttons to who's looking. Signed in, it
    leaves off "Sign in" and "Create a free account". With data, "Try it
    with sample data" becomes **"Go to my dashboard"** (loading the sample
    would replace your own year).
  - **The Manna Money name and logo** at the top of every screen are a link
    to `/`, so they always lead back to the welcome page.
  - **Signing in with Google** brings you back to the Account screen (the
    same place signing in with email leaves you), not to `/`.
  - Other spellings work too (`/year-sheet`, `/login`, `/Quiz/`) and get
    tidied to the one proper address.
  - An address that doesn't exist shows a friendly **"This page wandered
    off"** page (`NotFound.tsx`) with a button home.
  - "Leave the quiz?" also catches the browser's Back button.

  The map of addresses is `src/lib/routes.ts`. There's no extra routing
  library; the browser's own history does the work. The server already sends
  the app for any address that isn't part of the API, so every address loads.

  Each screen settles in with a short fade as it arrives, and every popup
  fades and settles in too. All of that switches off if your device asks for
  less motion. The fades let go once they finish, on purpose: if a screen
  held on to its fade, every popup opened from it would get stuck partway
  down the page instead of appearing over whatever you're looking at.
- **`landing/`** — The **welcome page** that lives at `/` (built for a first-time visitor, though everyone lands there). It's four
  parts stacked top to bottom: the opening ("Enough for today. A plan for
  tomorrow." beside a phone showing a right quiz answer), **how it works**,
  **why "Manna"** (the story behind the name, plus room to give and keeping
  your data safe), then a closing celebration, and last a short list of
  questions and answers. "How it works" starts with three small picture tiles:
  connect your bank, see your categories, and plan your whole year on the
  Year Sheet. Each tile plays a tiny animation when you point at it (on a
  phone, when you tap it or scroll it into view): the bank links, a
  category opens to show its purchases, and the Year Sheet's numbers ripple
  in from the top-right corner before the "Net" row glows. Below the tiles
  come three rows. First the question of the day (with the streak it
  grows). Then **every subscription, every habit**: not just subscriptions,
  but bills whose amount changes (like the electric bill) and habits (like a
  weekly Chick-fil-A run). A "Recurring" card shows what they cost a month and what's
  due next, circled by the logos of things people pay for again and again
  (Netflix, Hulu, Chick-fil-A, AT&T, Walmart+, DoorDash, HBO, Uber, a gym and more).
  The logos drift in and settle around the card, then the ring turns very
  slowly, always the same way. Pointing at a logo makes it grow (the ring
  keeps turning) until you move away. Walmart+ is drawn as its
  name on its brand colour, because we don't carry its logo. Last come
  simple budgets, whose bars stay green while you're under. The
  same two buttons open and close the page: **Create a free account** (the
  main one) and **Try it with sample data**. The first opens the Account
  screen already set to sign-up; the second loads the sample year and jumps
  to the Dashboard. There's also a small "import your own CSV" link, a Sign
  in link, and a little sun-and-moon switch at the top for light or dark
  mode (the same setting the app uses). The other animations (the quiz
  answer popping green, the confetti) wait until they're fully on your
  screen, play quickly (most finish in about a second), play again every time you scroll back to them, and stay still
  if your device asks for less motion. The closing phone starts at zero (0
  out of 5, nothing around it) and builds up to the finished celebration, so
  you never catch it half done. In "why Manna", the manna keeps falling into
  its bowl for as long as it's on your screen, and in "safe, and yours" the
  lock glows softly while little knocks from outside bounce off a barrier
  around it and your numbers keep flowing between the account and each
  device. At the top, manna falls from morning
  clouds into Omer, the mascot (a smiling honey-gold bowl on two little
  legs); at the bottom it falls into him again while he cheers in front of
  the celebrating phone.
  (Until October 6, 2026 there was also a "Small wins, every morning" row of
  illustrated people. It's been taken out while the people are redrawn with
  better art and motion; the old drawings are still in the project's
  history.)
- **`Nav.tsx`** — The menu (on the side for computers, on top for phones). Also
  has the **light/dark mode** switch.
- **`ImportView.tsx`** — The **Import** screen, where you add data.
- **`ConnectBank.tsx`** — The "Connect a bank or card" card that uses Plaid.
  It always has a **Try a demo bank** button too, which works even signed
  out with no server at all.
- **`DemoBankModal.tsx`** — The **demo bank connection**: a pretend version
  of linking a bank, for showing the app to someone (or trying it without
  real accounts). It walks through the same steps as the real thing: pick
  your bank (Chase, Bank of America, Citi, American Express, Capital One,
  Ally), "sign in" with details already filled in, choose which accounts to
  share, wait a moment while it "connects", and land on "Chase is
  connected — added 287 transactions". Nothing is sent anywhere. Behind the
  curtain each pretend account is really just a spreadsheet file written in
  that bank's own layout, read by the exact same code a CSV upload uses, so
  the demo shows what the app really does with that bank's data. The
  connected accounts are labeled **Demo connection** in the sources list;
  **Sync** rebuilds them for today and the trash can removes them like any
  other source. Two extra buttons: **Use my own {bank} CSV** feeds a file
  you exported into the same pretend connection (handy for demoing with real
  numbers without putting them anywhere), and **Download these as CSV** saves
  the pretend bank's files so you can show the ordinary upload route too.
- **`ColumnMapping.tsx`** — When you upload a spreadsheet, this asks "which
  column is the date? which is the amount?" because every bank's file looks
  different. When it **recognises the bank's layout** (Chase, Ally, Bank of
  America, Citi, American Express, Capital One, Discover), it fills
  everything in for you and says so, including the easy-to-miss bits, like
  American Express and Discover writing purchases as positive numbers.
  A mapping you saved yourself still wins.

  It's laid out as three numbered questions, like a short form. **1. Where is
  this file from?** (a checking/savings account or a credit card, each with
  a one-line example). **2. Which column is which?** It shows the first
  three rows of your actual file with a little tag over each column saying
  what it's being used for (Date, Description, Amount, or "Not used"), and
  under every picker it shows what that column holds in your first row, so
  you can see you picked the right one. **3. Does this look right?** A
  preview of how those rows will look in the app, with each amount marked
  "in" or "out". The screen says **"money out / money in"** instead of
  "debit / credit" on purpose: "credit" already means a credit card one
  question earlier, and people read the two as the same thing.
- **`ImportedFiles.tsx`** — The list of files and connected accounts you added,
  with **Sync** and **Delete** buttons.
- **`TransactionTable.tsx`** — The big list of all your transactions. You can
  search, filter, and **change a category**. You can also select many at once
  and, from the bar that appears, **set a category**, **mark reimbursement /
  internal / normal**, or **rename them** to a label of your choosing — e.g.
  select just the $9.99 Apple charges and call them "iCloud", leaving the
  $10.99 ones alone to become "Apple Music" separately. Like the pencil-icon
  rename below, a bulk rename is pinned to those *exact* charges, not the
  whole merchant, so different amounts from the same merchant can carry
  different names. Each row has a **★ star** for **recurring payments** — it
  lights up on its own when the charge belongs to a group already shown in
  the Recurring & subscriptions card, and you can tap it to flag a charge
  yourself. There's also a "Recurring" filter to show only those.
- **`ApplyToSimilar.tsx`** — The little popup after you change a category. It
  offers to update the charges that share the **same amount and a similar name**
  (e.g. the $100 "Holiday Pines" dues, not the $45 ones), with a secondary
  option to update **all** charges from that merchant (handy for a power bill
  that varies every month).
- **`RenameDescription.tsx`** — Inline rename for a transaction (a pencil next to
  the name in the modals). Renaming works like a category change: only the charge
  you edited changes at first. Then a popup offers the **other charges at the
  same amount** from that merchant (the other $9.99 Apple charges), with a
  second option for **every charge sharing the name** at any amount (the $6.48
  ones too). Tap either to see the exact list, all ticked, and untick any that
  don't belong before renaming. Nothing else is renamed until you say so,
  because one "Apple" on a statement is often several different subscriptions.
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
  when the sheet is too wide but short enough that there's nothing left to
  scroll down to, spinning the mouse wheel over it slides it sideways instead
  (the same is true of the transaction table). Credit-card credits in spending
  categories are folded into one
  **Refunds & Cashback** income row. Every filled-in *actual* cell is
  **clickable** — it opens the drill-in list with exactly the transactions that
  cell summed (the totals rows, the frozen block, blanks, and projected cells
  aren't clickable, since there are no transactions behind them).
- **`ProgressWidget.tsx`** — Your **level, XP bar, daily streak (with its little drawn flame), and badge
  count 🏅** (the full card in the sidebar, a tiny chip on phones). It
  answers every point you earn, wherever you earned it: the bar slides
  forward with a little bounce, a small "+15 XP" floats up from it, the level
  circle pops when you go up a level, and the flame flickers when your streak
  grows. The flame stays grey until you've answered something today, so you
  can tell at a glance whether today has counted yet.
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
  up/down", and where the money went, by merchant).
  - **`RecurringCard.tsx`** is the full-width **"Recurring & subscriptions"** box,
    laid out as a **month calendar**: a grid marks the days a charge lands — each
    shows that **day's total** (e.g. `$55`, or `5 · $178` when several share a
    day), and today is ringed — and beside it the
    next few **upcoming charges** are listed (capped at four — "Show all N" opens
    a **popup**, and clicking a calendar day opens that day's charges in the same
    popup, so the card never reflows). The calendar shows the **expected bills**
    that repeat — fixed monthly payments (rent, student loan), subscriptions, and
    variable bills (power, water) **averaged** to a per-month number; the charge
    day comes from the user's billing day or, failing that, the day the group
    usually lands on (`chargesInMonth` / `upcomingCharges`). Below the calendar a
    **full list** of every recurring group remains: same-amount charges are marked
    "fixed", **Subscriptions-category** rows get a **"sub"** badge and their billing
    cadence, and a **Show: All | Subscriptions** toggle narrows to just those (with
    a subscriptions-only subtotal, ended ones struck through and excluded). Tap any
    row — calendar charge or list — to open its detail/rename. Every list row's
    **★ is lit** (being in this list is what the star means); un-tapping it removes
    the group from the list (and turns off its stars everywhere).
    Repeat *shopping habits* are kept out of this card on purpose (see below).
  - **`TopMerchantsCard.tsx`** — the **"Top merchants"** box, next to the
    monthly chart: the six merchants you spent the most with in the chosen
    date range, each with its company logo (or its category's little picture),
    a bar for scale, and how many charges it took. Refunds come off the
    merchant they came back from. Tap a merchant to see its charges. **"View
    all"** opens **`AllMerchantsModal.tsx`**, a popup with two tabs:
    - **Merchants** — every merchant in the range, with a search box and a
      "Most spent / Most visits" switch. Tap one for its charges.
    - **Spending habits** — places you keep going back to with *varying*
      amounts (Amazon, the pharmacy, a burger spot). They repeat, but they're
      **patterns, not bills**, so they live here instead of the recurring
      card. Tap one to open its detail, where a **"Treat as: Expected bill |
      Habit"** toggle re-files it (remembered).
    This one box replaced three older ones ("Where the most went", the old
    Top merchants list, and a separate Spending habits box), which all
    answered the same question: where does my money go?
  - **`RecurringTransfersCard.tsx`** surfaces same-amount, same-day Zelle/transfers
    (e.g. a monthly phone Zelle). They **count toward spending/income by
    default**; untick "Counts" for genuine account-to-account moves.
- **`charts/CategoryDonut.tsx`, `charts/MonthlyTrend.tsx`** — The actual pie
  chart and bar chart (drawn with a tool called Recharts).
- **`QuizView.tsx`** — The Quiz screen. After you answer, every question shows
  **"the numbers behind this answer"** — the actual transactions (or recurring
  bills) the figure came from; trend questions show the two months side by
  side. Leaving mid-quiz pops a **"Leave the quiz?"** warning so progress isn't
  lost by accident.

  It's also where most of the **fun moments** happen. Pick the right answer
  and it pops green, a check mark springs in, a few manna flakes burst out,
  "+10 XP" floats up, and a bright little chime plays. Pick a wrong one and
  it gives a gentle shake with a soft coral outline and a soft low tone (never
  a buzzer), while the right answer lights up beside it. Get three or more in
  a row and a little flame with "3 in a row!" appears. Finishing counts your score up around
  a ring that fills in; at half right or better, confetti bursts out and a
  short fanfare plays, and below half it's a gentler "drop" sound and a kind
  word instead of a party. A perfect score gets a "PERFECT!" stamp. Going
  back to review your answers stays calm: the moments only play the first
  time. Keyboard users can press 1–4 to answer and Enter to move on. A
  speaker button beside the title turns the sounds on or off.

  Omer is part of it too: dressed as a detective (deerstalker hat and
  magnifying glass) on the start screen, cheering or saying "oops" beside
  the **Next question** button after each answer (kept away from the
  answer's explanation, which has dollar amounts in it), and in a
  graduation cap beside your score at the end. With no data yet, he waves
  on the "waiting for data" screen.
- **`AnswerChoice.tsx`** — One answer button, shared by the quiz and the
  question of the day so both play exactly the same right-answer and
  not-quite moments.
- **`celebrate/`** — The pieces that make the moments: `Confetti.tsx`
  (confetti in the app's five colors), `RewardBurst.tsx` (the manna flakes
  and floating "+XP"), the **streak moment** (`StreakOverlay.tsx`), and the
  **big one**, `MilestoneOverlay.tsx`, and the **paid-off party**
  (`PaidOffOverlay.tsx`), all shown by `CelebrationHost.tsx`.
  - **The streak moment** plays when you answer the question of the day,
    right or wrong. (Quiz questions don't count toward the streak; the
    question of the day is the one daily habit.) A flame lights up and flickers while little
    embers float off it, the day count flips from yesterday's number to
    today's, the streak's points pop in, and a track shows how far you are
    from the next goal: seven little circles on the way to your first week
    (and again from one week to two), then a bar on the way to a month, two
    months, 100 days, six months and a year, with a soft "drop" sound. It
    never disappears without warning: you close it with **Keep going** (or
    a tap anywhere), and on an ordinary day a thin bar under the button
    slowly empties over ten seconds and the screen closes when it runs out.
    The day you *reach* a goal it's a bigger party ("ONE WEEK!" in a comic
    starburst, a sunburst, confetti, the sparkle sound, and Omer as a coach
    lifting his barbell beside the flame) and it simply waits for you. If your device asks for less motion there's no countdown, so
    it always waits.
  - **Going up a level** turns the whole screen to morning light: a slow
    sunburst turns, Omer jumps and glows while manna falls into him (in a
    hard hat when you reach level 5, Wise Builder, and flying in a green
    cape from level 8, Trusted Steward), "LEVEL UP!" lands in a comic
    starburst, your level number flips from the old one to the new one,
    your new title flips in with a shine, a row of colorful sparkles hops
    in a wave, and confetti falls, with a sparkle sound. **Earning a badge**
    gets the same party, with the badge spinning in like a medal and Omer
    beside it, dressed for that badge (a coach for the streak badges, a
    gardener for the giving ones, a hero in a cape for Debt Slayer…) or
    standing proud with a ribbon when several badges arrive at once.
  - **Confirming a loan is paid off** throws the biggest party of all, the
    one time a money moment celebrates (because you confirmed it yourself):
    Omer as the hero swoops in with a loop-the-loop and flies through a
    dawn sky while clouds, wind and bits of manna stream past, "PAID OFF!"
    lands in a comic starburst, confetti bursts out of it and a fanfare
    plays. The first time also earns the Debt Slayer badge, which shows up
    inside this party rather than as a second one straight after.

  Each one shows up wherever you earned it (the quiz, the question of the
  day, or an import), waits a moment so the thing that earned it finishes
  first, and a tap anywhere (or Esc) closes it. If one thing earns several
  (the day's streak points can tip you into a new level), they come one
  after another, streak first. They never celebrate progress you already
  had, like when your account's data loads.
- **`SoundToggle.tsx`** — The quiz's speaker button.
- **`QuizEvidence.tsx`** — That "numbers behind this answer" list itself. It's
  its own piece so the quiz and the question of the day show the same receipts
  — no answer anywhere in the app gives you a figure you can't check.
- **`DailyQuestionCard.tsx`** — The **Question of the day** at the top of the
  Quiz screen: one question per day, same question all day, a new one at local
  midnight. With data it's personalized from *your* transactions; **with no data
  it asks a general money-literacy question** (so a brand-new user can start a
  streak before connecting anything). Answering earns XP — a little more when
  you're right — counts today toward your streak (it's the only thing that
  does), and the card shows your streak with its little drawn flame (grey
  until today has counted). Answering plays the same moment as
  the quiz (the pop or the shake, the chime or the soft tone, and the flame
  lights). Once you've answered, it
  lists the transactions behind the figure, just like the quiz does (the
  general questions have no transactions behind them, so they show none).
  At the bottom, beside "Come back tomorrow", Omer naps in a nightcap: you're
  done for today.
- **`QuizHistory.tsx`** — Your past scores and your day streak (the same
  streak as everywhere else).
- **`SettingsView.tsx`** — Theme, the **Sounds** switch (on by default; it
  plays a chime as it turns on so you know what you're getting), custom
  categories, the export/clear buttons, and the **Help & support** card.
  Sounds only ever play at the game moments, never on your money screens,
  stay quiet if your device asks for less motion, and the setting is kept
  per device (a laptop and a phone can differ).
- **`AccountView.tsx`** — The **Account** screen: sign in / create an account
  (email + password, or "Continue with Google"), see your profile, **Sync now**,
  and sign out. Only appears when the cloud backend is configured. Each box
  has its name written above it ("Email", "Password"), so you still know
  which box is which once you start typing.
- **`SyncGate.tsx`** — The invisible doorman between signing in and your data.
  When you sign in it fetches your account's copy, asks the right question
  ("Save this device's data to your account?" or "Use your account's data?"),
  and reloads the notebook. When you sign out on a shared computer it clears
  the local copy. The phone has the same doorman
  (`apps/mobile/src/lib/sync.tsx`) asking the same questions.
- **`SupportCard.tsx`** — File a **support ticket** (bug, question, feature
  request) and read replies, right inside Settings.
- **`AdminView.tsx`** — The **Admin** panel (only for admin accounts): user
  list, activity log, the support-ticket queue, top-line metrics, and a
  **Categorization** tab that shows each connected-bank transaction's raw Plaid
  fields beside the category our code assigned it (for spot-checking).
- **`PlaidDebugTab.tsx`** — The Categorization tab's actual table: it pulls
  your stored raw bank transactions (no call to Plaid) and runs them through
  the *real* sorting code, so what you see is exactly what the app decided
  and why.
- **`StatCard.tsx`, `EmptyState.tsx`, `icons.tsx`** — Tiny shared pieces (a
  number box, a "nothing here yet" message, and all the little drawings/icons).
  The "nothing here yet" message can show a drawing instead of its icon;
  only the quiz uses that, for Omer.
- **`Omer.tsx`** — **Omer, the mascot**: a smiling honey-gold manna bowl
  with two little legs. The picture itself comes from the shared helper
  `omer.ts` (below), so the phone draws exactly the same Omer. Each moment
  picks what he's doing (waving, cheering, jumping, "oops", standing
  proud…) and sometimes an outfit (a detective, a coach, a builder, a
  graduate, a nightcap for napping…). He pops in with a little bounce and
  then does his own little move, over and over for as long as he's on
  screen: he waves from the shoulder, does reps with his barbell as the
  coach, swings his lasso, taps his mallet, tosses his graduation cap,
  flies with his cape rippling as the hero. If
  your device asks for less motion, he just stands still. Below a certain size an outfit
  would be too small to make out, so he appears without it. In dark mode
  he gets a faint light edge so his dark outline doesn't disappear into a
  dark card. He only ever appears at the fun moments, never on your money
  screens. These are construction drawings; when the finished artwork
  arrives it replaces them inside this one piece, and every screen that
  shows him stays the same.
- **`StreakFlame.tsx`** — The **little streak flame**, drawn instead of the
  🔥 emoji so it looks the same on every device: coral with a honey middle
  once today has counted, grey and faded until then.

---

## 6. The "thinking" helpers (`packages/core/lib`, plus seven web-only files in `src/lib`)

These files don't draw anything — they're the **brains** that do the math and
the sorting. Keeping them separate from the screens keeps the code tidy, and
almost all of them live in the shared `packages/core` package so the phone
app can use them unchanged. The seven marked **(web-only, in `src/lib`)** are
the exceptions — they need a real browser.

- **`storage.ts`** — Talks to the notebook: save and load. The notebook has
  **swappable paper**: in the browser it writes to `localStorage` (found
  automatically — nothing to set up), and the phone app hands it MMKV, a
  different notebook that answers just as instantly. Either way the rest of
  the app doesn't know or care which paper it's writing on.
- **`id.ts`** — Hands out the little **name tags** (unique ids) that each
  transaction and import gets, so helpers that make data don't need to touch
  the notebook just for a tag.
- **`links.ts`** — Lets one transaction **stand for another**. When a shop
  refunds you, or a friend pays you back, or your card moves a purchase onto a
  payment plan, the money comes back as a second row. On its own that row looks
  like income, and in the payment-plan case the shop gets charged to you twice.
  Linking the two says "this cancels that", so the pair nets out and you see
  what you actually spent. It also spots payment plans by itself, because
  nobody would think to go looking for them.
- **`analysis.ts`**'s "where the most went" groups the biggest spending **by
  shop** rather than listing the biggest single charges. A list of individual
  charges stops being useful the moment you have a mortgage — one bill
  repeating every month fills every slot and tells you nothing — so it adds a
  shop's charges up, shows how many there were, and lets you click through to
  them. Refunds come off the shop they came back from.
- **`categoryRules.ts`** — "**Anything containing X is Y**", said once and
  applied forever, including to imports that haven't happened yet. The other
  ways of remembering a category all start from fixing a row you can see; this
  one starts from a statement about money you haven't met. It exists for money
  on a **separate ledger** — someone who co-owns a rental has the tenant's
  rent, the mortgage, the empty unit's power bill and the letting agent's fee
  spread across three accounts, each correctly categorized and each wrong to
  mix into personal spending. A few rules gather them into **Business /
  Rental**. The rent they *receive* stays plain Income, since Business /
  Rental is a spending bin and money landing in one would be read as a refund.
  A narrower rule beats a broader one, so the rental's power bill can go one
  way while the household's, from the same company, goes another.
- **`filter.ts`** — The one **sieve** every list uses: text, amount, category,
  source. Amounts match on size rather than direction, so you can look for "the
  $118 one" without first remembering whether it was money in or out. This
  matters when one shop name covers two different bills — the HOA dues and the
  home insurance arrive under the same name, and the amount is the only thing
  that tells them apart.
- **`owner.ts`** — Knows the difference between **money you moved to yourself**
  and money that changed hands. Zelle, Cash App and PayPal make both look the
  same, and most people's statements are mostly the first kind. You tell it
  your own names and account nicknames once (in Settings), and it quietly puts
  those aside.
- **`transferReview.ts`** — Takes what's left and **groups it by who** the
  money went to or came from, so you can decide once per person rather than
  once per row — and it remembers, so the same person's transfers don't ask
  again next month.
- **`txKey.ts`** — Gives each transaction a **fingerprint** that stays the same
  when you import the same statement again. The name tags from `id.ts` are
  handed out fresh every import, so anything you attach to one particular
  charge has to be pinned to something about the charge itself: its date, its
  description, its amount — plus a number saying "this is the second one of
  those today", because a statement really can list the same charge twice.
- **`themeAdapter.ts`** — The **light-switch plate**: it knows how to ask the
  device "do you prefer dark mode?" and how to actually flip the app's colors.
  The browser version is built in; the phone app will screw in its own plate.
- **`parse.ts`** — Understands messy **dates** ("04/03/2026", "April 3") and
  **money** ("$1,234.56", "(45.00)") and turns them into clean numbers.
- **`categorize.ts`** — The **sorter**. It looks at the store name and guesses a
  category using keywords (e.g., the word "Starbucks" → Dining). It also gives
  **Zelle** and **Transfers** (money you move between your own accounts) their own
  groups so they don't look like real spending. It pays attention to **which way
  the money went**, because the same word can mean opposite things: rent you
  *pay* is a housing cost, but rent a tenant *pays you* is income — so a word
  like "rent" only counts as housing when money is going out. It also spots a
  **credit-card bill paid from your checking account** ("CITI CARD ONLINE
  PAYMENT") and files it as a transfer, because the card's own statement already
  lists everything you bought with it — counting both would charge you twice.
- **`categories.ts`** — The **list of bins** and their names, colors, and emojis.
  There's a rich built-in set — Groceries, Dining, Transport, Utilities,
  Rent/Mortgage, **Home & HOA**, **Business / Rental**, **Insurance**,
  **Loans & Debt**, Shopping,
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
- **`bankFormats.ts`** — A **phone book of bank spreadsheet layouts**: for
  each bank, the exact header row it writes and which column means what. It
  recognises a file by its header row, and it can also *write* a file in
  that layout (the demo banks use that).
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
  `chargesInMonth` / `upcomingCharges` place those bills on a calendar: each
  group bills on the user's **billing day** (or, failing that, the day it usually
  lands on — `RecurringPayment.day`, the mode of its transaction days), annual
  subscriptions land on their renewal date, and cancelled ones drop out — the
  first feeds the calendar grid, the second the soonest-first "upcoming" list.
- **`yearly.ts`** — Builds the **Year Sheet** numbers: per-category monthly
  actuals for a year, grouped into sections, plus **projections** for the months
  that haven't happened yet (budget if set, else the average of the months your
  data covers) and the running end-of-month balance.
- **`gamification.ts`** — The **points & streak brain**: answering the
  question of the day, right or wrong, checks you in for the day (+XP,
  streak grows); just opening the app or playing the quiz doesn't.
  Finishing a quiz, the daily question, and imports earn more XP, and XP adds up to **levels** with
  stewardship titles (Steward in Training → Good & Faithful Steward, after
  Luke 16:10). Your level survives "Clear all data" on purpose.
- **`streak.ts`** — The **streak's map**. It knows the goals a streak climbs
  through (a week, then two weeks, a month, two months, 100 days, six
  months, a year, and another year after that), how far you are from the
  next one, and whether your streak is still alive today: if you skipped a
  whole day it reads 0 until your next answer starts it again at 1. It also
  holds the outlines of the streak flames (the big one in the streak moment
  and the little one beside your streak count), so the website and the
  phone draw exactly the same ones.
- **`omer.ts`** — **Omer's drawing kit.** Ask it for Omer in any pose or
  outfit and it writes out the picture (as an SVG, a kind of drawing made
  of shapes), using the app's own colors. The website and the phone both
  draw him from it. The design notes keep their own copy of the same
  drawing code for the design documents, and a test checks that both
  copies draw exactly the same picture.
- **`omerMoments.ts`** — **Which Omer shows up when.** One small table both
  apps share: the detective starts a quiz, the graduate ends it, he cheers
  or says "oops" after an answer, jumps at a level-up (the builder at level
  5, the flying hero from level 8), wears each badge's outfit when it's
  earned, comes as the coach on streak goal days, and naps once today's
  question is done. A test keeps it honest (for example, that every badge
  has an outfit).
- **`omerMotion.ts`** — **How Omer moves.** For each pose and outfit it
  says which part of the drawing moves and how: the waving arm turns at the
  shoulder, the coach's barbell comes down to his rim and back up, the
  lasso swings and a knot runs round its loop, the hero's cape ripples. It
  hands over Omer's picture with those parts marked, plus the timing of
  every move, written as plain numbers so the website and the phone play
  exactly the same moves. Every move starts and ends on the still drawing,
  so he always comes to rest looking exactly as drawn. Tests check that the
  marked-up picture is still the same drawing and that every move begins
  and ends at rest.
- **`dailyQuestion.ts`** — The **question-of-the-day maker**: builds one
  question per day (personalized from your data via the quiz maker, or a
  general literacy question from `data/generalQuestions.ts` when there's no
  data), saves it so reloads show the same question, and pays XP for answering
  (+bonus when correct). Rolls over at local midnight, like the verse. Because
  it borrows the quiz maker's questions, it also borrows their receipts — the
  saved question keeps the transaction list, so it's still there after a
  reload.
- **`giving.ts`** — The **generosity calculator**: tithes + charity totals,
  giving as a % of income, per-month giving, and progress toward a giving goal.
- **`badges.ts`** — The **badge rules**: one-time achievements (First Steps,
  Cheerful Giver, First Fruits, Debt Slayer, streaks, perfect quiz) earned from
  real behavior. Giving earns badges, never XP — generosity isn't a points game.
- **`milestones.ts`** — The **"was that a big moment?" checker**. It
  compares your points, streak and badges before and after something
  happened and says "today counted for your streak", "you just went up a
  level" or "you just earned these badges". Several
  badges earned at once (loading the sample year can earn three) become one
  celebration, not a pile of them. Both apps use it to decide when to throw
  the level-up party. It measures from whatever you had when the app opened,
  so loading your account never throws a party for old progress. It also
  notices a loan you've just confirmed paid off (undoing one never counts),
  and tucks the Debt Slayer badge into that party when the payoff earns it.
- **`sounds.ts`** — The **five sounds**, written as tiny music recipes
  rather than downloaded files: a bright two-note chime (right answer), a
  soft low tone (not quite), a round drop, a quick upward sparkle (level up
  and badges), and a short fanfare (quiz finished). `npm run gen:sounds`
  plays the recipes into small sound files for both apps (`public/sounds/`
  and `apps/mobile/assets/sounds/`), so the website and the phone sound the
  same, and since we made them ourselves there's no license to keep track
  of. A test makes sure each stays short (under a second; the fanfare under
  two) and quiet.
- **`debt.ts`** — The **debt-freedom helper**: loan payments by month and a
  detector for recurring loans that go quiet (paid off?), measured against the
  newest data so a stale import doesn't cry wolf.
- **`quiz.ts`** — The **quiz maker**. It builds questions from your real numbers
  ("How much did you spend on Dining?"), including **faith-informed** ones on
  tithes/offerings and debt payments (with short scripture takeaways), plus the
  end-of-quiz insights. The income question counts **real income only** (refunds
  net against spending), the transaction-count question counts **expenses only**
  (how often money went *out*), and the recurring questions ask about
  **bills only** — repeat habits like Amazon runs are left out. Every question
  it builds comes with its **receipts** — the list of transactions the figure
  was worked out from, refunds included so the list adds up to the number you
  were asked about.
- **`format.ts`** — Makes numbers and dates look nice ("$1,234.56", "Apr 3, 2026").
- **`plaid.ts`** — Talks to the backend's bank connector (`/api/plaid/…`):
  start a connection, sync, disconnect.
- **`plaidLink.ts`** *(web-only, in `src/lib`)* — Opens **Plaid's own pop-up** in the browser (loading
  their script from their site) so you type your bank password into Plaid's
  window, never ours. Browser-only on purpose; the phone app uses Plaid's
  phone kit (`react-native-plaid-link-sdk`) for the same job.
- **`plaidMap.ts`** — Translates Plaid's data into our Transaction cards and maps
  Plaid's categories onto ours.
- **`exportData.ts`** *(web-only, in `src/lib`)* — Builds the **download** files (CSV, JSON, and a printable
  report).
- **`supabase.ts`** *(web-only, in `src/lib`)* — Sets up the **sign-in** client (Supabase Auth) — or
  `null` when accounts aren't configured, which is how every account feature
  knows to hide itself. It's used *only* for login; no data goes through it.
- **`api.ts`** — The **phone line to the Node backend**. Every call to the API
  goes through here; it attaches your signed-in token so the server knows it's
  you. The phone line itself doesn't know where the token comes from — at
  startup each app plugs in its own cord (see `configure.ts`), and with no
  cord plugged in it simply behaves as signed-out and local-only.
- **`configure.ts`** *(web-only, in `src/lib`)* — The web app's **cord**: at startup it tells `api.ts`
  where the backend lives and how to fetch the signed-in token from Supabase.
  The phone's version of this cord is `apps/mobile/src/lib/platform.ts`.
- **`cloudSync.ts`** — The **photocopier**. It watches every save to the
  notebook and, a couple of seconds later, sends the changed pages to the
  backend (`POST /api/sync`). It also pulls everything down at sign-in and
  skips pages that haven't actually changed. When it compares pages it looks
  at the *contents*, not the exact wording order — the database shelves the
  fields of a page in its own order, and that must never look like a change
  you made. The website and the phone share this photocopier; the website
  gives it one last nudge when you close the tab, the phone when you switch
  away from the app.
- **`routes.ts`** *(web-only, in `src/lib`)* — The **map of web addresses**:
  which screen lives at which address and back, the tab titles, and which
  doors a brand-new visitor may walk straight through (see `App.tsx` above).
- **`sound.ts`** *(web-only, in `src/lib`)* — The **sound player**: plays the
  five sounds when a moment happens, but only if your Sounds setting is on
  and your device isn't asking for less motion. Browsers stay silent until
  you've clicked something on the page, which suits a level-up that happens
  the moment the page opens.
- **`track.ts`** *(web-only, in `src/lib`)* — The **activity logger**: small batched events ("viewed the
  quiz", "imported a file — 214 rows") sent to `POST /api/events` for the admin
  activity log. It never records store names or amounts, and records nothing
  when you're signed out.
- **`merchantLogos.ts`** — The **logo spotter**. It reads a bank line like
  "STARBUCKS STORE 13390" or "NETFLIX.COM" and says which company it is,
  when it's one of the roughly 125 well-known companies we have a logo for
  (coffee and fast food, streaming and software, phone and internet, airlines
  and hotels, shipping, car loans, and a few big retailers).
  The logos themselves (`data/brandIcons.ts`) are packed inside the app, so
  spotting one never sends a store name anywhere. It is deliberately
  cautious, because a wrong logo is worse than none: everyday words only
  count when the rest of the line backs them up ("STEAM PURCHASE" is the game
  store, "STEAM CARPET CLEANING" is not; "PANDORA MEDIA" is the music service,
  "PANDORA JEWELRY" is not), a car maker only counts next to its loan company
  ("TOYOTA MOTOR CREDIT"), and a person's name never counts, so "Zelle payment
  to Ford Anderson" gets the Zelle logo and nothing else. The free logo
  collection we borrow from has had some big names removed at their own
  request (Amazon, Walmart, Hulu, Disney+, Adobe and Microsoft among them) and
  never carried many others (Costco, Home Depot, CVS, most grocery chains), so
  those rows show no logo of their own. For bank-linked accounts,
  Plaid also sends its own logo with many purchases, and the app uses that
  when we don't have one. Most small or local shops have no logo, and that's
  fine: the screen just shows what it showed before (the category's little
  picture, or nothing). Logos appear in the recurring & subscriptions list,
  the upcoming charges, Top merchants and its "View all" list (merchants and
  spending habits), and the transactions table. Budgeting apps like Empower tidy bank
  lines before you export them ("APPLE.COM/BILL" becomes just "Apple",
  "JPMORGANCHASE" loses its space), so the spotter also recognises those
  tidied-up names, but only when the whole name is the company.

And in **`packages/core/data/`**: **`sampleData.ts`** is a pretend year of money for a made-up
person, spread over three pretend accounts (checking, savings, a credit card)
so the app has something to show in every corner: a monthly church tithe and
small donations for the giving features, one very frequent coffee shop, one
clear biggest purchase, a mortgage that repeats every month, subscriptions
(monthly, yearly, and one that stopped), refunds, transfers and Zelle both
ways, and one shop name used for two different bills at two different amounts.
Its shops are a deliberate mix of real chains (Starbucks, Netflix, Target,
Shell…) and made-up local names, so you can see both what a logo looks like
and what a row without one looks like. The purchases themselves are all
invented.
Its dates are **counted back from today** rather than written down, so "this
month" is never empty no matter when you open it — and the same day always
produces exactly the same pretend year, so the quiz and the tests can rely on
it. **`demoBanks.ts`** is the same made-up person's money spread across six
pretend banks (see `DemoBankModal.tsx` above): paycheck and bills at Chase,
savings at Ally, and a card for each kind of spending. The accounts agree
with each other: every card's purchases show up as a payment out of checking
the next month, and money sent to savings appears on both sides, so
connecting one bank or all six still adds up. Like the sample year, it's
counted back from today and comes out the same every time.
**`verses.ts`** holds 50 scripture verses about
money (World English Bible — public domain) with the verse-of-the-day picker,
and **`generalQuestions.ts`** is the bank of 16 general money-literacy
questions (budgeting rules, emergency funds, debt, a couple on stewardship)
behind the daily question when no data is connected.

**`brandIcons.ts`** is the small set of company logos the app carries,
copied out of the free Simple Icons collection by `npm run gen:brands` (we
keep only the ones we use, so the phone app doesn't carry thousands).

The math helpers are covered by **unit tests** (`src/**/*.test.ts`, run with
`npm test` via Vitest), so future changes can't silently break the numbers.

---

## 7. The brain that remembers everything (`store.tsx`, `auth.tsx`, and `types.ts`)

(`store.tsx` and `types.ts` live in the shared `packages/core`; `auth.tsx` is
web-only and stays in `src/`. The phone has its own matching "who's signed in?"
brain — logging in over the web and over the phone works differently enough
that each app keeps its own, but they agree on the **shape** of a profile,
which lives with the other shapes in `types.ts`.)

- **`auth.tsx`** — The **"who's signed in?" brain**. It wraps the whole app
  (one level *above* the store) and remembers your session and profile, so
  every screen can ask "am I signed in? am I the admin?". When the app is
  built without sign-in credentials it simply answers "nobody, ever" and all
  the account features hide themselves. It sits above the store on purpose:
  when the signed-in user changes, the store below it is restarted so it
  re-reads the right notebook.
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
  - **category edits** — remembered at **three levels**. Fixing one transaction
    now pins your answer to **that exact row** and nothing else, so two charges
    that look identical — the same HOA descriptor billed at two different
    amounts, or the very same charge posted twice in one day — can be filed
    differently and both answers come back on the next import. (It used to
    remember by description, which meant filing one of them quietly re-filed
    every other row with the same text, and whichever you edited last won.) Say
    "apply to all charges from this store" and it's remembered by **merchant**
    instead, which also clears the individual pins on that store — you asked
    for all of them. Older per-description edits are still honored.
  - **renames (aliases)** — per merchant, survive re-imports.
  - **description overrides** — the bulk-rename counterpart to per-row category
    edits, same idea: pinned to that **exact row**, so the $9.99 Apple charges
    can become "iCloud" while the $10.99 ones stay untouched (or become
    "Apple Music" separately) instead of one merchant-wide alias overwriting
    both. Survives re-imports the same way per-row category pins do. Renaming
    some charges really does split them into their own recurring group. The
    ★ star, "dismiss from Recurring", and renaming a group all go by the name
    a row shows **now**, not the bank's original text, so starring, hiding,
    or renaming one split-off group never touches the other.
  - **treatments** — per charge: "someone paid me back" or "this was just me
    moving money", both of which change whether and how a row counts.
  - **links** — which credit cancels which charge, per charge.
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

## 8. The Node.js backend (the `server/` folder)

This is the **online half** of the app: a small **Node.js server** built with
**Fastify**, talking to a **PostgreSQL** database through **Drizzle** (a typed
query helper). It's the single API the website calls once you sign in. Setting
it up is in [docs/SETUP-backend.md](docs/SETUP-backend.md).

How a request works: the website attaches your **sign-in token** (from Supabase
Auth) to every call. The server's *front door* (`auth/middleware.ts`) checks
that token, figures out **which user you are**, and only then runs the request —
and every database query is filtered to *your* id. So the server, not the
database, is the security guard.

What lives there (`server/src/`):

- **`index.ts`** — starts Fastify and wires up the routes.
- **`db/schema.ts`** — the shape of the six tables (`profiles`, `user_slices`,
  `plaid_items`, `activity_events`, `support_tickets`, `ticket_messages`);
  **`db/client.ts`** is the Postgres connection.
- **`auth/`** — verifies the Supabase token (`verify.ts`) and the
  `requireUser` / `requireAdmin` front-door checks (`middleware.ts`). On your
  first sign-in it creates your `profiles` row; the owner's email
  (`ADMIN_EMAIL`) is stamped `admin`.
- **`routes/`** — the actual endpoints:
  - `me` → who am I.
  - `sync` → save/fetch your notebook pages (`user_slices`). There is **no**
    route that returns anyone else's, so admins can't see your money data.
  - `events` → receive the batched activity log.
  - `plaid` → the **bank connector**: checks who's asking, keeps each person's
    bank token **encrypted** in `plaid_items` (`plaid/crypto.ts`), and never
    lets it reach a browser. No Plaid keys configured → "pretend" (mock) mode
    with fake-but-realistic data, so the connect → import flow works for free.
    A read-only `raw` route returns your own stored transactions (no Plaid call)
    for the Admin **Categorization** panel.
  - `tickets` → your support tickets and replies.
  - `admin` → users list, activity log, ticket queue, and metrics — every route
    behind `requireAdmin`.

Crashes in the browser also go to **Sentry** (an error-collecting service) with
the financial details scrubbed out.

> 🔑 **The security model in one sentence:** the Node server learns who you are
> from a signed token it can't forge, and every query it runs is scoped to your
> user id — so one person can never receive another person's data.

> Sign-in itself is handled by **Supabase Auth** (Google + email/password +
> password-reset emails). It only verifies identity and hands the browser a
> signed token; it never touches your financial data, which lives in our own
> database behind the Node server.

---

## 9. The tools the project is built with

- **React** — the toolkit for building the screens out of Lego-brick components.
- **TypeScript** — JavaScript with "fill-in-the-blank" rules (types) that catch
  mistakes before they happen.
- **Vite** — the tool that runs the app while you build it and packages it for the
  web.
- **Tailwind CSS** — the styling shortcuts (colors, spacing) that make it look
  nice, including dark mode. The app's look is the **Manna Money theme**,
  defined in one place (`packages/core/theme.ts`, which generates the web's
  `src/theme.css` via `npm run gen:theme` — so the phone app gets the exact
  same colors): warm paper colors named **linen**,
  a deep green named **forest**, a gold named **honey**, a soft dawn blue
  named **sky** (backdrops and "for your info"), and a gentle **coral** for
  "not quite" (so a wrong answer never looks like an alarm), plus three fonts
  the app ships itself (no font service watches you download them):
  **Fraunces**, the bookish serif in headings, verses, and big numbers (it
  can be "softened" to look rounder for scripture and stories); **Inter** for
  everything else; and **Nunito**, a rounded, friendly font waiting in the
  wings for buttons and game text. *When* to use each color and font is
  written down in plain words in [docs/DESIGN.md](docs/DESIGN.md), the app's
  design rulebook. Category colors (the donut, the little
  chips) live in `packages/core/lib/categories.ts` and were checked by a program —
  not by eye — so they stay tellable-apart for colorblind readers and
  readable in both light and dark mode.
- **Recharts** — draws the pie and bar charts.
- **PapaParse** — reads spreadsheet (CSV) files.
- **Node.js + Fastify** — the backend server that owns the data and the API.
- **PostgreSQL + Drizzle** — the database and the typed helper the server uses
  to query it.
- **Supabase Auth** — the sign-in service (Google + email/password). Identity
  only — it never sees your financial data.
- **Sentry** — collects crash reports (with financial details scrubbed) so
  bugs get noticed and fixed.

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
  card; habits in the Spending habits tab behind Top merchants' "View all";
  "Treat as" re-files either way.
- **Refund / cashback** — money back in a spending category. Not income: it
  subtracts from that category's spending in the month it lands.
- **Alias / rename** — an alias is a clean display name for a whole merchant
  (set from the Name box at the top of a group's detail window); every messy
  variant folds under it, in display and in grouping — including other amounts
  from the same merchant. Renaming a single charge (the pencil icon) or a
  **bulk rename** (select rows in the transaction table, then "Rename to…")
  instead pins the label to just the exact charges you chose, so two amounts
  from one merchant can carry different names.
- **Recurring transfer** — a same-amount, same-day Zelle/transfer that's really a
  monthly bill; counted toward your totals (unless you opt it out).
- **Source** — one thing you added (an uploaded file or a connected bank).
- **Transfer / Zelle** — money moved between your own accounts; not counted as
  spending — unless it's a recurring same-amount bill (see above).
- **Plaid** — the company that securely connects apps to real banks.
- **Mock mode** — the "pretend" mode that uses fake data so you can try things
  for free.
- **Account** — an optional sign-in (email/password or Google) that backs up
  your notebook to the backend and lets it follow you across devices.
- **Slice** — one page of the notebook (your transactions, your budgets, your
  game progress…); the unit the photocopier syncs (a `user_slices` row).
- **API / endpoint** — a URL on the Node server the app calls, like
  `/api/sync`; each one checks your token before doing anything.
- **JWT / token** — the signed "this is who I am" badge Supabase Auth gives the
  browser; the Node server checks it on every request.
- **Ticket** — a help request you file under Settings → Help & support;
  admins answer from the Admin panel.

---

### The one-sentence version

> The **website** turns your transactions into neat cards, the **brain
> (`store`)** remembers them in your browser's **notebook**, the **lib helpers**
> do all the math and sorting, the **components** draw the screens, and — when
> you sign in — a **Node.js backend** syncs your notebook to a **PostgreSQL**
> database and safely connects to real banks through Plaid.
