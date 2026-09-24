/**
 * The landing page's chunky button (docs/DESIGN.md "Primary buttons press
 * in"): a 4px darker edge along the bottom that collapses on press, so the
 * button feels physical. Shared by every landing section so the hero and
 * closing CTAs stay pixel-identical.
 */
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-forest-600 text-white shadow-[0_4px_0_var(--color-forest-800)] hover:bg-forest-500 active:shadow-[0_1px_0_var(--color-forest-800)]',
  secondary:
    'border-2 border-linen-200 bg-cream text-forest-700 shadow-[0_4px_0_var(--color-linen-200)] hover:bg-linen-50 active:shadow-[0_1px_0_var(--color-linen-200)] dark:border-linen-700 dark:bg-linen-900 dark:text-forest-300 dark:shadow-[0_4px_0_var(--color-linen-700)] dark:hover:bg-linen-800 dark:active:shadow-[0_1px_0_var(--color-linen-700)]',
}

interface PressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function PressButton({ variant = 'primary', className = '', ...rest }: PressButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-[50px] w-full items-center justify-center rounded-xl px-6 font-rounded text-base font-extrabold tracking-wide transition-[translate,box-shadow,background-color] duration-150 active:translate-y-[3px] sm:w-[330px] ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
