import { ProgressChip } from 'money-quiz'

// The compact "Lv 4 · 🔥12" chip used in the mobile top bar. Reads the same
// store as ProgressWidget; seed a game state so the chip shows a real level
// and streak rather than a fresh Level 1.
if (typeof window !== 'undefined') {
  window.localStorage.setItem(
    'moneyquiz.game.v1',
    JSON.stringify({
      xp: 750,
      streak: 12,
      bestStreak: 18,
      lastActiveDay: new Date().toISOString().slice(0, 10),
      badges: { 'first-import': '2026-03-02T10:12:00Z', 'streak-7': '2026-04-15T08:30:00Z' },
    }),
  )
}

export function Default() {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-4">
      <ProgressChip />
    </div>
  )
}
