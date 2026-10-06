/**
 * The web app's addresses: which screen lives at which path, and back. A
 * tiny in-house router on the History API (no dependency): App.tsx owns the
 * current route, pushes a new address on navigation and listens for
 * Back/Forward. The production server and Vite's dev server both answer
 * any non-API path with index.html, so every address below loads the app.
 *
 * Web-only (it names browser paths and reads mouse events), so it lives in
 * src/lib, and nothing in packages/core may import it.
 */
import type { MouseEvent } from 'react'

export type View = 'import' | 'dashboard' | 'yearly' | 'quiz' | 'settings' | 'account' | 'admin'
export type AccountMode = 'signin' | 'signup'

export type Route =
  | { kind: 'home' }
  | { kind: 'view'; view: View; mode?: AccountMode }
  | { kind: 'notFound'; path: string }

const VIEW_PATHS: Record<View, string> = {
  dashboard: '/dashboard',
  yearly: '/year',
  quiz: '/quiz',
  import: '/import',
  settings: '/settings',
  account: '/account',
  admin: '/admin',
}

const LABELS: Record<View, string> = {
  dashboard: 'Dashboard',
  yearly: 'Year Sheet',
  quiz: 'Quiz',
  import: 'Import',
  settings: 'Settings',
  account: 'Account',
  admin: 'Admin',
}

/** Other spellings people type or old links might use. */
const ALIASES: Record<string, Route> = {
  '/signin': { kind: 'view', view: 'account', mode: 'signin' },
  '/sign-in': { kind: 'view', view: 'account', mode: 'signin' },
  '/login': { kind: 'view', view: 'account', mode: 'signin' },
  '/signup': { kind: 'view', view: 'account', mode: 'signup' },
  '/sign-up': { kind: 'view', view: 'account', mode: 'signup' },
  '/year-sheet': { kind: 'view', view: 'yearly' },
  '/home': { kind: 'home' },
}

export const BRAND_TITLE = 'Manna Money — Steward Your Daily Bread'

export function viewRoute(view: View, mode?: AccountMode): Route {
  return mode ? { kind: 'view', view, mode } : { kind: 'view', view }
}

/** The address for a screen. Sign-in and sign-up get their own, so they can be linked. */
export function pathFor(route: Route): string {
  if (route.kind === 'home') return '/'
  if (route.kind === 'notFound') return route.path
  if (route.view === 'account' && route.mode) return route.mode === 'signup' ? '/signup' : '/signin'
  return VIEW_PATHS[route.view]
}

export function pathForView(view: View): string {
  return VIEW_PATHS[view]
}

/** Read an address (case and a trailing slash don't matter). */
export function parsePath(pathname: string): Route {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (path === '/') return { kind: 'home' }
  const alias = ALIASES[path]
  if (alias) return alias
  const view = (Object.keys(VIEW_PATHS) as View[]).find((v) => VIEW_PATHS[v] === path)
  return view ? viewRoute(view) : { kind: 'notFound', path: pathname }
}

/** The browser tab's title for a route. */
export function titleFor(route: Route): string {
  if (route.kind === 'home') return BRAND_TITLE
  if (route.kind === 'notFound') return 'Page not found · Manna Money'
  if (route.view === 'account' && route.mode) {
    return `${route.mode === 'signup' ? 'Create an account' : 'Sign in'} · Manna Money`
  }
  return `${LABELS[route.view]} · Manna Money`
}

/**
 * The doors a brand-new visitor may walk straight through: the landing
 * itself, and the places its buttons lead (import a CSV, sign in, sign up).
 * Anywhere else sends someone with no data and no account to the landing
 * page first.
 */
export function isOpenDoor(route: Route): boolean {
  if (route.kind !== 'view') return true
  return route.view === 'import' || route.view === 'account'
}

export function sameRoute(a: Route, b: Route): boolean {
  return pathFor(a) === pathFor(b)
}

/**
 * True for an ordinary left click. Cmd/Ctrl/Shift/middle clicks are left to
 * the browser, so "open in a new tab" works on every in-app link.
 */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
}
