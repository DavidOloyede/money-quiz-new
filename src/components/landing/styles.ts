/**
 * The landing page's shared type scale and section rhythm. The design bar
 * (docs/design/landing/bar.md) allows three text sizes per section and even
 * spacing between sections, so every section pulls from these instead of
 * picking its own.
 */

/** Hero and closing headlines: ~3.5× body on desktop. */
export const DISPLAY =
  'font-rounded text-[36px] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[64px]'

/** Section headings: ~2.7× body on desktop. */
export const HEADING =
  'font-rounded text-[34px] leading-[1.1] font-extrabold tracking-tight text-balance text-linen-900 dark:text-linen-50 sm:text-[48px]'

/** Running text: visibly quieter than the headings (linen-500 is 5.7:1 on cream). */
export const BODY = 'text-[17px] leading-[1.6] text-linen-500 dark:text-linen-400 sm:text-lg'

/** Vertical rhythm for a section: 80–120px above and below (DESIGN.md). */
export const SECTION = 'px-4 py-20 sm:px-6 lg:py-28'

/** The centered content column every section sits in. */
export const COLUMN = 'mx-auto w-full max-w-[990px]'
