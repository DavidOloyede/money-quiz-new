/**
 * The receipts under an answered question: the transactions the figure was
 * computed from. Shared by the quiz and the question of the day — wherever a
 * question is answered, the rows behind it are one glance away, so nobody has
 * to take a number on faith.
 */
import { formatCurrency } from '@moneyquiz/core/lib/format'
import type { EvidenceCard } from '@moneyquiz/core/lib/quiz'

interface Props {
  evidence: EvidenceCard[] | undefined
  /** Tighter type and a lighter heading, for the compact daily-question card. */
  compact?: boolean
}

export function QuizEvidence({ evidence, compact = false }: Props) {
  if (!evidence || evidence.length === 0) return null
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-linen-400 dark:text-linen-500">
        The numbers behind this answer
      </div>
      <div className={`grid gap-3 ${evidence.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {evidence.map((card, i) => (
          <EvidenceList key={i} card={card} compact={compact} />
        ))}
      </div>
    </div>
  )
}

function EvidenceList({ card, compact }: { card: EvidenceCard; compact: boolean }) {
  return (
    <div className="rounded-xl border border-linen-200 dark:border-linen-700 bg-cream dark:bg-linen-900">
      <div className="border-b border-linen-100 dark:border-linen-800 px-4 py-2 text-xs font-semibold text-linen-600 dark:text-linen-300">
        {card.title}
      </div>
      {/* overscroll-contain: at the end of the list the page must not take over
          the scroll (see the app's scroll-containment rule). */}
      <ul
        className={`divide-y divide-linen-100 dark:divide-linen-800 overflow-y-auto overscroll-contain px-4 ${
          compact ? 'max-h-44' : 'max-h-56'
        }`}
      >
        {card.items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
            <span className="min-w-0 truncate text-linen-700 dark:text-linen-200">
              {it.label}
              {it.detail && (
                <span className="ml-1.5 text-linen-400 dark:text-linen-500">{it.detail}</span>
              )}
            </span>
            {it.amount !== undefined && (
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  it.amount > 0 ? 'text-forest-600' : 'text-linen-600 dark:text-linen-300'
                }`}
              >
                {formatCurrency(it.amount)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
