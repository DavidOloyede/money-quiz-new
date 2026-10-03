/**
 * Watches the game state and shows each milestone (a level-up, new badges)
 * as it happens, wherever it was earned: the quiz, the question of the day,
 * an import, or the daily check-in. Mounted once inside the StoreProvider;
 * the detection and pacing live in core's useMilestones, shared with the
 * phone.
 */
import { useEffect } from 'react'
import { useStore } from '@moneyquiz/core/store'
import { useMilestones } from '@moneyquiz/core/lib/milestones'
import { useSound } from '../../lib/sound'
import { MilestoneOverlay } from './MilestoneOverlay'

export function CelebrationHost() {
  const { game } = useStore()
  const { current, dismiss } = useMilestones(game)
  const play = useSound()

  useEffect(() => {
    if (current) play('sparkle')
    // Once per milestone shown; flipping the Sounds switch mid-moment shouldn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  if (!current) return null
  return <MilestoneOverlay milestone={current} onClose={dismiss} />
}
