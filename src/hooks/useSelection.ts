import { useCallback, useMemo, useState } from 'react'

/**
 * Multi-select over a list that filters underneath you.
 *
 * The subtlety worth keeping: "select all" is scoped to what's currently
 * visible, and clearing it only removes those. So you can filter to the $118
 * charges, select them, change the filter, select some more, and act on both
 * sets at once — which is the whole reason for filtering before selecting.
 */
export function useSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allVisibleSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selected.has(id)),
    [visibleIds, selected],
  )

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      if (visibleIds.every((id) => prev.has(id))) {
        const next = new Set(prev)
        for (const id of visibleIds) next.delete(id)
        return next
      }
      return new Set([...prev, ...visibleIds])
    })
  }, [visibleIds])

  const clear = useCallback(() => setSelected(new Set()), [])

  return {
    selected,
    ids: useMemo(() => [...selected], [selected]),
    count: selected.size,
    has: useCallback((id: string) => selected.has(id), [selected]),
    allVisibleSelected,
    toggleOne,
    toggleAllVisible,
    clear,
  }
}
