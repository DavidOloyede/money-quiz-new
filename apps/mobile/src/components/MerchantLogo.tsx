/**
 * A company's logo beside a merchant's name, the phone's twin of the web's
 * MerchantLogo: our own bundled logo when we carry the brand (drawn from the
 * same Simple Icons paths in @moneyquiz/core/data/brandIcons), else the one
 * Plaid sent with a bank-linked row, else the fallback (the category emoji).
 * Most merchants have no logo, and that's expected.
 *
 * Logos always sit on a small white tile, whatever the theme: brand colours
 * are chosen for white, and several (Apple, Uber) are black.
 */
import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { BRAND_ICONS, type BrandSlug } from '@moneyquiz/core/data/brandIcons'
import { brandSlugForAny } from '@moneyquiz/core/lib/merchantLogos'
import { displayDescription } from '@moneyquiz/core/lib/merchant'
import type { Transaction } from '@moneyquiz/core'

import { useAppTheme } from '@/theme'

const SIZES = {
  sm: { box: 20, round: 5, mark: 14, emoji: 13 },
  md: { box: 26, round: 7, mark: 17, emoji: 16 },
  lg: { box: 48, round: 12, mark: 32, emoji: 28 },
}

export function MerchantLogo({
  brand,
  logoUrl,
  fallback,
  size = 'md',
}: {
  brand?: BrandSlug | null
  logoUrl?: string
  /** Shown in the logo's footprint when there's no logo (usually the category emoji). */
  fallback?: string
  size?: keyof typeof SIZES
}) {
  const { theme, colors } = useAppTheme()
  // Remember which URL failed, not just "failed", so a new URL gets its chance.
  const [brokenUrl, setBrokenUrl] = useState<string>()
  const s = SIZES[size]
  const tile = {
    width: s.box,
    height: s.box,
    borderRadius: s.round,
    backgroundColor: colors.logoTile,
    borderWidth: theme === 'dark' ? 0 : StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  }

  if (brand) {
    const icon = BRAND_ICONS[brand]
    return (
      <View style={tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={s.mark} height={s.mark} viewBox="0 0 24 24">
          <Path d={icon.path} fill={`#${icon.hex}`} />
        </Svg>
      </View>
    )
  }

  if (logoUrl && brokenUrl !== logoUrl) {
    return (
      <View style={tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image
          source={{ uri: logoUrl }}
          onError={() => setBrokenUrl(logoUrl)}
          style={{ width: s.box, height: s.box }}
          resizeMode="contain"
        />
      </View>
    )
  }

  // The fallback keeps the logo's footprint, so names line up down a list.
  return (
    <View style={{ width: s.box, height: s.box, alignItems: 'center', justifyContent: 'center' }}>
      {fallback ? <Text style={{ fontSize: s.emoji }}>{fallback}</Text> : null}
    </View>
  )
}

/** The bundled brand behind one transaction row, as its name currently shows. */
export function brandForRow(t: Transaction, aliases: Record<string, string>): BrandSlug | null {
  return brandSlugForAny(displayDescription(t.description, aliases), t.description)
}
