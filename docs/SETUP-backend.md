# Backend setup — accounts, sync, Plaid, logging, support

Everything in the app still works with **zero setup** (local-only mode). This
guide turns on the cloud: user accounts, cross-device sync, real bank
connections, activity logging, and support tickets. Budget ~45 minutes.

## 1. Create the Supabase project (~5 min)

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
   Name it whatever the app ends up being called; pick a US region.
2. From **Settings → API**, copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
3. Copy `.env.example` to `.env` and fill those two in.

## 2. Push the database schema (~5 min)

The schema (tables + row-level security) lives in
`supabase/migrations/0001_init.sql`. Apply it with the CLI (already a dev
dependency):

```bash
npx supabase login                 # opens browser
npx supabase link                  # pick the project you just created
npm run db:push                    # applies supabase/migrations/
```

> **Admin account:** the migration grants `role = 'admin'` to
> `davidoloyede00@gmail.com` at signup (placeholder until there's a dedicated
> app email). To promote anyone later, run in the SQL editor:
> `update profiles set role = 'admin' where email = '...';`

## 3. Turn on sign-in methods (~10 min)

**Email + password** — Dashboard → Authentication → Sign In / Up → enable
Email. For quick testing, turn OFF "Confirm email"; turn it back on before
launch.

**Google** — two halves:

1. [Google Cloud Console](https://console.cloud.google.com) → create a
   project → APIs & Services → OAuth consent screen (External, app name,
   your email) → Credentials → Create credentials → OAuth client ID →
   Web application. Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google → paste the
   client ID + secret, enable.

Then Authentication → URL Configuration → add `http://localhost:5173` to the
redirect allowlist (and your production URL once deployed).

## 4. Deploy the Plaid function (~10 min)

Without Plaid keys it runs in **mock mode** (fake bank, full flow works), so
you can deploy first and add keys later:

```bash
# encryption key for access tokens at rest (required for real mode)
npx supabase secrets set PLAID_TOKEN_KEY=$(openssl rand -base64 32)

# real-bank mode (sandbox): from dashboard.plaid.com → Team settings → Keys
npx supabase secrets set PLAID_CLIENT_ID=... PLAID_SECRET=... PLAID_ENV=sandbox

npm run functions:deploy
```

Plaid sandbox test login inside Plaid Link: `user_good` / `pass_good`.

## 5. Sentry error tracking (optional, ~5 min)

[sentry.io](https://sentry.io) → new React project → copy the DSN into
`VITE_SENTRY_DSN` in `.env`. Console/fetch breadcrumbs and PII are already
scrubbed in `src/main.tsx` so transaction data never reaches Sentry.

## 6. Deploy the web app (~10 min)

The build is a static site (`npm run build` → `dist/`). Vercel is the easy
path: import the GitHub repo, framework = Vite, add the three `VITE_*` env
vars. Then add the production URL to Supabase's auth redirect allowlist
(step 3) — Google sign-in will loop back to localhost otherwise.

## 7. Verify end-to-end

1. `npm run dev` with no `.env` → app works exactly as before (local mode).
2. With `.env`: create a throwaway account (email/password) → profile row
   appears in Table Editor; sample data triggers the "save to account?"
   dialog; accept → `user_slices` rows appear.
3. Sign in with Google as the admin email → **Admin** appears in the nav.
4. Second browser, same account → data follows; edit a budget on one,
   **Account → Sync now** on the other → change arrives.
5. Import tab → Connect a bank (mock or sandbox) → transactions land;
   in Table Editor confirm `plaid_items.access_token_enc` is gibberish
   (encrypted), not a `access-...` plaintext token.
6. Click around, finish a quiz → events show in Admin → Activity within ~10s.
7. Settings → Help & support → file a ticket from the throwaway account;
   answer it from the admin account; reply appears for the user.
8. Prove the token table is sealed off from browsers:

   ```bash
   curl 'https://<project-ref>.supabase.co/rest/v1/plaid_items?select=*' \
     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
   # → []   (deny-all RLS: no client can read it, only the Edge Function)
   ```

## Costs

Supabase free tier (500MB DB, 50k MAU auth), Sentry free tier (5k errors/mo),
Plaid sandbox free; Plaid production is pay-per-connection (~$0.30–1.50/mo
per linked account depending on products) — sandbox until launch.
