# Manna Money — iOS app

The React Native (Expo) app. All the money math, the store, and the theme
tokens come from [`@moneyquiz/core`](../../packages/core) — this workspace is
the native shell around them. See [docs/ROADMAP-mobile.md](../../docs/ROADMAP-mobile.md)
for the build order and [AGENTS.md](AGENTS.md) for the working rules.

```bash
npx expo run:ios     # first run & after native dep changes: builds the dev client
npm start            # afterwards: Metro + Fast Refresh into the installed client
npm run typecheck    # tsc --noEmit (also part of root `npm run lint`)
```

Expo Go won't work — `react-native-mmkv` is a native module, so the app runs
in its own dev client. The API base URL defaults to `http://localhost:8787/api`
(start the backend with `npm run server` from the repo root); set
`EXPO_PUBLIC_API_URL` for a physical device.
