/**
 * Watches the game state (and the loans confirmed paid off) and shows each
 * milestone (the day's streak, a level-up, new badges, a paid-off debt) as it
 * happens, wherever it was earned: the quiz, the question of the day, an
 * import, or the dashboard's debts. Mounted once inside the StoreProvider;
 * the detection and pacing live in core's useMilestones, shared with the
 * phone. Each has its sound (docs/DESIGN.md): the streak a soft "drop" (a
 * sparkle on the day it reaches a goal), a level-up or badge the sparkle, a
 * paid-off debt the fanfare.
 */
import { useEffect } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { useMilestones } from '@moneyquiz/core/lib/milestones'
import { streakProgress } from '@moneyquiz/core/lib/streak'
import { useSound } from '../../lib/sound'
import { MilestoneOverlay } from './MilestoneOverlay'
import { PaidOffOverlay } from './PaidOffOverlay'
import { StreakOverlay } from './StreakOverlay'

export function CelebrationHost() {
  const { game, paidOffDebts } = useStore()
  const { current, dismiss } = useMilestones(game, paidOffDebts)
  const play = useSound()

  useEffect(() => {
    if (!current) return
    if (current.kind === 'paid-off') play('fanfare')
    else play(current.kind === 'streak' && !streakProgress(current.to).reached ? 'drop' : 'sparkle')
    // Once per milestone shown; flipping the Sounds switch mid-moment shouldn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  if (!current) return null
  // Keyed per milestone, so two in a row each get a fresh entrance.
  if (current.kind === 'streak') return <StreakOverlay key={`streak-${current.to}`} milestone={current} onClose={dismiss} />
  if (current.kind === 'paid-off') return <PaidOffOverlay key="paid-off" milestone={current} onClose={dismiss} />
  return <MilestoneOverlay key={`${current.kind}-${current.kind === 'level' ? current.to : current.badges[0].id}`} milestone={current} onClose={dismiss} />
}
