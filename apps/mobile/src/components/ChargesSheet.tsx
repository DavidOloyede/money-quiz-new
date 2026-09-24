/**
 * One place to open "the charges behind this": a merchant, a bill, a habit.
 * Callers pass transaction ids; the sheet reads the live rows from the store,
 * so the list stays current while you edit inside it. Tapping a row opens
 * the transaction editor.
 */
import { useMemo, useState } from 'react'
import { useStore } from '@moneyquiz/core'

import { useTransactionEditor } from '@/components/TransactionSheet'
import { TxListModal } from '@/components/TxListModal'

interface Open {
  title: string
  ids: string[]
  subtitle?: string
}

export function useChargesSheet() {
  const { transactions } = useStore()
  const [current, setCurrent] = useState<Open | null>(null)
  const editor = useTransactionEditor()

  const rows = useMemo(() => {
    if (!current) return []
    const ids = new Set(current.ids)
    return transactions.filter((t) => ids.has(t.id)).sort((a, b) => b.date.localeCompare(a.date))
  }, [current, transactions])

  const node = current ? (
    <TxListModal
      title={current.title}
      subtitle={current.subtitle}
      transactions={rows}
      onClose={() => setCurrent(null)}
      onPressRow={editor.open}
    >
      {editor.node}
    </TxListModal>
  ) : null

  return {
    open: (title: string, ids: string[], subtitle?: string) => setCurrent({ title, ids, subtitle }),
    node,
  }
}
