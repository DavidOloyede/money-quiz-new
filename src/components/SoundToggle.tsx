/**
 * The speaker button on the quiz (docs/DESIGN.md "Sound": always mutable).
 * It flips the same per-device setting as the Sounds switch in Settings.
 */
import { useStore } from '@moneyquiz/core/store'
import { SpeakerIcon, SpeakerOffIcon } from './icons'

export function SoundToggle() {
  const { sound, setSound } = useStore()
  return (
    <button
      type="button"
      onClick={() => setSound(!sound)}
      aria-pressed={sound}
      aria-label={sound ? 'Turn sounds off' : 'Turn sounds on'}
      title={sound ? 'Sounds on' : 'Sounds off'}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-linen-500 transition-colors duration-150 hover:bg-linen-100 hover:text-linen-800 dark:text-linen-400 dark:hover:bg-linen-800 dark:hover:text-linen-100"
    >
      {sound ? <SpeakerIcon className="h-5 w-5" /> : <SpeakerOffIcon className="h-5 w-5" />}
    </button>
  )
}
