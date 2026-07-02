/**
 * @moneyquiz/core — the platform-neutral brains shared by the web app and the
 * mobile app: the store, the domain types, the lib/ math & logic modules, and
 * the sample/verse/question data. Ships as TypeScript source (main/types point
 * here); consumers deep-import what they need, e.g.
 * `@moneyquiz/core/lib/analysis` or `@moneyquiz/core/store`.
 *
 * Keep this package free of DOM, localStorage, and import.meta.env — platform
 * needs go through the seams: setStorageBackend (lib/storage), configureApi
 * (lib/api), setThemeAdapter (lib/themeAdapter).
 */
export { StoreProvider, useStore } from './store'
export * from './types'
