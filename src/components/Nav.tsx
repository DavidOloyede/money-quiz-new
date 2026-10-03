import type { MouseEvent } from 'react'
import type { ThemeMode } from '@moneyquiz/core/types'
import { isPlainClick, pathForView, type View } from '../lib/routes'
import { ProgressChip, ProgressWidget } from './ProgressWidget'
import {
  ChartIcon,
  MannaLogo,
  MoonIcon,
  QuizIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  TableIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
} from './icons'

export type { View } from '../lib/routes'

interface NavItem {
  id: View
  label: string
  icon: (p: { className?: string }) => React.JSX.Element
}

const ITEMS: NavItem[] = [
  { id: 'import', label: 'Import', icon: UploadIcon },
  { id: 'dashboard', label: 'Dashboard', icon: ChartIcon },
  { id: 'yearly', label: 'Year Sheet', icon: TableIcon },
  { id: 'quiz', label: 'Quiz', icon: QuizIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

interface NavProps {
  view: View | null
  onNavigate: (v: View) => void
  onClear: () => void
  hasData: boolean
  theme: ThemeMode
  onToggleTheme: () => void
  /** Cloud features configured — show the Account entry. */
  showAccount?: boolean
  /** Signed in as an admin — show the Admin entry. */
  showAdmin?: boolean
  /** This device is mirroring data to a signed-in account. */
  syncActive?: boolean
}

function navItems(showAccount?: boolean, showAdmin?: boolean): NavItem[] {
  const items = [...ITEMS]
  if (showAccount) items.push({ id: 'account', label: 'Account', icon: UserIcon })
  if (showAdmin) items.push({ id: 'admin', label: 'Admin', icon: ShieldIcon })
  return items
}

/**
 * Every nav item is a real link to its address, so middle-click and "open in
 * a new tab" work; an ordinary click stays in the app (and still lets the
 * shell ask "Leave the quiz?").
 */
function navClick(id: View, onNavigate: (v: View) => void) {
  return (e: MouseEvent) => {
    if (!isPlainClick(e)) return
    e.preventDefault()
    onNavigate(id)
  }
}

function ThemeToggle({ theme, onToggleTheme, compact }: { theme: ThemeMode; onToggleTheme: () => void; compact?: boolean }) {
  const dark = theme === 'dark'
  const base =
    'flex items-center gap-2 rounded-lg text-sm font-medium text-linen-500 dark:text-linen-400 hover:bg-linen-50 dark:hover:bg-linen-800 hover:text-linen-900 dark:hover:text-linen-100 transition-colors'
  return (
    <button
      onClick={onToggleTheme}
      className={compact ? `p-2 ${base}` : `w-full px-3 py-2.5 ${base}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      {!compact && (dark ? 'Light mode' : 'Dark mode')}
    </button>
  )
}

export function Sidebar({ view, onNavigate, onClear, hasData, theme, onToggleTheme, showAccount, showAdmin, syncActive }: NavProps) {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-linen-100 dark:border-linen-800">
        <MannaLogo className="w-8 h-8" />
        <div className="leading-tight">
          <div className="font-rounded text-[18px] font-extrabold tracking-tight text-forest-700 dark:text-forest-300">
            Manna Money
          </div>
          <div className="text-[11px] text-linen-400 dark:text-linen-500">Steward your daily bread</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems(showAccount, showAdmin).map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href={pathForView(item.id)}
              onClick={navClick(item.id, onNavigate)}
              aria-current={active ? 'page' : undefined}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-rounded text-[15px] font-bold transition-colors duration-150 ${
                active
                  ? 'bg-forest-50 dark:bg-forest-500/10 text-forest-700 dark:text-forest-300'
                  : 'text-linen-600 dark:text-linen-300 hover:bg-linen-100/70 dark:hover:bg-linen-800 hover:text-linen-900 dark:hover:text-linen-100'
              }`}
            >
              <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
              {item.label}
            </a>
          )
        })}
      </nav>

      <div className="p-3 border-t border-linen-100 dark:border-linen-800 space-y-1">
        <div className="mb-2">
          <ProgressWidget />
        </div>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        <button
          onClick={onClear}
          disabled={!hasData}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-linen-500 dark:text-linen-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-linen-500 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
          Clear all data
        </button>
        <p className="mt-2 px-2 text-[11px] leading-snug text-linen-400 dark:text-linen-500">
          {syncActive ? 'Synced to your account.' : 'All data stays in your browser.'}
        </p>
      </div>
    </aside>
  )
}

export function MobileTopNav({ view, onNavigate, onClear, hasData, theme, onToggleTheme, showAccount, showAdmin }: NavProps) {
  return (
    <header className="md:hidden sticky top-0 z-10 bg-cream dark:bg-linen-900 border-b border-linen-200 dark:border-linen-700">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <MannaLogo className="w-7 h-7" />
          <span className="font-rounded text-[17px] font-extrabold tracking-tight text-forest-700 dark:text-forest-300">
            Manna Money
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ProgressChip />
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} compact />
          <button
            onClick={onClear}
            disabled={!hasData}
            className="p-2 rounded-lg text-linen-500 dark:text-linen-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-40"
            aria-label="Clear all data"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex border-t border-linen-100 dark:border-linen-800">
        {navItems(showAccount, showAdmin).map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href={pathForView(item.id)}
              onClick={navClick(item.id, onNavigate)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-rounded text-xs font-bold border-b-2 transition-colors duration-150 ${
                active
                  ? 'border-forest-500 text-forest-700 dark:text-forest-300'
                  : 'border-transparent text-linen-500 dark:text-linen-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
