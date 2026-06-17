# design-sync notes — money-quiz

Repo-specific gotchas for syncing this design system to claude.ai/design.
Project: **Money Quiz UI** (`fdddcc8a-5713-4ba5-a334-e361bcdb23f0`).

## What this repo is

A **Vite + React 19 application**, not a component-library package. There is no
`dist/` library entry and no `.d.ts` tree. The sync scopes the clean,
presentational dashboard UI (cards, widgets, charts, empty state) — full
app-screen views (`Dashboard`, `AdminView`, `ImportView`, modals, `Nav`, etc.)
and infra are intentionally excluded.

## Key mechanics (why the config looks the way it does)

- **Custom entry, not synth `export *`.** `.design-sync/entry.tsx` re-exports
  only the scoped components + `StoreProvider`, passed via `--entry`. Synth mode
  would `export *` every `src/*.tsx` including `main.tsx`, whose top-level
  `createRoot().render()` runs inside the bundle IIFE and breaks everything.
  **Keep `entry.tsx` and `componentSrcMap` in sync** when adding components.
- **`bundle.mjs` fork** (`.design-sync/overrides/bundle.mjs`) adds esbuild
  `jsx:'automatic'`. The components use the automatic JSX runtime (no
  `import React`), but root `tsconfig.json` is solution-style (references, no
  `compilerOptions.jsx`), so esbuild's per-file tsconfig discovery defaults to
  the classic transform → "React is not defined" → blank previews. No cfg knob
  exists for esbuild jsx mode, hence the fork. It changes ONLY the transform,
  not the output contract (IIFE/header/globals unchanged).
- **Root `index.d.ts` is a load-bearing manifest, not app code.** With no build,
  the converter reads the bundle's export list from `<repo>/index.d.ts` (the
  entry it resolves when package.json has no `types`). It declares the 13
  components + `StoreProvider` so the `exported` set is populated — without it,
  `exported` is empty and the converter WON'T wrap previews in `StoreProvider`
  (store-backed widgets render blank) and warns `[PROVIDER_UNEXPORTED]`. It's
  inert for the app (no tsconfig `include` covers it; Vite/esbuild ignore it).
  Don't delete it; keep its list in sync with `componentSrcMap`/`entry.tsx`.
- **No `.d.ts` → hand-written `dtsPropsFor`.** With no `.d.ts` tree, the
  converter's prop extractor returns null for every component. `dtsPropsFor`
  carries accurate, self-contained prop bodies (data shapes inlined, e.g.
  `Transaction`/`CategoryTotal`/`MonthlyPoint`/`RecurringPayment`, so the
  contract needs no imports). Update these if a component's props change.
- **`provider: StoreProvider`.** `ProgressWidget`, `ProgressChip`,
  `TopMerchantsCard`, `DailyQuestionCard` read the app store. `StoreProvider`
  initializes from localStorage with sane defaults and has no blocking network
  on mount (its mount effects are state updaters + localStorage + theme class).
- **CSS** ships from `.design-sync/app.css`, a committed copy of the app's
  compiled Tailwind output (`dist/assets/index--*.css`). It's the full
  Tailwind build (all utilities the app uses), self-contained (no external
  `url()`/`@import`). The bundle has no CSS of its own (Tailwind classes aren't
  CSS imports), so `_ds_bundle.css` is empty by design.
- **Fonts:** none. The app uses the system font stack; emojis render via system
  emoji fonts. No `@font-face` to ship.

## Re-sync risks (what can silently go stale)

- **`.design-sync/app.css` is a frozen copy.** If components start using
  Tailwind utility classes the app didn't already use elsewhere, those classes
  won't be in `app.css` and will render unstyled. Regenerate on re-sync:
  `npm run build` then `cp dist/assets/index-*.css .design-sync/app.css` (pick
  the largest `.css`). The dist filename hash changes each build — re-point/copy.
- **`dtsPropsFor` is hand-maintained** — it does not track source prop changes.
  If a component's real props drift, update the body here.
- **`entry.tsx` ↔ `componentSrcMap` drift** — adding a component requires both.
- **recharts charts** (`CategoryDonut`, `MonthlyTrend`) use
  `ResponsiveContainer`, which needs a sized parent in headless render. Their
  preview wrappers set an explicit width/height; if a chart card renders blank,
  check the wrapper size first (not the data).
- The `bundle.mjs` fork is pinned to the converter's bundle.mjs as of this sync
  — diff it against the bundled lib on re-sync and fold in upstream changes.

## Sync gotchas worth knowing

- **Chart previews fast-forward requestAnimationFrame.** `CategoryDonut` and
  `MonthlyTrend` previews monkeypatch `window.requestAnimationFrame` to inflate
  the timestamp so recharts' (react-smooth) entry animation reads as fully
  elapsed on its second frame — otherwise the static screenshot catches the
  chart mid-tween (empty/collapsed). Don't remove that block.
- **TrendsCard per-cell capture flakes blank.** Its `?story=Default` capture can
  screenshot blank even though the component renders fine (confirmed via the
  full-html render-check: "Trends & anomalies / May vs prior months / up+down
  rows"). Grade it from `ds-bundle/_screenshots/general__TrendsCard.png`, not the
  per-cell review sheet. Its data is anchored to **prevMonth** (the month before
  today) vs the 3 months before that — `spendingTrends` compares `prevMonthKey`,
  not the current month.
- **Store seeding for gamification.** `ProgressWidget`/`ProgressChip` previews
  seed `localStorage['moneyquiz.game.v1']` before the StoreProvider mounts to
  show a populated Level 4 / 12-day-streak state. If the storage key or
  GameState shape changes, update those two previews.
