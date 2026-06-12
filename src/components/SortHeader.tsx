interface SortHeaderProps<K extends string> {
  /** The column this header sorts. */
  sortKey: K
  label: string
  /** The currently active sort column. */
  current: K
  asc: boolean
  onToggle: (key: K) => void
  /** 'right' puts the arrow left of the label so the label stays flush with a right-aligned column. */
  align?: 'left' | 'right'
  /** false renders static text at the same width, so the header never jumps when sortability changes. */
  sortable?: boolean
}

// Shared sortable-column header. The arrow slot is always rendered at a fixed
// width (invisible when inactive) so toggling the sort never shifts the layout.
export function SortHeader<K extends string>({
  sortKey,
  label,
  current,
  asc,
  onToggle,
  align = 'left',
  sortable = true,
}: SortHeaderProps<K>) {
  const active = sortable && current === sortKey
  const arrow = (
    <span aria-hidden className={`w-3 text-center ${active ? '' : 'invisible'}`}>
      {active && asc ? '↑' : '↓'}
    </span>
  )
  const inner = (
    <>
      {align === 'right' && arrow}
      {label}
      {align === 'left' && arrow}
    </>
  )
  if (!sortable) return <span className="inline-flex items-center font-medium">{inner}</span>
  return (
    <button
      onClick={() => onToggle(sortKey)}
      className="inline-flex items-center font-medium hover:text-slate-600 dark:hover:text-slate-300"
    >
      {inner}
    </button>
  )
}
