/**
 * Mobile theme: semantic colors, type, and spacing derived from the shared
 * Manna Money tokens (@moneyquiz/core/theme) — the same palette the web's
 * generated theme.css comes from. Change packages/core/theme.ts to restyle
 * both apps; the light/dark pairings here mirror how the web components pair
 * the ramps (page = linen-50/950, card = cream/linen-900, and so on).
 */
import { coral, cream, forest, honey, linen, sky } from '@moneyquiz/core/theme'
import type { ThemeMode } from '@moneyquiz/core'
import { useStore } from '@moneyquiz/core'

export interface ThemeColors {
  /** Page background (web: linen-50 / linen-950). */
  background: string
  /** Card / elevated surface (web: cream / linen-900). */
  card: string
  /** Hairline card borders (web: linen-200 / linen-700). */
  border: string
  /** Input borders and stronger separators (web: linen-300 / linen-600). */
  borderStrong: string
  /** Headings and emphasized text. */
  ink: string
  /** Body text. */
  text: string
  /** Secondary text. */
  muted: string
  /** Placeholder / whisper text. */
  faint: string
  /** Brand green — primary actions, income. */
  primary: string
  /** Soft green wash behind chips/correct answers (web: forest-50 / forest-500/10). */
  primarySoft: string
  /** Honey gold — manna, gamification warmth, spending. */
  accent: string
  /** Honey wash for the warm cards (web: honey-50 / honey-500/10). */
  accentSoft: string
  /** Readable honey text on accentSoft (web: honey-700 / honey-300). */
  accentDeep: string
  /** Correct / positive text (web: forest-700..800 / forest-300). */
  success: string
  /** Primary button's darker bottom edge, the part that "presses in" (docs/DESIGN.md). */
  primaryEdge: string
  /** "Not quite": wrong answers, over budget, errors (coral-700 / coral-300). */
  danger: string
  /** Coral wash behind wrong answers (coral-50 / coral-500/10). */
  dangerSoft: string
  /** "For your info" text and badges (sky-700 / sky-300). */
  info: string
  /** Sky wash behind info badges (sky-50 / sky-500/10). */
  infoSoft: string
  /** Dimmed backdrop behind modals (web: linen-900/40). */
  overlay: string
  /** The tile behind company logos: always white, since brand colours are chosen for white. */
  logoTile: string
}

export const palette: Record<ThemeMode, ThemeColors> = {
  light: {
    background: linen['50'],
    card: cream,
    border: linen['200'],
    borderStrong: linen['300'],
    ink: linen['900'],
    text: linen['700'],
    muted: linen['500'],
    faint: linen['400'],
    primary: forest['600'],
    primarySoft: forest['50'],
    accent: honey['500'],
    accentSoft: honey['50'],
    accentDeep: honey['700'],
    success: forest['700'],
    primaryEdge: forest['800'],
    // Text on a light tint uses the 700 step (docs/DESIGN.md contrast rules).
    danger: coral['700'],
    dangerSoft: coral['50'],
    info: sky['700'],
    infoSoft: sky['50'],
    overlay: `${linen['900']}66`,
    logoTile: '#ffffff',
  },
  dark: {
    background: linen['950'],
    card: linen['900'],
    border: linen['700'],
    borderStrong: linen['600'],
    ink: linen['100'],
    text: linen['200'],
    muted: linen['400'],
    faint: linen['500'],
    primary: forest['400'],
    primarySoft: `${forest['500']}1a`,
    accent: honey['400'],
    accentSoft: `${honey['500']}1a`,
    accentDeep: honey['300'],
    success: forest['300'],
    primaryEdge: forest['600'],
    danger: coral['300'],
    dangerSoft: `${coral['500']}1a`,
    info: sky['300'],
    infoSoft: `${sky['500']}1a`,
    // Darker than the web's shared value so it still dims behind linen-900 cards.
    overlay: `${linen['950']}99`,
    logoTile: '#ffffff',
  },
}

/**
 * One fontFamily name per weight — static instances cut from the web's
 * variable fonts by scripts/gen-mobile-fonts.py (native platforms render a
 * variable font at its default instance only, so weights ship pre-cut).
 * The names match the keys registered with useFonts in the root layout.
 */
export const fonts = {
  sans: 'Inter-Regular',
  sansMedium: 'Inter-Medium',
  sansSemiBold: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
  /** Nunito, the coach: titles, buttons, quiz and game text. */
  rounded: 'Nunito-Bold',
  roundedHeavy: 'Nunito-ExtraBold',
  roundedSemi: 'Nunito-SemiBold',
  /** Fraunces, the storyteller: scripture and story only. */
  display: 'Fraunces-SemiBold',
  displayItalic: 'Fraunces-Italic',
} as const

/** Spacing scale (pt) — matches the web's Tailwind rhythm closely enough. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

/** Corner radii (docs/DESIGN.md): buttons and small tiles 12, cards 16, pills full. */
export const radii = {
  md: 12,
  lg: 16,
  pill: 999,
} as const

/** The store's resolved theme joined with its semantic colors. */
export function useAppTheme(): { theme: ThemeMode; colors: ThemeColors } {
  const { theme } = useStore()
  return { theme, colors: palette[theme] }
}
