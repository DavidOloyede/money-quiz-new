/**
 * Platform seam for theming: where the OS preference comes from and how a
 * chosen theme is reflected into the UI shell. The default is the browser
 * behavior (matchMedia + a `.dark` class on <html>), safely guarded so it's a
 * no-op where those APIs don't exist. Mobile swaps in an Appearance-based
 * adapter via `setThemeAdapter` at startup.
 */
import type { ThemeMode } from '../types'

export interface ThemeAdapter {
  /** The OS-level preference, used when the user hasn't picked a theme. */
  systemTheme(): ThemeMode
  /** Reflect the chosen theme into the UI shell (web: `.dark` on <html>). */
  apply(mode: ThemeMode): void
}

const webDefault: ThemeAdapter = {
  systemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  },
  apply(mode) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', mode === 'dark')
    }
  },
}

let adapter: ThemeAdapter = webDefault

/** Install a platform theme adapter (mobile). Null resets to the web default. */
export function setThemeAdapter(next: ThemeAdapter | null): void {
  adapter = next ?? webDefault
}

export function getThemeAdapter(): ThemeAdapter {
  return adapter
}
