/**
 * The Manna Money design tokens — the single source of truth for both apps.
 * The web's Tailwind `@theme` block (src/theme.css) is GENERATED from this
 * file via `npm run gen:theme`; the mobile app imports `themeTokens` directly.
 * Change values here, then re-run the generator — never edit theme.css.
 *
 * linen  — warm neutrals (paper, ink); each step is luminance-matched to the
 *          Tailwind slate step it replaced, so light/dark contrast pairs that
 *          worked before still hold.
 * forest — the brand green (provision, growth; income & primary actions).
 * honey  — amber-gold (manna; gamification warmth, spending series).
 * cream  — the card surface (warm white).
 * sky    — soft dawn blue (hero backdrops, info badges). Each step matches the
 *          brightness of Tailwind's sky step, and it replaces Tailwind's sky.
 * coral  — a gentle "not quite" (wrong answers, over budget) instead of an
 *          alarm red. Each step matches the brightness of Tailwind's rose
 *          step, so swapping rose-N for coral-N keeps every contrast pair.
 *          Both ramps are OKLCH at ~0.62x the source chroma (softer, same
 *          contrast); theme.test.ts locks the text pairs docs/DESIGN.md uses.
 *
 * Charts: income = forest-500, spending = honey-600 (CVD-checked pair,
 * ΔE 23.6). Category identity colors live in lib/categories.ts (hex,
 * validated set — see the notes there).
 */

export type ColorRamp = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
  string
>

export const fonts = {
  sans: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  display: `"Fraunces", ui-serif, Georgia, "Times New Roman", serif`,
  rounded: `"Nunito", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
} as const

export const cream = '#fffcf5'

export const linen: ColorRamp = {
  '50': '#faf7f1',
  '100': '#f4efe5',
  '200': '#e8e0cf',
  '300': '#d3c7b0',
  '400': '#a2937b',
  '500': '#71634f',
  '600': '#55483a',
  '700': '#40352a',
  '800': '#2b241b',
  '900': '#201a13',
  '950': '#14100a',
}

export const forest: ColorRamp = {
  '50': '#f0f6f0',
  '100': '#dcebde',
  '200': '#badcc3',
  '300': '#8fc49d',
  '400': '#57a56e',
  '500': '#2f8749',
  '600': '#21703c',
  '700': '#1c5a32',
  '800': '#174827',
  '900': '#123a20',
  '950': '#0a2413',
}

export const honey: ColorRamp = {
  '50': '#fdf8ec',
  '100': '#faefd1',
  '200': '#f5dfa3',
  '300': '#eecb6b',
  '400': '#e5b13c',
  '500': '#ce9118',
  '600': '#ad720d',
  '700': '#8a560e',
  '800': '#714711',
  '900': '#5d3b12',
  '950': '#362108',
}

export const sky: ColorRamp = {
  '50': '#f2f9fc',
  '100': '#e5f2f8',
  '200': '#c8e3f3',
  '300': '#9ad0ec',
  '400': '#68b9e2',
  '500': '#4ea7d1',
  '600': '#3487ad',
  '700': '#286b8b',
  '800': '#275a73',
  '900': '#234a5e',
  '950': '#15303d',
}

export const coral: ColorRamp = {
  '50': '#fbf3f1',
  '100': '#f7e6e3',
  '200': '#f1d3cb',
  '300': '#e9aea0',
  '400': '#dd806c',
  '500': '#d56048',
  '600': '#c75039',
  '700': '#a7422f',
  '800': '#8a3727',
  '900': '#733022',
  '950': '#3f170e',
}

/**
 * Chart chrome (gridlines, axis ticks, hover cursor) per mode. On web these
 * become plain `:root` / `.dark` vars (they flip with dark mode, so they
 * can't live in `@theme`); Recharts reads them via var() in SVG props.
 */
export const chartChrome = {
  light: { grid: linen['200'], tick: '#857b6b', cursor: 'rgb(232 224 207 / 0.45)' },
  dark: { grid: linen['800'], tick: linen['400'], cursor: 'rgb(43 36 27 / 0.55)' },
} as const

/** Series colors for the income/spending charts (CVD-checked pair). */
export const chartSeries = {
  income: forest['500'],
  spending: honey['600'],
} as const

/** Everything above in one bag, for consumers that want a single import. */
export const themeTokens = {
  fonts,
  cream,
  linen,
  forest,
  honey,
  sky,
  coral,
  chartChrome,
  chartSeries,
} as const
