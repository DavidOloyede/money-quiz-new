/**
 * The page for an address that doesn't exist: calm, warm, and one tap from
 * home. Shown inside the app shell for someone already using the app, and on
 * its own dawn backdrop for a brand-new visitor.
 */
import type { MouseEvent } from 'react'
import { MannaBowl } from './landing/MannaBowl'
import { isPlainClick } from '../lib/routes'

export function NotFound({ path, onHome, standalone = false }: { path: string; onHome: () => void; standalone?: boolean }) {
  const goHome = (e: MouseEvent) => {
    if (!isPlainClick(e)) return
    e.preventDefault()
    onHome()
  }
  const card = (
    <div className="view-in mx-auto max-w-md rounded-2xl border border-linen-200 bg-linear-to-b from-cream via-honey-50 to-sky-50 p-8 text-center dark:border-linen-700 dark:from-linen-900 dark:via-linen-900 dark:to-sky-950/40">
      <div className="relative mx-auto h-28 w-40" aria-hidden>
        <span className="lost-flake absolute top-0 left-[44%] h-3 w-3 rounded-full bg-honey-400 ring-2 ring-honey-500/40" />
        <MannaBowl className="absolute bottom-0 left-0 h-20 w-40" />
      </div>
      <h2 className="mt-4 font-rounded text-2xl font-extrabold text-linen-900 dark:text-linen-50">This page wandered off</h2>
      <p className="mt-2 text-sm text-linen-500 dark:text-linen-400">
        There&apos;s nothing at <span className="font-medium break-all text-linen-700 dark:text-linen-200">{path}</span>.
        Let&apos;s get you back to today.
      </p>
      <a href="/" onClick={goHome} className="btn-primary mt-6 inline-flex h-11 items-center px-6 text-sm">
        Take me home
      </a>
    </div>
  )
  if (!standalone) return card
  return (
    <div className="flex min-h-screen items-center bg-linen-50 px-4 dark:bg-linen-950">
      <div className="w-full">{card}</div>
    </div>
  )
}
