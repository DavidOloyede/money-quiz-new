/**
 * A company's logo beside a merchant's name: our own bundled logo when we
 * carry the brand, else the one Plaid sent with a bank-linked row, else
 * whatever the caller passes as `fallback` (the category emoji, or nothing).
 * Most merchants have no logo, and that's expected: an invented or local
 * name simply shows the fallback.
 *
 * Logos always sit on a small white tile, whatever the theme: brand colours
 * are chosen for white, and several (Apple, Uber) are black.
 */
import { useState, type ReactNode } from 'react'
import { BRAND_ICONS, type BrandSlug } from '@moneyquiz/core/data/brandIcons'

const SIZES = {
  sm: { box: 'h-5 w-5', round: 'rounded-[5px]', mark: 'h-3.5 w-3.5' },
  md: { box: 'h-6 w-6', round: 'rounded-md', mark: 'h-4 w-4' },
  lg: { box: 'h-12 w-12', round: 'rounded-xl', mark: 'h-8 w-8' },
}

const TILE =
  'flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-linen-200 dark:ring-0'

export function MerchantLogo({
  brand,
  logoUrl,
  fallback = null,
  size = 'md',
  keepSpace = false,
  className = '',
}: {
  brand?: BrandSlug | null
  logoUrl?: string
  fallback?: ReactNode
  size?: keyof typeof SIZES
  /** Hold an empty logo-sized slot when there's nothing to show (table columns). */
  keepSpace?: boolean
  className?: string
}) {
  // Remember which URL failed, not just "failed", so a new URL gets its chance.
  const [brokenUrl, setBrokenUrl] = useState<string>()
  const s = SIZES[size]

  if (brand) {
    const icon = BRAND_ICONS[brand]
    return (
      <span aria-hidden className={`${TILE} ${s.box} ${s.round} ${className}`}>
        <svg viewBox="0 0 24 24" className={s.mark}>
          <path d={icon.path} fill={`#${icon.hex}`} />
        </svg>
      </span>
    )
  }

  if (logoUrl && brokenUrl !== logoUrl) {
    return (
      <span aria-hidden className={`${TILE} ${s.box} ${s.round} ${className}`}>
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBrokenUrl(logoUrl)}
          className="h-full w-full object-contain"
        />
      </span>
    )
  }

  // The fallback gets the logo's footprint, so names line up down a list
  // whether or not their row found a logo.
  if (fallback == null && !keepSpace) return null
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${s.box} ${className}`}>
      {fallback}
    </span>
  )
}
