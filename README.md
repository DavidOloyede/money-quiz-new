# Money Quiz — Personal Finance Insight

Import your bank transactions, see where your money goes, and take a quiz
generated **from your own data** that teaches you about your spending habits.

Everything runs in your browser. There is no backend, no account, and no bank
login. Your transactions never leave your device — they're parsed locally and
stored only in your browser's `localStorage`. Use **Clear all data** anytime to
wipe everything.

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

Auto-categorization uses keyword rules (groceries, dining, transport, utilities,
rent/mortgage, shopping, entertainment, health, **Zelle**, income, **transfers**,
other). **Zelle** and **transfers** (card payments, account-to-account moves) are
tracked on their own and *excluded* from spending and income totals, so moving
money between your own accounts doesn't distort the picture. You can change any
transaction's category inline — in the table, or by clicking a category on the
dashboard to drill in — and your edits are remembered and re-applied to future
imports of the same merchant.

You can also click **Download sample CSV** on the Import tab to see exactly the
shape the importer expects (`Date,Description,Amount`).

## What you get

- **Dashboard** — income / spending / net for this month, last month, or all
  time; spending-by-category donut with a sortable breakdown; top 5 expenses; a
  monthly trend chart; and headline stats (biggest category, largest expense,
  average daily spend, transaction count). Click any category (in the donut or
  the breakdown) to drill into its transactions and recategorize them. A separate
  **Transfers & Zelle** panel shows the money that's tracked but not counted.
- **Quiz** — 8–10 multiple-choice questions computed from your real numbers
  (e.g. *"How much did you spend on Dining last month?"*, *"What was your single
  largest expense?"*, *"Did your Groceries spending go up or down?"*). Each answer
  reveals the real figure and a one-sentence takeaway. Retake for a fresh,
  randomized set.

## Tech stack

React + TypeScript (Vite), Tailwind CSS v4, Recharts for charts, and PapaParse
for CSV parsing. All logic is client-side.

## Privacy

- No bank credentials are ever requested, collected, or stored. Data enters only
  through file import.
- Transaction data is never sent to any server or third-party API.
- Data is persisted only in `localStorage` under keys prefixed `moneyquiz.`, and
  the **Clear all data** button removes all of it.
