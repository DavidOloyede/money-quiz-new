import { ChartIcon, CoinLogo, QuizIcon, TrashIcon, UploadIcon } from './icons'

export type View = 'import' | 'dashboard' | 'quiz'

interface NavItem {
  id: View
  label: string
  icon: (p: { className?: string }) => React.JSX.Element
}

const ITEMS: NavItem[] = [
  { id: 'import', label: 'Import', icon: UploadIcon },
  { id: 'dashboard', label: 'Dashboard', icon: ChartIcon },
  { id: 'quiz', label: 'Quiz', icon: QuizIcon },
]

interface NavProps {
  view: View
  onNavigate: (v: View) => void
  onClear: () => void
  hasData: boolean
}

export function Sidebar({ view, onNavigate, onClear, hasData }: NavProps) {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
        <CoinLogo className="w-8 h-8" />
        <div className="leading-tight">
          <div className="font-bold text-slate-800">Money Quiz</div>
          <div className="text-[11px] text-slate-400">Personal finance insight</div>
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
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onClear}
          disabled={!hasData}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
          Clear all data
        </button>
        <p className="mt-2 px-2 text-[11px] leading-snug text-slate-400">
          All data stays in your browser.
        </p>
      </div>
    </aside>
  )
}

export function MobileTopNav({ view, onNavigate, onClear, hasData }: NavProps) {
  return (
    <header className="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <CoinLogo className="w-7 h-7" />
          <span className="font-bold text-slate-800">Money Quiz</span>
        </div>
        <button
          onClick={onClear}
          disabled={!hasData}
          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          aria-label="Clear all data"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex border-t border-slate-100">
        {ITEMS.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-slate-500'
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
