/**
 * Watches the game state (and the loans confirmed paid off) and shows each
 * milestone (the day's streak, a level-up, new badges, a paid-off debt) as it
 * happens, wherever it was earned: the quiz, the daily question, an import,
 * or the debts card. Mounted once at the root, inside the StoreProvider; the
 * detection and pacing are core's useMilestones, shared with the web. Sound
 * and haptic per docs/DESIGN.md: the streak a soft "drop" and a light tap (a
 * sparkle and success on the day it reaches a goal), a level-up or badge the
 * sparkle and success, a paid-off debt the fanfare and a heavy tap.
 */
import { useEffect } from 'react'
import { useStore } from '@moneyquiz/core'
import { useMilestones } from '@moneyquiz/core/lib/milestones'
import { streakProgress } from '@moneyquiz/core/lib/streak'

import { haptic } from '@/lib/haptics'
import { useSound } from '@/lib/sound'
import { MilestoneOverlay } from './MilestoneOverlay'
import { PaidOffOverlay } from './PaidOffOverlay'
import { StreakOverlay } from './StreakOverlay'

export function CelebrationHost() {
  const { game, paidOffDebts } = useStore()
  const { current, dismiss } = useMilestones(game, paidOffDebts)
  const play = useSound()

  useEffect(() => {
    if (!current) return
    if (current.kind === 'paid-off') {
      play('fanfare')
      haptic.heavy()
      return
    }
    if (current.kind === 'streak' && !streakProgress(current.to).reached) {
      play('drop')
      haptic.tap()
      return
    }
    play('sparkle')
    haptic.success()
    // Once per milestone shown; flipping the Sounds switch mid-moment shouldn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  if (!current) return null
  // Keyed per milestone, so two in a row each get a fresh entrance.
  if (current.kind === 'streak') return <StreakOverlay key={`streak-${current.to}`} milestone={current} onClose={dismiss} />
  if (current.kind === 'paid-off') return <PaidOffOverlay key="paid-off" milestone={current} onClose={dismiss} />
  return <MilestoneOverlay key={`${current.kind}-${current.kind === 'level' ? current.to : current.badges[0].id}`} milestone={current} onClose={dismiss} />
}
