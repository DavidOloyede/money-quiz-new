/**
 * One multiple-choice answer, shared by the quiz and the question of the day
 * so both play the same moment (docs/DESIGN.md "Celebration moments"):
 *
 * - right: the tile pops green, the check springs in, manna bursts out and
 *   "+10 XP" floats up (only on the answer just picked, so reviewing a quiz
 *   later stays calm);
 * - not quite: a gentle shake, a coral outline and a cross, while the right
 *   answer lights up beside it.
 *
 * Every state carries an icon or words, not colour alone. The number tag
 * matches the 1–4 keyboard shortcuts the quiz listens for.
 */
import { CheckIcon, XIcon } from './icons'
import { RewardBurst } from './celebrate/RewardBurst'

interface Props {
  label: string
  index: number
  answered: boolean
  isCorrect: boolean
  isChosen: boolean
  /** True only for the question just answered: play the pop / shake / burst. */
  celebrate: boolean
  /** XP to float up from a right pick (omit to show just the flakes). */
  xp?: number
  onChoose: () => void
  compact?: boolean
}

const IDLE =
  'cursor-pointer border-linen-200 bg-cream text-linen-800 shadow-[0_3px_0_var(--color-linen-200)] hover:border-forest-300 hover:bg-forest-50/60 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-linen-200)] dark:border-linen-700 dark:bg-linen-900 dark:text-linen-100 dark:shadow-[0_3px_0_var(--color-linen-700)] dark:hover:border-forest-500/60 dark:hover:bg-forest-500/10'
const RIGHT =
  'border-forest-500 bg-forest-50 text-forest-800 shadow-[0_3px_0_var(--color-forest-500)] dark:bg-forest-500/15 dark:text-forest-200'
const WRONG =
  'border-coral-400 bg-coral-50 text-coral-800 shadow-[0_3px_0_var(--color-coral-400)] dark:border-coral-500/70 dark:bg-coral-500/10 dark:text-coral-300'
const FADED =
  'border-linen-200 bg-cream text-linen-400 dark:border-linen-700 dark:bg-linen-900 dark:text-linen-500'

export function AnswerChoice({ label, index, answered, isCorrect, isChosen, celebrate, xp, onChoose, compact }: Props) {
  const right = answered && isCorrect
  const wrong = answered && isChosen && !isCorrect
  const tone = !answered ? IDLE : right ? RIGHT : wrong ? WRONG : FADED
  const motion = celebrate ? (right ? 'answer-pop' : wrong ? 'answer-shake' : '') : ''

  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={answered}
      className={`relative flex w-full items-center gap-3 rounded-2xl border-2 text-left font-rounded font-bold transition-[background-color,border-color,color,translate,box-shadow] duration-150 disabled:cursor-default ${
        compact ? 'px-3 py-2.5 text-[15px]' : 'px-4 py-3.5 text-base'
      } ${tone} ${motion}`}
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs tabular-nums ${
          right
            ? 'border-forest-500 text-forest-700 dark:text-forest-300'
            : wrong
              ? 'border-coral-400 text-coral-700 dark:text-coral-300'
              : 'border-linen-200 text-linen-400 dark:border-linen-700 dark:text-linen-500'
        }`}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {right && (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white ${celebrate ? 'mark-in' : ''}`}>
          <CheckIcon className="h-4 w-4" />
          <span className="sr-only">{isChosen ? 'Your answer, correct' : 'The correct answer'}</span>
        </span>
      )}
      {wrong && (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-600 text-white ${celebrate ? 'mark-in' : ''}`}>
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Your answer, not quite</span>
        </span>
      )}
      {celebrate && right && isChosen && <RewardBurst xp={xp} />}
    </button>
  )
}
