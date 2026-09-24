# Manna Money mobile (Expo SDK 57)

Expo changes fast — check the versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before using an API from memory.
Repo-wide rules live in the root CLAUDE.md; these are the mobile-specific ones:

- `src/lib/platform.ts` must stay the **first import** in `src/app/_layout.tsx`
  — it installs the core seams (MMKV storage backend, Appearance theme
  adapter, `configureApi`) before anything touches the store or API client.
- Storage is **MMKV, never AsyncStorage**: core's `storage.ts` reads are
  synchronous by contract (store.tsx hydrates `useState` initializers from
  them).
- Theme values come from `src/theme.ts`, which derives everything from
  `@moneyquiz/core/theme` — same tokens as the web. Don't hardcode hex here
  either.
- Fonts are static instances generated from the web's variable fonts by
  `scripts/gen-mobile-fonts.py` (repo root). Use one `fontFamily` name per
  weight (`fonts.sansMedium`, not `fontWeight`); regenerate rather than
  editing the .ttf files.
- `react-native-mmkv` is a native module: after adding/upgrading native deps,
  rebuild the dev client (`npx expo run:ios`) — Expo Go can't run this app.
- **Pin new Expo modules to the SDK's own version.** `npx expo install`
  picks the newest 57.0.x of a module, which can need a newer
  `expo-modules-core` than the installed `expo` (57.0.1) carries: the app then
  dies at launch with a dyld "Symbol not found" in that module's framework
  (it happened with expo-file-system 57.0.7). Pin to the version `expo`
  itself depends on (see node_modules/expo/package.json), and restore
  package-lock.json first if an install already hoisted a newer copy, so
  there's exactly one of each module (`npm ls <module>`).
- The dev API base URL defaults to `http://localhost:8787/api` (Simulator
  reaches the Mac's localhost). Physical devices need
  `EXPO_PUBLIC_API_URL` pointed at the Mac's LAN address.
- **Accounts** need `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same values as the web's `VITE_SUPABASE_*`);
  put them in `apps/mobile/.env.local` (gitignored). Without them the app runs
  fully local — every cloud surface hides itself, same as the web. Auth is a
  mobile-own client + provider (`lib/supabase.ts`, `lib/auth.tsx`) — don't
  import the web `src/auth.tsx`; they share only the `Profile` type via core.
  Supabase's session lives in the one shared MMKV store (`lib/mmkv.ts`), and
  `platform.ts` hands the API client that session's JWT via `getToken`.
  Google sign-in redirects to `mannamoney://auth`, which must be in the
  Supabase project's redirect allow-list (a dashboard step).
- **Never call `supabase.auth.getSession()` on a hot path** (e.g. per API
  request): it serializes on an internal lock that can deadlock under React
  Native's concurrent auth traffic — a sign-in event racing the sync pull it
  triggers wedges both. `platform.ts` caches the access token from
  `onAuthStateChange`; read that instead.
- Sync lives in `lib/sync.tsx` (`SyncProvider` above the store, `SyncDialogs`
  inside it — one `Modal` hosts overlay + prompts because iOS won't present
  two at once). The store remounts via the epoch key on the account boundary;
  backgrounding the app flushes pending pushes (the phone's version of the
  web's tab-hide flush).
- `npx expo install --check` flags react (e.g. 19.2.7 vs the SDK's pinned
  19.2.3). That's deliberate: react is `^19.2.3` here so the whole workspace
  shares ONE hoisted copy with the web app and core. "Fixing" it to the exact
  pin nests a second react under apps/mobile and breaks hooks at runtime.
- **Screens & UI kit (Phase H):** tabs live in `src/app/(tabs)/` (Today, Quiz,
  Dashboard, Import, Settings); build new UI from `src/components/ui.tsx`
  (Screen/Card/Button/Segmented/Bar/Empty/Note/StatusLine) instead of ad-hoc
  styles, and take state colors (success/danger/info/soft washes) from the
  theme — no hex in components. Type follows docs/DESIGN.md: `fonts.rounded*`
  (Nunito) for titles, buttons and game text, `fonts.sans*` (Inter) with
  `fontVariant: ['tabular-nums']` for money, Fraunces only for scripture.
  Charts are deliberately View-based bars; don't add a chart lib without
  David. `react-native-svg` is installed (Sep 2026) for company logos and
  the Manna mark only, not as a license for SVG charts.
- **Editing on the phone (Sep 2026):** everyday edits only (per-row category,
  rename, ★, budgets, giving goal, confirm paid-off debt), through the same
  store actions as the web, and the similar-charge offers come from core
  (`renameCandidates`, `categoryCandidates`). Transfer review, links,
  treatments, bulk edits and category rules stay on the web. A sheet opened
  from inside another sheet must render as that sheet's child (TxListModal
  takes `children`): iOS won't present two sibling modals.
- **Full-page screens** (All merchants, All transactions, Year Sheet,
  Account) are stack routes in `src/app/` that set their own header with
  `<Stack.Screen options={{ headerShown: true, ... }} />`; the welcome screen
  is the one headerless route, reached by a `<Redirect>` in the tabs layout.
- **Plaid on the phone:** `react-native-plaid-link-sdk` v13 API is
  `createPlaidLinkSession({ token, onSuccess, onExit, onEvent })` then
  `session.open()` — the older `create`/`open` pair from v11/12 docs doesn't
  exist here. Native module: adding/upgrading it (or expo-notifications)
  needs a dev-client rebuild (`npx expo run:ios`).
- **Daily reminder is LOCAL-only** (`lib/reminder.ts`): expo-notifications
  DAILY calendar trigger, preference under the mobile-only MMKV key
  `moneyquiz.mobile.reminder.v1` (device-specific — keep it out of the synced
  slices and STORAGE_KEYS). The root layout re-asserts the schedule on
  launch. Don't introduce remote push/APNs for it.
- **Sim permission dialogs can't be tapped** — `applesimutils` (installed via
  `brew tap wix/brew`) pre-grants them instead, e.g.
  `applesimutils --booted --bundle com.mannamoney.app --setPermissions
  notifications=YES`. Combined with the `--initialUrl` launch trick and temp
  harness effects, that's the whole sim-verification toolkit.
