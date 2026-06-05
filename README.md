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
2. **Upload it** on the **Import** tab (drag-and-drop or "Choose CSV file").
3. **Map the columns.** Bank formats vary, so you'll match your file's columns to:
   - **Date** — supports `MM/DD/YYYY`, `YYYY-MM-DD`, written dates like
     `April 3, 2026`, and 2-digit years.
   - **Description / merchant**
   - **Amount** — choose one of:
     - *One signed column* where negative numbers are expenses. If your bank uses
       positive numbers for expenses, tick **"Positive numbers are expenses"** to
       flip the sign.
     - *Separate debit & credit columns* (money out / money in).
   - **Category** *(optional)* — if your export already has one, map it; otherwise
     transactions are auto-categorized.
4. A live **preview** shows how rows will import and how many (if any) are
   skipped. Click **Import**. Your mapping is remembered for next time.

Auto-categorization uses keyword rules (groceries, dining, transport, utilities,
rent/mortgage, shopping, entertainment, health, income, other). You can change
any transaction's category inline in the table — your edits are remembered and
re-applied to future imports of the same merchant.

You can also click **Download sample CSV** on the Import tab to see exactly the
shape the importer expects (`Date,Description,Amount`).

## What you get

- **Dashboard** — income / spending / net for this month, last month, or all
  time; spending-by-category donut with a sortable breakdown; top 5 expenses; a
  monthly trend chart; and headline stats (biggest category, largest expense,
  average daily spend, transaction count).
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
