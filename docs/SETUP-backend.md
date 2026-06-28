# Backend setup — Node.js API, Postgres, accounts, Plaid

The app has two parts: the **React frontend** and a **Node.js (Fastify) API
server** in [`server/`](../server) that owns all data (sync, Plaid, tickets,
admin, events) in **PostgreSQL**. Login is handled by **Supabase Auth** (Google
+ email/password); the API just verifies the tokens it issues.

Signed out, the app works with **zero setup** (localStorage only). This guide
turns on accounts, cross-device sync, bank connections, logging, and support
tickets. Budget ~45 minutes.

## 1. Install (~2 min)

```bash
npm install            # frontend
npm install --prefix server   # API server
```

## 2. A PostgreSQL database (~5 min)

Any Postgres works. Easiest is a free **Supabase** project (you'll use it for
auth in step 3 anyway) — but the API talks to it as plain Postgres.

1. [supabase.com](https://supabase.com) → New project (US region, free tier).
2. Settings → Database → **Connection string** → copy the **Transaction pooler**
   URI. That's `DATABASE_URL`.

## 3. Supabase Auth (~10 min)

Login lives in the browser via supabase-js; the Node API verifies the JWTs.

1. Settings → API → copy **Project URL** and the **anon public** key.
2. Authentication → Providers → enable **Email** (turn off "Confirm email" for
   quick testing; re-enable before launch).
3. **Google**: in [Google Cloud Console](https://console.cloud.google.com)
   create an OAuth client (Web), redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`; paste the client
   id/secret into Supabase → Authentication → Providers → Google.
4. Authentication → URL Configuration → add `http://localhost:5173` (and your
   prod URL later) to the redirect allowlist.

> **JWT verification:** the server verifies tokens via the project JWKS
> (`SUPABASE_URL`) and/or the legacy HS256 secret (`SUPABASE_JWT_SECRET`,
> Settings → API → JWT Secret). Setting `SUPABASE_URL` is enough for projects
> on asymmetric keys; set the secret too if yours is older.

## 4. Configure the two env files (~5 min)

**Frontend** — copy `.env.example` → `.env`:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SENTRY_DSN=            # optional
```

**Server** — copy `server/.env.example` → `server/.env`:
```
DATABASE_URL=<the pooler connection string from step 2>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_JWT_SECRET=        # only if your project uses the legacy HS256 secret
ADMIN_EMAIL=doloyede00@gmail.com
PLAID_TOKEN_KEY=            # see step 6 (any 32-byte base64 value to start)
PORT=8787
```

## 5. Create the database tables (~2 min)

Drizzle owns the schema (`server/src/db/schema.ts`):

```bash
npm run db:migrate     # applies server/drizzle/*.sql to DATABASE_URL
# npm run db:studio    # optional: browse the tables in a GUI
```

## 6. Plaid (~10 min, optional)

Without Plaid keys the API runs in **mock mode** (realistic fake transactions),
so you can try connect → import for free. For real/sandbox banks, add to
`server/.env`:

```
PLAID_CLIENT_ID=...        # dashboard.plaid.com → Team settings → Keys
PLAID_SECRET=...
PLAID_ENV=sandbox
PLAID_TOKEN_KEY=$(openssl rand -base64 32)   # encrypts access tokens at rest
```

Sandbox Plaid Link login: `user_good` / `pass_good`.

## 7. Run it

```bash
npm run dev:all        # frontend (5173) + API (8787) together
# or two terminals: `npm run dev` and `npm run server`
```

The Vite dev server proxies `/api` → the Node server, so the browser uses
same-origin `/api` paths.

## 8. Verify end-to-end

1. `npm run dev` alone with no env → app works fully local (regression gate).
2. `npm run dev:all`; `curl localhost:8787/api/plaid/health` → `{mode,env}`.
3. Sign up (email/pw) in the Account tab → a row appears in `profiles`
   (Drizzle Studio / psql); sample data triggers the "save to account?" dialog;
   accept → `user_slices` rows appear.
4. Sign in with Google as `doloyede00@gmail.com` → **Admin** appears in nav
   (`GET /api/me` returns role `admin`).
5. Two browsers, same account: edit a budget in A, **Account → Sync now** in B
   → the change arrives.
6. Connect a bank (mock, or Plaid sandbox) → `plaid_items.access_token_enc` is
   ciphertext, not a plaintext `access-...` token; transactions import.
7. Click around / finish a quiz → events show in **Admin → Activity** within
   ~10s.
8. File a ticket as a normal user; answer it as admin; the user sees the reply.
   Confirm a normal user can't read another's data: `GET /api/admin/users`
   with a non-admin token → `403`; `GET /api/tickets/<someone-elses-id>/messages`
   → `404`.

## 9. Deploy

- **One service (simplest):** `npm run build`, then run the Node server with
  `SERVE_STATIC=true` — it serves `dist/` and `/api` together (host on Render,
  Railway, Fly, a VM…). Set the server `.env` vars in the host's dashboard.
- **Split:** static frontend on Vercel/Netlify + Node API elsewhere; set
  `VITE_API_URL` to the API origin and the server's `CORS_ORIGINS` to the
  frontend origin.
- Add the production URL to Supabase's auth redirect allowlist (step 3).

## Costs

Supabase free tier (Postgres + 50k MAU auth), Sentry free tier, Plaid sandbox
free; a small Node host is ~$0–7/mo. Plaid production is pay-per-connection —
sandbox until launch.
