# Money Quiz — Personal Finance Insight

Import your bank transactions, see where your money goes, and take a quiz
generated **from your own data** that teaches you about your spending habits.

Two ways to get your data in:

- **CSV import** — 100% in your browser. No backend, no account, no bank login;
  transactions are parsed locally and stored only in `localStorage`.
- **Connect a bank with Plaid** *(optional)* — runs through a small local server
  you control (see below). Still no third-party of ours touches your data.

Use **Clear all data** anytime to wipe everything.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

No data yet? Click **Load sample data** to try the whole app instantly with ~60
realistic transactions spanning a few months.

Other commands:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
npm run server    # start the optional Plaid backend (see "Connect a bank")
```

## Using your own bank CSV

1. **Export a CSV from your bank.** In your bank or card website, open the
   account/transactions page and look for **Download** / **Export** and choose
   **CSV** (sometimes labeled "Spreadsheet" or "Comma-separated"). Pick the date
   range you want.
2. **Upload it** on the **Import** tab (drag-and-drop or "Choose CSV file"). You
   can import as many files as you like — each one **adds to** what's already
   there, so a checking export and a couple of card exports live side by side.
   Every imported file is listed under **Imported files** with its transaction
   count, and you can remove any one (and all of its transactions) later.
3. **Pick the account type.** Tell us whether the file is a **bank / checking**
   export or a **credit card**. For credit cards we automatically remove the
   *payments* that settle the balance — that money already shows up leaving your
   checking account, so keeping it would double-count. Purchases and refunds stay.
4. **Map the columns.** Bank formats vary, so you'll match your file's columns to:
   - **Date** — supports `MM/DD/YYYY`, `YYYY-MM-DD`, written dates like
     `April 3, 2026`, and 2-digit years.
   - **Description / merchant**
   - **Amount** — choose one of:
     - *One signed column* where negative numbers are expenses. If your bank uses
       positive numbers for expenses, tick **"Positive numbers are expenses"** to
       flip the sign.
     - *Separate debit & credit columns* (money out / money in).
   - **Category** *(optional)* — if your export already has one, map it; we'll
     translate labels like "Food & Drink" or "Health & Wellness" to the matching
     category. Otherwise transactions are auto-categorized.
5. A live **preview** shows how rows will import, how many (if any) are skipped,
   and how many card payments were removed. Click **Import**. Your mapping is
   remembered for next time.

Auto-categorization uses keyword rules across groceries, dining, transport,
utilities, rent/mortgage, shopping, entertainment, **subscriptions** (Apple,
Google, GitHub, Figma, etc.), health, **Zelle**, income, **transfers**, and
other. **Zelle** and **transfers** (card payments, account-to-account moves) are
tracked on their own and *excluded* from spending and income totals, so moving
money between your own accounts doesn't distort the picture.

You can change any transaction's category inline — in the table, or by clicking a
category on the dashboard to drill in. When you recategorize one transaction
we'll offer to **apply the change to every matching merchant** at once, and you
can multi-select rows for bulk edits. Your edits are remembered and re-applied to
future imports of the same merchant.

You can also click **Download sample CSV** on the Import tab to see exactly the
shape the importer expects (`Date,Description,Amount`).

## Connect a bank with Plaid (optional)

Linking a real bank or card uses [Plaid](https://plaid.com). Plaid's API secret
can never live in the browser, so this needs the small bundled server
(`server/plaidServer.mjs`) — it's dependency-free (plain Node) and holds the
access token locally.

```bash
npm run server      # starts http://localhost:8787
npm run dev         # in another terminal
```

- **Demo mode (no setup).** With no Plaid keys, the server runs in **mock mode**
  and serves realistic sample transactions, so you can try the whole
  *Connect → import → auto-categorize* flow end-to-end. On the Import tab, click
  **Connect (demo)**.
- **Real banks.** Copy `.env.example` → `.env`, add your `PLAID_CLIENT_ID` /
  `PLAID_SECRET` and `PLAID_ENV` (from the [Plaid dashboard](https://dashboard.plaid.com)),
  then restart the server. The Import tab switches to **Connect with Plaid**,
  which opens Plaid Link — you authenticate with your bank inside Plaid, so this
  app never sees your credentials.

Connected accounts appear under **Imported sources** with a **Sync** button
(re-pull the latest) and a remove button (disconnect + delete its transactions).
Plaid's categories are mapped onto ours automatically; you can recategorize like
any other transaction.

> The server is single-user and local — it stores access tokens in
> `server/.data/` (gitignored) and is not meant to be deployed as a multi-tenant
> service. CSV import keeps working with the server off.

## What you get

- **Dashboard** — income / spending / net for this month, last month, all time,
  or a **custom date range**; a spending-by-category donut with a sortable
  breakdown; top 5 expenses; a monthly trend chart; and headline stats. Click any
  category to drill into its transactions and recategorize them. Plus:
  - **Budgets** — set a monthly budget per category and track progress with
    over/under alerts.
  - **Recurring payments** — automatically detected subscriptions and bills with
    an estimated monthly cost.
  - **Trends & anomalies** — callouts like *"Dining is up 40% vs your 3-month
    average."*
  - **Top merchants** and a **Transfers & Zelle** panel for the money that's
    tracked but not counted.
- **Quiz** — 8–10 multiple-choice questions computed from your real numbers
  (spending by category, largest expense, month-over-month changes, recurring
  costs, busiest spending day, budget vs actual, and more). Each answer reveals
  the real figure and a one-sentence takeaway, and your **scores, best result,
  and day streak** are tracked across attempts. Retake for a fresh set.
- **Settings** — light/dark theme, fully customizable categories (rename,
  recolor, add your own), and one-click **export** of your data (CSV / JSON) or a
  printable summary report.

## Tech stack

React + TypeScript (Vite), Tailwind CSS v4, Recharts for charts, and PapaParse
for CSV parsing. The app is client-side; the optional Plaid connector is a small
dependency-free Node server.

## Privacy

- **No bank credentials are ever requested, collected, or stored by this app.**
  CSV import is files only; Plaid Link collects your login inside Plaid's own UI,
  never here.
- **CSV import** is fully local — nothing is sent anywhere.
- **Plaid** (only if you choose to connect) routes through the local server you
  run; your Plaid access token is stored on your machine in `server/.data/`
  (gitignored) and transactions are saved into your browser like any other import.
- App data is persisted only in `localStorage` under keys prefixed `moneyquiz.`,
  and **Clear all data** removes all of it.
