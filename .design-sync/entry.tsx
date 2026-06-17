// design-sync bundle entry — a SYNC INPUT, not application code.
//
// This app has no library `dist/` entry that exports components, so the
// converter would otherwise synthesize one by `export *`-ing every file under
// src/ — which would pull in main.tsx's top-level `createRoot().render()` and
// blow up the bundle IIFE. Instead we hand the converter this curated entry
// (passed via `--entry`) that re-exports ONLY the scoped UI components plus
// StoreProvider (wired as cfg.provider so store-backed widgets render).
//
// Keep this list in sync with `componentSrcMap` in design-sync.config.json.

export { StoreProvider } from '../src/store'

export { StatCard } from '../src/components/StatCard'
export { EmptyState } from '../src/components/EmptyState'
export { SortHeader } from '../src/components/SortHeader'
export { VerseOfDay } from '../src/components/VerseOfDay'
export { BadgesCard } from '../src/components/BadgesCard'
export { ProgressWidget, ProgressChip } from '../src/components/ProgressWidget'
export { CategoryDonut } from '../src/components/charts/CategoryDonut'
export { MonthlyTrend } from '../src/components/charts/MonthlyTrend'
export { TopMerchantsCard } from '../src/components/TopMerchantsCard'
export { TrendsCard } from '../src/components/TrendsCard'
export { SpendingHabitsCard } from '../src/components/SpendingHabitsCard'
export { DailyQuestionCard } from '../src/components/DailyQuestionCard'
