/**
 * The landing page's call-to-action stack, shared so the hero and the
 * closing section stay identical (docs/design/landing/bar.md #5): create an
 * account first, try the sample year second. Without accounts configured,
 * the sample year is the only (and so primary) button.
 */
import type { LandingActions } from './Landing'
import { PressButton } from './PressButton'

export function CtaPair({ onSignUp, onTrySample, className = '' }: LandingActions & { className?: string }) {
  return (
    <div className={`flex w-full flex-col gap-3 sm:w-auto ${className}`}>
      {onSignUp && <PressButton onClick={onSignUp}>Create a free account</PressButton>}
      <PressButton variant={onSignUp ? 'secondary' : 'primary'} onClick={onTrySample}>
        Try it with sample data
      </PressButton>
    </div>
  )
}
