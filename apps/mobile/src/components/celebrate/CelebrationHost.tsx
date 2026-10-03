/**
 * Watches the game state and shows each milestone (a level-up, new badges)
 * as it happens, wherever it was earned: the quiz, the daily question, an
 * import, or opening the app on a new day. Mounted once at the root, inside
 * the StoreProvider; the detection and pacing are core's useMilestones,
 * shared with the web.
 */
import { useEffect } from 'react'
import { useStore } from '@moneyquiz/core'
import { useMilestones } from '@moneyquiz/core/lib/milestones'

import { haptic } from '@/lib/haptics'
import { useSound } from '@/lib/sound'
import { MilestoneOverlay } from './MilestoneOverlay'

export function CelebrationHost() {
  const { game } = useStore()
  const { current, dismiss } = useMilestones(game)
  const play = useSound()

  useEffect(() => {
    if (!current) return
    play('sparkle')
    haptic.success()
    // Once per milestone shown; flipping the Sounds switch mid-moment shouldn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  if (!current) return null
  return <MilestoneOverlay milestone={current} onClose={dismiss} />
}
