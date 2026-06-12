# Mobile app roadmap (Phase 2 — after the backend ships)

**Decided stack: React Native + Expo, iOS first.** One language (TypeScript),
one developer, App Store presence, and Android nearly free later. Native
Swift was considered and rejected: it would mean rewriting ~4,000 lines of
working, tested business logic and maintaining two codebases.

## Why the backend already fits

- **supabase-js runs in React Native** (session storage via AsyncStorage), so
  auth, sync, tickets, and events carry over unchanged.
- **The Plaid Edge Function is a plain HTTPS API** — the app uses
  `react-native-plaid-link-sdk` for the Link UI and the same
  `/functions/v1/plaid` endpoints.
- **The sync schema is storage-agnostic**: `user_slices` rows are keyed by the
  same `moneyquiz.*` strings; on mobile, MMKV/AsyncStorage stands in for
  localStorage and the same pull/push logic applies.
- **Row-level security is in the database**, so a second client adds no new
  security surface.

## The code-sharing rule (applies NOW)

Keep `src/lib/` free of DOM and localStorage imports. Today the only
browser-touching lib files are `storage.ts`, `plaid.ts`, `exportData.ts`,
`cloudSync.ts`, and `track.ts` — everything else (`quiz.ts`, `analysis.ts`,
`categorize.ts`, `gamification.ts`, `badges.ts`, `giving.ts`, `debt.ts`,
`merchant.ts`, `parse.ts`, `format.ts`, `yearly.ts`) is pure TypeScript that
will run as-is on the phone.

## Build order when Phase 2 starts

1. **Workspace split** — lift `src/lib/` + `src/types.ts` + `src/data/` into a
   shared package (`packages/core`); web app imports from it; verify tests
   still pass.
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

- Realtime sync (Supabase Realtime on `user_slices`) — "Sync now" is enough
  until two-device usage is common.
- Relational `transactions` table — only needed when server-side features
  (cross-device dedupe, server notifications on new transactions) arrive.
- Android release — after iOS is stable; the codebase will already run there.
