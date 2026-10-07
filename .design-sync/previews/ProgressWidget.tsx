import { ProgressWidget } from 'money-quiz'

// ProgressWidget reads level / XP / streak / badges from the store. Seed a
// realistic mid-journey game state into localStorage before the preview's
// StoreProvider mounts so the card shows a populated readout (Level 4, a live
// streak, earned badges) instead of an empty fresh account.
if (typeof window !== 'undefined') {
  // Today on the viewer's own clock (not UTC), or the streak reads as lapsed.
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  window.localStorage.setItem(
    'moneyquiz.game.v1',
    JSON.stringify({
      xp: 750,
      streak: 12,
      bestStreak: 18,
      lastActiveDay: today,
      badges: {
        'first-import': '2026-03-02T10:12:00Z',
        'streak-7': '2026-04-15T08:30:00Z',
        'quiz-perfect': '2026-05-20T18:45:00Z',
      },
    }),
  )
}

// The full sidebar widget — level ring, title, XP-to-next bar, streak, badges.
export function Default() {
  return (
    <div className="max-w-xs">
      <ProgressWidget />
    </div>
  )
}
