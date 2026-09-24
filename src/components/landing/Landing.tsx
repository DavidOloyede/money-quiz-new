/**
 * The signed-out welcome page. App.tsx shows it in place of the app shell
 * when a visitor is signed out and has no data; trying the sample data (or
 * choosing to import or sign in) drops them into the real app. It never
 * changes the URL.
 */
import { LandingHero } from './LandingHero'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingWhy } from './LandingWhy'
import { LandingFinal } from './LandingFinal'

export interface LandingActions {
  /** Load the sample year and open the dashboard. The page's one CTA. */
  onTrySample: () => void
  /** Leave the landing page for the CSV import screen. */
  onImport: () => void
  /** Leave for the sign-in screen; absent when accounts aren't configured. */
  onSignIn?: () => void
}

export function Landing(actions: LandingActions) {
  return (
    <div className="min-h-screen overflow-x-clip bg-linen-50 text-linen-900 dark:bg-linen-950 dark:text-linen-100">
      <LandingHero {...actions} />
      <LandingHowItWorks />
      <LandingWhy />
      <LandingFinal {...actions} />
    </div>
  )
}
