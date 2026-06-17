// Design-system public surface for claude.ai/design (see /design-sync).
//
// This app has no library build, so there's no generated .d.ts for the
// design-sync converter to read the bundle's export list from. This manifest
// declares the components synced as the "Money Quiz UI" design system (plus the
// StoreProvider that wraps the store-backed ones) so the converter knows what
// the bundle exports. It is INERT for the app: no tsconfig `include` covers it,
// Vite never imports it, and esbuild ignores .d.ts when bundling.
//
// The real per-component prop contracts are emitted from `dtsPropsFor` in
// design-sync.config.json — these `any` params are just placeholders so the
// export surface parses. Keep this list in sync with `componentSrcMap`.

export declare function StoreProvider(props: any): any;

export declare function StatCard(props: any): any;
export declare function EmptyState(props: any): any;
export declare function SortHeader(props: any): any;
export declare function VerseOfDay(props: any): any;
export declare function BadgesCard(props: any): any;
export declare function ProgressWidget(props: any): any;
export declare function ProgressChip(props: any): any;
export declare function CategoryDonut(props: any): any;
export declare function MonthlyTrend(props: any): any;
export declare function TopMerchantsCard(props: any): any;
export declare function TrendsCard(props: any): any;
export declare function SpendingHabitsCard(props: any): any;
export declare function DailyQuestionCard(props: any): any;
