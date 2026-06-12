import { useState } from 'react'
import { useStore } from '../store'
import { allCategories } from '../lib/categories'
import {
  buildReport,
  downloadText,
  printReport,
  transactionsToCsv,
  transactionsToJson,
} from '../lib/exportData'
import { SupportCard } from './SupportCard'
import { DownloadIcon, MoonIcon, SunIcon, TrashIcon } from './icons'

interface Props {
  onClear: () => void
}

const EMOJI_CHOICES = ['🏷️', '💼', '🎓', '🐶', '✈️', '🎁', '💪', '🧒', '🏦', '☕', '🍺', '⛽', '🛠️', '📚', '💵']

export function SettingsView({ onClear }: Props) {
  const {
    transactions,
    sources,
    theme,
    setTheme,
    categoryConfig,
    addCustomCategory,
    updateCategory,
    deleteCategory,
  } = useStore()

  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#0ea5e9')
  const [newEmoji, setNewEmoji] = useState('🏷️')

  const sourceName = (id?: string) => sources.find((s) => s.id === id)?.fileName ?? ''
  const customIds = new Set(categoryConfig.custom.map((c) => c.id))

  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    addCustomCategory(label, newColor, newEmoji)
    setNewLabel('')
    setNewColor('#0ea5e9')
    setNewEmoji('🏷️')
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>

      <div className="space-y-4">
        {/* Appearance */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Appearance</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose your theme.</p>
          <div className="mt-3 inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            {([
              { id: 'light', label: 'Light', icon: SunIcon },
              { id: 'dark', label: 'Dark', icon: MoonIcon },
            ] as const).map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    theme === opt.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Categories */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Categories</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rename or recolor any category, or add your own. Deleting a custom category moves its
            transactions to Other.
          </p>

          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {allCategories().map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => updateCategory(d.id, { color: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                  aria-label={`${d.label} color`}
                />
                <input
                  type="text"
                  value={d.emoji}
                  onChange={(e) => updateCategory(d.id, { emoji: e.target.value.slice(0, 2) })}
                  className="h-8 w-10 shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm"
                  aria-label={`${d.label} emoji`}
                />
                <input
                  type="text"
                  value={d.label}
                  onChange={(e) => updateCategory(d.id, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
                {d.kind === 'excluded' && (
                  <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    not counted
                  </span>
                )}
                {customIds.has(d.id) ? (
                  <button
                    onClick={() => deleteCategory(d.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                    aria-label={`Delete ${d.label}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" />
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-200 dark:border-slate-700 bg-transparent"
              aria-label="New category color"
            />
            <select
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="h-8 w-14 shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm"
              aria-label="New category emoji"
            >
              {EMOJI_CHOICES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="New category name…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={addCustom}
              disabled={!newLabel.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Add category
            </button>
          </div>
        </section>

        {/* Data */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Your data</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Everything is stored only in this browser. Export it or wipe it anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadText('money-quiz-transactions.csv', transactionsToCsv(transactions, sourceName), 'text/csv;charset=utf-8')
              }
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() =>
                downloadText('money-quiz-transactions.json', transactionsToJson(transactions), 'application/json')
              }
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> JSON
            </button>
            <button
              onClick={() => downloadText('money-quiz-report.txt', buildReport(transactions))}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> Report
            </button>
            <button
              onClick={() => printReport(buildReport(transactions))}
              disabled={transactions.length === 0}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Print report
            </button>
          </div>
          <button
            onClick={onClear}
            disabled={transactions.length === 0}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"
          >
            <TrashIcon className="h-4 w-4" /> Clear all data
          </button>
        </section>

        {/* Help & support (shown only when cloud accounts are configured) */}
        <SupportCard />
      </div>
    </div>
  )
}
