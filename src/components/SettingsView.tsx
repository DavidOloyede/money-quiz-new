import { useState } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { allCategories } from '@moneyquiz/core/lib/categories'
import {
  buildReport,
  downloadText,
  printReport,
  transactionsToCsv,
  transactionsToJson,
} from '../lib/exportData'
import { SupportCard } from './SupportCard'
import { DownloadIcon, MoonIcon, SunIcon, TrashIcon } from './icons'
import { counterpartyLabel } from '@moneyquiz/core/lib/owner'

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
    ownerNames,
    setOwnerNames,
    transferRules,
    setTransferRule,
  } = useStore()

  const [newOwnerName, setNewOwnerName] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#3796bc')
  const [newEmoji, setNewEmoji] = useState('🏷️')

  const sourceName = (id?: string) => sources.find((s) => s.id === id)?.fileName ?? ''
  const customIds = new Set(categoryConfig.custom.map((c) => c.id))

  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    addCustomCategory(label, newColor, newEmoji)
    setNewLabel('')
    setNewColor('#3796bc')
    setNewEmoji('🏷️')
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-[22px] font-semibold text-linen-800 dark:text-linen-100">Settings</h2>

      <div className="space-y-4">
        {/* Appearance */}
        <section className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
          <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Appearance</h3>
          <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">Choose your theme.</p>
          <div className="mt-3 inline-flex rounded-lg border border-linen-200 dark:border-linen-700 p-0.5">
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
                      ? 'bg-forest-600 text-white'
                      : 'text-linen-600 dark:text-linen-300 hover:bg-linen-50 dark:hover:bg-linen-800'
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
        <section className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
          <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Categories</h3>
          <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
            Rename or recolor any category, or add your own. Deleting a custom category moves its
            transactions to Other.
          </p>

          <ul className="mt-3 divide-y divide-linen-100 dark:divide-linen-800">
            {allCategories().map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => updateCategory(d.id, { color: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-linen-200 dark:border-linen-700 bg-transparent"
                  aria-label={`${d.label} color`}
                />
                <input
                  type="text"
                  value={d.emoji}
                  onChange={(e) => updateCategory(d.id, { emoji: e.target.value.slice(0, 2) })}
                  className="h-8 w-10 shrink-0 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 text-center text-sm"
                  aria-label={`${d.label} emoji`}
                />
                <input
                  type="text"
                  value={d.label}
                  onChange={(e) => updateCategory(d.id, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
                />
                {d.kind === 'excluded' && (
                  <span className="shrink-0 rounded-full bg-linen-100 dark:bg-linen-800 px-2 py-0.5 text-[10px] font-medium text-linen-500 dark:text-linen-400">
                    not counted
                  </span>
                )}
                {customIds.has(d.id) ? (
                  <button
                    onClick={() => deleteCategory(d.id)}
                    className="shrink-0 rounded-lg p-1.5 text-linen-400 dark:text-linen-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
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

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-linen-100 dark:border-linen-800 pt-3">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-linen-200 dark:border-linen-700 bg-transparent"
              aria-label="New category color"
            />
            <select
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="h-8 w-14 shrink-0 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 text-center text-sm"
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
              className="min-w-0 flex-1 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-2 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
            />
            <button
              onClick={addCustom}
              disabled={!newLabel.trim()}
              className="rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40"
            >
              Add category
            </button>
          </div>
        </section>

        {/* Data */}
        <section className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
          <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">
            My names &amp; accounts
          </h3>
          <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
            Add the names your banks print when you move money to yourself — including
            middle names, your name reversed, and any account nicknames. Zelle, Cash App,
            PayPal and Apple Cash rows that mention one are treated as internal transfers,
            so they stay out of your totals and out of the review queue.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ownerNames.map((name) => (
              <li
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-linen-100 dark:bg-linen-800 px-3 py-1 text-sm text-linen-700 dark:text-linen-200"
              >
                {name}
                <button
                  onClick={() => setOwnerNames(ownerNames.filter((n) => n !== name))}
                  aria-label={`Remove ${name}`}
                  className="rounded p-0.5 text-linen-400 hover:text-rose-600 dark:text-linen-500"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {ownerNames.length === 0 && (
              <li className="text-sm text-linen-400 dark:text-linen-500">None added yet.</li>
            )}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = newOwnerName.trim()
                  if (v && !ownerNames.includes(v)) setOwnerNames([...ownerNames, v])
                  setNewOwnerName('')
                }
              }}
              placeholder="e.g. Jordan Avery"
              className="w-56 rounded-lg border border-linen-300 dark:border-linen-600 bg-cream dark:bg-linen-800 px-3 py-1.5 text-sm text-linen-700 dark:text-linen-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/25 focus:outline-none"
            />
            <button
              onClick={() => {
                const v = newOwnerName.trim()
                if (v && !ownerNames.includes(v)) setOwnerNames([...ownerNames, v])
                setNewOwnerName('')
              }}
              disabled={!newOwnerName.trim()}
              className="rounded-lg bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {Object.keys(transferRules).length > 0 && (
            <div className="mt-5 border-t border-linen-100 dark:border-linen-800 pt-4">
              <h4 className="text-sm font-medium text-linen-700 dark:text-linen-200">
                Remembered decisions
              </h4>
              <p className="mt-0.5 text-xs text-linen-500 dark:text-linen-400">
                Applied to these counterparties' future transfers too.
              </p>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(transferRules).map(([key, rule]) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-linen-200 dark:border-linen-700 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-linen-700 dark:text-linen-200">
                      {counterpartyLabel(`zelle payment to ${key}`)}
                    </span>
                    <span className="shrink-0 text-xs text-linen-500 dark:text-linen-400">
                      {rule.treatment === 'internal'
                        ? 'internal'
                        : rule.treatment === 'reimbursement'
                          ? 'reimbursement'
                          : rule.category
                            ? allCategories().find((d) => d.id === rule.category)?.label
                            : 'left as is'}
                    </span>
                    <button
                      onClick={() => setTransferRule(key, null)}
                      aria-label={`Forget rule for ${key}`}
                      className="shrink-0 rounded p-1 text-linen-400 hover:text-rose-600 dark:text-linen-500"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900 p-5">
          <h3 className="font-display font-semibold text-linen-800 dark:text-linen-100">Your data</h3>
          <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">
            Everything is stored only in this browser. Export it or wipe it anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadText('money-quiz-transactions.csv', transactionsToCsv(transactions, sourceName), 'text/csv;charset=utf-8')
              }
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-linen-300 dark:border-linen-600 px-3 py-1.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() =>
                downloadText('money-quiz-transactions.json', transactionsToJson(transactions), 'application/json')
              }
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-linen-300 dark:border-linen-600 px-3 py-1.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> JSON
            </button>
            <button
              onClick={() => downloadText('money-quiz-report.txt', buildReport(transactions))}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-linen-300 dark:border-linen-600 px-3 py-1.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800 disabled:opacity-40"
            >
              <DownloadIcon className="h-4 w-4" /> Report
            </button>
            <button
              onClick={() => printReport(buildReport(transactions))}
              disabled={transactions.length === 0}
              className="rounded-lg border border-linen-300 dark:border-linen-600 px-3 py-1.5 text-sm font-medium text-linen-700 dark:text-linen-200 hover:bg-linen-50 dark:hover:bg-linen-800 disabled:opacity-40"
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
