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
  Since the July 2026 workspace split, `StoreProvider` is re-exported from
  `../packages/core/store` (the store moved to `@moneyquiz/core`); the
  components' own `@moneyquiz/core/...` imports resolve through the root
  `node_modules` workspace symlink, which esbuild follows to real source —
  no config change was needed beyond that one entry line.
- **`bundle.mjs` fork** (`.design-sync/overrides/bundle.mjs`) adds esbuild
  `jsx:'automatic'`. The components use the automatic JSX runtime (no
  `import React`), but root `tsconfig.json` is solution-style (references, no
  `compilerOptions.jsx`), so esbuild's per-file tsconfig discovery defaults to
  the classic transform → "React is not defined" → blank previews. No cfg knob
  exists for esbuild jsx mode, hence the fork. It changes ONLY the transform,
  not the output contract (IIFE/header/globals unchanged). Rebased onto the
  upstream lib/bundle.mjs in Oct 2026 (upstream had gained jsx/jsxs key
  handling, an export-evidence pass and an `import.meta` define): the jsx
  option now sits in `sharedBuildOptions` so both esbuild passes agree, and
  its one sibling import points at `../../.ds-sync/lib/common.mjs`.
- **Config lives at `.design-sync/config.json`** (moved from the root
  `design-sync.config.json` in Oct 2026, when the skill changed its home).
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
  `url()`/`@import`). The converter ships it as `_ds_bundle.css`, which
  `styles.css` imports (the bundle JS itself imports no CSS).
- **Fonts:** self-hosted variable fonts since the Manna Money redesign
  (Jul 2026): Fraunces (display serif, `font-display`) + Inter (body), plus
  Nunito (`font-rounded`, Sep 2026; since Oct 2026 the headings of every
  tracked card and the ProgressWidget/DailyQuestionCard game text), served
  from `/fonts/*.woff2` via `@font-face` in `src/index.css`. Those
  root-absolute `url()`s don't resolve for the converter, so since Oct 2026
  **`.design-sync/fonts.css`** (wired via `cfg.extraFonts`) repeats the four
  faces with relative urls into `public/fonts/`; the converter copies the
  woff2s into `fonts/` and rewrites `_ds_bundle.css`'s faces to them, so the
  previews and every design render in the real brand fonts. Before that the
  previews fell back to system fonts. Emojis render via system emoji fonts.
- **Theme tokens:** the compiled `app.css` now carries the Manna Money
  `@theme` palette (linen/forest/honey/cream utilities + `--chart-*` vars).
  Components no longer use slate/emerald/amber/bg-white utilities — if a
  preview renders unstyled after edits, the frozen `app.css` is stale
  (regenerate per below).

- **Shared utilities and motion (Oct 2026):** tracked components now use
  the custom Tailwind utilities `card` and `btn-*` (defined with `@utility`
  in `src/index.css`) and the game-moment keyframes in `src/celebrate.css`
  (`answer-pop`, `flame-grow`, `level-pop`, `xp-tick`…). Both reach the
  previews only through the frozen `app.css`, so regenerate it after
  touching either file. `celebrate.css` is imported by `index.css`, never by
  a component, so the bundle stays free of CSS imports.
  `DailyQuestionCard` imports `src/lib/sound.ts`; it does nothing at import
  time (no AudioContext until a sound plays), so previews stay inert.
- **Omer (Oct 2026)** is tracked too. Still (`motion="still"`), his drawing
  is a string from core `lib/omer.ts` shown as an `<img>` with a `data:` URL,
  so the bundle needs no assets. Moving (the default `motion="move"`), he's
  an inline `<svg>` whose parts are played by script (Web Animations, from
  core `lib/omerMotion.ts`); only his pop-in (`omer-in`) is a class in
  `celebrate.css`, reaching the previews through the frozen `app.css`. The
  pop-in starts at opacity 0, so the previews pass `motion="still"`, which
  shows the plain `<img>` on the first frame.

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
- **`.design-sync/fonts.css` mirrors the `@font-face` block in
  `src/index.css`.** A new weight, family or renamed woff2 there needs the
  same change here, or that face falls back to system fonts again.
  `fonts/fonts.css` in the bundle still lists the four dead `/fonts/...` faces
  ahead of the working ones (the converter keeps them); later faces win, so
  they're harmless, but don't read them as the live ones.
- **Preview dates must be relative to `new Date()`.** The capture harness
  pins the clock to 2024-05-15 (`page.clock.setFixedTime` in
  package-capture.mjs) while the DS pane uses the real date, so a hardcoded
  date is wrong in at least one of them. TrendsCard went blank this way
  (fixed May 2026 data); its preview now builds its months from today, and
  its header reads "Apr 2024" in the review sheets — expected.
- **`.design-sync/conventions.md`** (the README header the design agent
  reads, via `readmeHeader`) names real classes from the frozen build. When
  the palette, the `card`/`btn-*` utilities or a tracked component's props
  change, re-validate its names against `ds-bundle/_ds_bundle.css`.

## Known render warns

- `[TOKENS_MISSING]` (~18 vars: `--drift`, `--spin`, `--ring-from`,
  `--ring-to`, `--dx`, `--from`, `--s`, `--a`, …) — set inline by components
  at runtime (Confetti, QuizView, StreakOverlay, landing mocks). Expected.
- `[FONT_MISSING] "SF Pro Rounded"` — an OS fallback in `--font-rounded`
  after Nunito (which ships), so it's never reached; Apple's license doesn't
  allow shipping it.

## Sync gotchas worth knowing

- **Chart previews fast-forward requestAnimationFrame.** `CategoryDonut` and
  `MonthlyTrend` previews monkeypatch `window.requestAnimationFrame` to inflate
  the timestamp so recharts' (react-smooth) entry animation reads as fully
  elapsed on its second frame — otherwise the static screenshot catches the
  chart mid-tween (empty/collapsed). Don't remove that block.
- **TrendsCard renders nothing when there are no trends.** Its data is
  anchored to **prevMonth** (the month before today) vs the 3 months before
  that — `spendingTrends` compares `prevMonthKey`, not the current month — and
  the component returns null with no moves. The "per-cell capture flakes
  blank" note from earlier syncs was really this: the preview's fixed dates
  had aged out of the window (see Re-sync risks on the pinned capture clock).
- **Store seeding for gamification.** `ProgressWidget`/`ProgressChip` previews
  seed `localStorage['moneyquiz.game.v1']` before the StoreProvider mounts to
  show a populated Level 4 / 12-day-streak state. If the storage key or
  GameState shape changes, update those previews. Since Oct 2026 the
  widgets show the *live* streak (core `lib/streak.ts`): it reads 0 unless
  `lastActiveDay` is today or yesterday on the viewer's local clock, so the
  previews seed the local date, not the UTC one. Only answering the question
  of the day counts a day now, so `DailyQuestionCard`'s preview seeds a
  12-day streak last counted *yesterday* (the morning state: live streak,
  grey flame until today's answer).
