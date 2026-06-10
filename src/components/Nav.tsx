import type { ThemeMode } from '../types'
import { ProgressChip, ProgressWidget } from './ProgressWidget'
import {
  ChartIcon,
  CoinLogo,
  MoonIcon,
  QuizIcon,
  SettingsIcon,
  SunIcon,
  TableIcon,
  TrashIcon,
  UploadIcon,
} from './icons'

export type View = 'import' | 'dashboard' | 'yearly' | 'quiz' | 'settings'

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
  view: View
  onNavigate: (v: View) => void
  onClear: () => void
  hasData: boolean
  theme: ThemeMode
  onToggleTheme: () => void
}

function ThemeToggle({ theme, onToggleTheme, compact }: { theme: ThemeMode; onToggleTheme: () => void; compact?: boolean }) {
  const dark = theme === 'dark'
  const base =
    'flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'
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

export function Sidebar({ view, onNavigate, onClear, hasData, theme, onToggleTheme }: NavProps) {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100 dark:border-slate-800">
        <CoinLogo className="w-8 h-8" />
        <div className="leading-tight">
          <div className="font-bold text-slate-800 dark:text-slate-100">Money Quiz</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">Personal finance insight</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {ITEMS.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <div className="mb-2">
          <ProgressWidget />
        </div>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        <button
          onClick={onClear}
          disabled={!hasData}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
          Clear all data
        </button>
        <p className="mt-2 px-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
          All data stays in your browser.
        </p>
      </div>
    </aside>
  )
}

export function MobileTopNav({ view, onNavigate, onClear, hasData, theme, onToggleTheme }: NavProps) {
  return (
    <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <CoinLogo className="w-7 h-7" />
          <span className="font-bold text-slate-800 dark:text-slate-100">Money Quiz</span>
        </div>
        <div className="flex items-center gap-1">
          <ProgressChip />
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} compact />
          <button
            onClick={onClear}
            disabled={!hasData}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
            aria-label="Clear all data"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex border-t border-slate-100 dark:border-slate-800">
        {ITEMS.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                active
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
