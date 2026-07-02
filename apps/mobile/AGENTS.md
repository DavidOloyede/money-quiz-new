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
- The dev API base URL defaults to `http://localhost:8787/api` (Simulator
  reaches the Mac's localhost). Physical devices need
  `EXPO_PUBLIC_API_URL` pointed at the Mac's LAN address.
- `npx expo install --check` flags react (e.g. 19.2.7 vs the SDK's pinned
  19.2.3). That's deliberate: react is `^19.2.3` here so the whole workspace
  shares ONE hoisted copy with the web app and core. "Fixing" it to the exact
  pin nests a second react under apps/mobile and breaks hooks at runtime.
