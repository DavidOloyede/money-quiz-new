/**
 * The bowl the falling manna lands in on the landing page: the logo's own
 * closed bowl and foot, drawn large in the same thin line, with a small heap
 * of flakes already gathered at the rim. Used in the hero and the finale so
 * both scenes end in the same place.
 */
export function MannaBowl({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 64" fill="none" aria-hidden>
      {/* Gathered manna, drawn first so the bowl's rim line sits over it. */}
      <g className="stroke-honey-600 dark:stroke-honey-500" strokeWidth="0.8">
        <ellipse cx="44" cy="5.5" rx="4.2" ry="3.2" className="fill-honey-300" />
        <ellipse cx="56" cy="5.5" rx="4" ry="3" className="fill-honey-300" />
        <ellipse cx="50" cy="3.2" rx="4.4" ry="3.3" className="fill-honey-400" />
      </g>
      <path
        d="M3 7c0 26.5 20.5 45 47 45s47-18.5 47-45Z"
        strokeWidth="3"
        strokeLinejoin="round"
        className="fill-cream stroke-honey-500 dark:fill-linen-900 dark:stroke-honey-400"
      />
      <path d="M28 59h44" strokeWidth="3" strokeLinecap="round" className="stroke-honey-500 dark:stroke-honey-400" />
    </svg>
  )
}
