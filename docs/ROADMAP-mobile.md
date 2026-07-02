# Mobile app roadmap (Phase 2 — after the backend ships)

**Decided stack: React Native + Expo, iOS first.** One language (TypeScript),
one developer, App Store presence, and Android nearly free later. Native
Swift was considered and rejected: it would mean rewriting ~4,000 lines of
working, tested business logic and maintaining two codebases.

## Why the backend already fits

- **The mobile app calls the same Node `/api` endpoints** — they're a plain
  HTTPS JSON API, so sync, Plaid, tickets, events, and admin carry over with no
  server changes. `src/lib/api.ts` is platform-neutral: mobile calls
  `configureApi({ baseUrl, getToken, cloudEnabled })` at startup (web does the
  same in `src/lib/configure.ts`).
- **supabase-js runs in React Native** for login (session storage via the same
  MMKV adapter); it hands the app a JWT that the Node API already knows how to
  verify. `react-native-plaid-link-sdk` drives the Link UI against the same
  `/api/plaid/*` routes.
- **The sync schema is storage-agnostic**: `user_slices` rows are keyed by the
  same `moneyquiz.*` strings; on mobile, MMKV stands in for localStorage and
  the same pull/push logic applies.
- **Per-user authorization lives in the Node server** (every query scoped to
  the JWT user), so a second client adds no new security surface.

## The code-sharing rule (applies NOW — seams landed July 2026)

The platform-neutral code lives in `packages/core` (`@moneyquiz/core`) and
must stay free of DOM, localStorage, and `import.meta.env`. The five web-only
lib files stay in `src/lib/` and must never be imported from core:
`supabase.ts` (browser auth client), `track.ts` (browser analytics + pagehide
wiring), `exportData.ts` (download-a-file DOM APIs), `plaidLink.ts` (Plaid's
script-tag Link loader), and `configure.ts` (Vite env + Supabase wiring for
the API client).

How core stays neutral:

- **`storage.ts`** talks to an injectable `KVBackend`
  (`getItem`/`setItem`/`removeItem`), auto-detecting `localStorage` when none
  is registered — the web app registers nothing. Reads are **synchronous** and
  `store.tsx` depends on that in its `useState` initializers, so the mobile
  backend is **MMKV (sync), never AsyncStorage**. `setStorageBackend()` is the
  install point.
- **`api.ts`** carries no `import.meta.env` (fatal under Metro) and no
  Supabase import. Platforms wire it via
  `configureApi({ baseUrl, getToken, cloudEnabled })`; unconfigured it is
  safely local-only. Cloud checks go through `isCloudEnabled()`.
- **`store.tsx`** reaches the platform through two seams only: the storage
  backend above and a `ThemeAdapter` (`systemTheme()`/`apply()` in
  `themeAdapter.ts`) whose default is the guarded browser behavior — mobile
  installs an `Appearance`-based one.
- **`cloudSync.ts`** is shared as-is: it writes pulled slices through
  storage.ts's raw setters and guards its pagehide/visibility wiring with
  `typeof document` checks (React Native aliases `window` but has no
  `document`). Mobile replaces those tab-lifecycle flushes with AppState.
- **`newId()` lives in `id.ts`**, not storage — pure modules (`quiz.ts`,
  `importCsv.ts`, `sampleData.ts`) mint ids without touching persistence.
- `dailyQuestion.ts` imports storage deliberately (it persists the day's
  question); that's fine now that storage is platform-neutral.

## Build order when Phase 2 starts

1. ✅ **Workspace split** (July 2026) — npm workspaces with the shared brains
   in `packages/core` (`@moneyquiz/core`: store, types, data, the neutral
   lib/). The web app deliberately **stays at the repo root** rather than
   moving to `apps/web`: relocating `src/` would break ~20 path-sensitive
   design-sync artifacts and the server's static-serve path, and root-as-web
   achieves the same goal. `apps/mobile` joins in step 2; `server/` is a
   workspace too. Theme tokens live in `packages/core/theme.ts` — the web's
   `src/theme.css` is generated from it (`npm run gen:theme`); mobile imports
   `themeTokens` directly.
2. **Expo scaffold** — `npx create-expo-app`, TypeScript template, Expo Router,
   dark/light theme tokens matching the web palette.
3. **Auth screens** — sign in / sign up (email + Google via
   `expo-auth-session`), profile, sign out.
4. **Sync** — port `cloudSync` with injected storage; same slice keys.
5. **Core screens, in order of mobile value**: Daily Question + streak (the
   habit loop), Quiz, Dashboard (cards first, charts via `victory-native`),
   Import (Plaid connect; CSV is desktop-first), Settings/Support.
6. **Push notifications** (Expo Notifications) — daily-question reminder;
   this is the retention feature the web app can't do.
7. **TestFlight** → App Store review (finance apps get extra scrutiny: have a
   privacy policy URL and demo-mode reviewer account ready).

## Deliberate deferrals

- Realtime sync (e.g. a WebSocket/SSE channel from the Node API, or Postgres
  `LISTEN/NOTIFY`) — "Sync now" is enough until two-device usage is common.
- Relational `transactions` table — only needed when server-side features
  (cross-device dedupe, server notifications on new transactions) arrive.
- Android release — after iOS is stable; the codebase will already run there.
