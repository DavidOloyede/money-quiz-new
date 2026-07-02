# CLAUDE.md — how to work on this repo

This file is "how to work on it." For "how the app works," read
[ARCHITECTURE.md](ARCHITECTURE.md) — it's deliberately written in plain
language for a non-technical reader, and it must stay that way. When you
change how something works, update ARCHITECTURE.md in that same voice (no
jargon), not just when you add something new.

**Product name:** the app is **Manna Money** (renamed from "Money Quiz" in
July 2026). The rename is user-facing only — package names, the `moneyquiz.*`
localStorage keys, and the design-sync project identifiers deliberately keep
the old name. Never rename storage keys: they key `user_slices` rows in the
cloud, so a rename orphans every user's synced data.

## Commands

```bash
npm run dev        # web app only (fully local, no backend needed)
npm run dev:all    # web + API together (accounts/sync/Plaid/admin)
npm test           # vitest — the lib/ math & logic suite; keep it green
npm run lint       # typechecks BOTH the app (tsc -b) and server/
npm run build      # typecheck + production build into dist/
```

The server is a separate package in `server/` (no workspaces yet); root
scripts drive it via `npm --prefix server`. Backend setup lives in
[docs/SETUP-backend.md](docs/SETUP-backend.md).

## Code style & conventions

- Strict TypeScript everywhere; `npm run lint` must pass before a commit.
- Comments explain *why* or a non-obvious constraint, never *what the next
  line does*. Every lib file and non-trivial component opens with a short
  doc comment saying what it's for — keep that up.
- UI copy is warm and encouraging, faith-informed but never preachy — see the
  existing quiz takeaways, badge names, and empty states for the register.
  Not generic fintech ("Maximize your portfolio"), not sermonizing.
- Styling is **Tailwind CSS v4 only** (no CSS-in-JS, no other frameworks —
  flag it to David before introducing anything). Theme tokens live in the
  `@theme` block in `src/index.css`; use tokens/utilities, not hardcoded hex
  in components. Dark mode is class-based (`.dark` on `<html>`, toggled by
  the store).

## Testing conventions

- Tests live next to the code (`src/**/*.test.ts`, Vitest). Coverage is
  deliberately concentrated on `src/lib/` — the math/sorting brains — so the
  numbers can't silently break. Components are verified by running the app.
- When you touch a lib file, extend its test file in the same change.
- Run `npm test` at every meaningful checkpoint; run `npm run build` before
  calling a workstream done. There are currently **no server tests** — if you
  add server logic, say so in your handoff notes.
- Full end-to-end checks at phase boundaries: the checklist in
  docs/SETUP-backend.md §8 is the canonical one for backend features.

## The design-sync pipeline (read before touching tracked components)

13 components + StoreProvider are mirrored to claude.ai/design. Read
[.design-sync/NOTES.md](.design-sync/NOTES.md) in full before touching any of
them — the pipeline breaks silently. The contract:

- These four move **together**: `.design-sync/entry.tsx`, `componentSrcMap`
  in `design-sync.config.json`, root `index.d.ts`, and `dtsPropsFor` (also in
  the config). Add/rename/remove a tracked component → update all four in the
  same commit.
- `dtsPropsFor` is hand-maintained. If a tracked component's props change,
  update its entry.
- `.design-sync/app.css` is a **frozen copy** of the compiled Tailwind build.
  After any style/token change that affects tracked components:
  `npm run build && cp dist/assets/index-*.css .design-sync/app.css`
  (pick the largest .css).
- Root `index.d.ts` is a load-bearing manifest, not app code. Don't delete it;
  don't add `types`/`main`/`exports` to the root package.json (the converter
  resolves `index.d.ts` only because those are absent).
- After changes, tell David to re-run the design-sync tool.

## The mobile code-sharing rule (applies to ALL new code, now)

`docs/ROADMAP-mobile.md` is the decided plan (React Native + Expo, iOS first —
don't re-derive it). Everything in `src/lib/` except the web-coupled files
listed there must stay free of DOM/localStorage imports so it can move to a
shared `packages/core`. Known constraints discovered in the July 2026 audit:

- `storage.ts` reads are **synchronous** and `store.tsx` depends on that in
  `useState` initializers → the mobile backend will be MMKV (sync), never
  AsyncStorage. Don't introduce async storage assumptions.
- Don't import `./storage` from otherwise-pure lib files for convenience
  helpers; `newId()` and friends belong in pure modules.
- `import.meta.env` is Vite-only (fatal under Metro) — keep it out of
  anything bound for core; route config through injectable seams.

## Auth / security model (don't weaken it)

- Supabase Auth is **identity only** (Google + email/password); the browser
  gets a JWT; the Fastify server verifies it (`server/src/auth/verify.ts`,
  JWKS-first, HS256 fallback) on **every** request via `requireUser` /
  `requireAdmin` (`server/src/auth/middleware.ts`).
- Authorization lives in the Node routes: every DB query is scoped to the
  JWT's user id. There is deliberately **no route that returns another
  user's `user_slices`** — admins must not be able to read financial data.
  Keep it that way when adding routes.
- Plaid access tokens are AES-256-GCM encrypted at rest
  (`server/src/plaid/crypto.ts`) and must never reach the browser.
- Activity logging (`track.ts`) records event names/counts only — never
  descriptions, merchants, or amounts. Sentry is scrubbed the same way.
- Signed out, the app must work 100% locally — every cloud feature checks
  `cloudEnabled` and hides itself. Don't add hard network dependencies.

## Process

- Work on a feature branch; commit at meaningful checkpoints (one concern per
  commit), not one giant commit. David reviews and pushes/merges himself.
- Keep the living docs current as you work: ARCHITECTURE.md (plain-language,
  when behavior changes), docs/ROADMAP-mobile.md (check off mobile phases),
  and this file (when working practices change).
