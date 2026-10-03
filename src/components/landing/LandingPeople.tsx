/**
 * "Small wins, every morning": the landing's row of people. Many households
 * and many faces (the shared cast in packages/core, which leans toward the
 * deepest skin tones), each in a little dawn arch with the kind of small win
 * the app is built around. They're illustrations, not testimonials: no
 * names, no quotes.
 *
 * Motion follows the rest of the landing: everyone sways gently out of step
 * while manna drifts behind them, and the win chips pop in each time the row
 * reaches the middle of the screen (useReplayInView). Reduce motion keeps
 * the finished picture.
 */
import type { CSSProperties } from 'react'
import { CAST } from '@moneyquiz/core/data/people'
import { Person } from '../people/Person'
import { useReplayInView } from './useReplayInView'
import { BODY, COLUMN, HEADING, SECTION } from './styles'
import './people.css'

/* A few slow flakes behind the row: [left %, size px, seconds per fall, start offset]. */
const DRIFT: [number, number, number, number][] = [
  [6, 10, 9, -2],
  [18, 7, 11, -7],
  [33, 9, 10, -4],
  [52, 6, 12, -9],
  [67, 10, 9.5, -1],
  [81, 8, 11.5, -6],
  [94, 7, 10.5, -3],
]

export function LandingPeople() {
  const [ref, phase] = useReplayInView<HTMLUListElement>()
  return (
    <section id="landing-people" aria-labelledby="people-heading" className={`${SECTION} relative isolate overflow-hidden`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {DRIFT.map(([left, size, dur, delay], i) => (
          <span
            key={i}
            className="people-flake absolute top-0 rounded-full bg-honey-300/70 dark:bg-honey-400/40"
            style={{ left: `${left}%`, width: size, height: size, '--dur': `${dur}s`, '--delay': `${delay}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className={COLUMN}>
        <div className="text-center">
          <h2 id="people-heading" className={HEADING}>
            Small wins, every morning
          </h2>
          <p className={`${BODY} mx-auto mt-5 max-w-[560px] text-pretty`}>
            Families, students, grandparents and new grads, each gathering their daily bread one small win at
            a time. Manna Money is for every household.
          </p>
        </div>

        <ul ref={ref} data-motion={phase} className="people-row mx-auto mt-14 flex max-w-[860px] flex-wrap justify-center gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10">
          {CAST.map((c, i) => {
            const waving = i % 4 === 1
            return (
              <li
                key={c.id}
                className="flex w-[106px] flex-col items-center sm:w-[148px]"
                style={{ '--i': i } as CSSProperties}
              >
                <div className="people-arch relative h-[122px] w-[104px] overflow-hidden sm:h-[156px] sm:w-[136px] rounded-t-full rounded-b-3xl bg-linear-to-b from-cream via-honey-100 to-sky-100 ring-1 ring-honey-200 dark:from-sky-950 dark:via-linen-900 dark:to-honey-950/60 dark:ring-linen-700">
                  <div
                    className={`person-bob absolute inset-x-0 -bottom-2 ${waving ? 'person-wave' : ''}`}
                    style={
                      {
                        '--d': `${-(i * 0.7) % 3.6}s`,
                        '--bob': `${3.2 + (i % 3) * 0.4}s`,
                        '--tilt': i % 2 ? '-1.5deg' : '1.5deg',
                      } as CSSProperties
                    }
                  >
                    <Person spec={c} pose={waving ? 'wave' : 'smile'} className="mx-auto h-[118px] w-[101px] sm:h-[150px] sm:w-[129px]" />
                  </div>
                </div>
                <span className="people-chip relative z-10 -mt-4 inline-flex max-w-full items-center gap-1 rounded-full bg-cream px-2 py-1 text-center font-rounded text-[11.5px] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px] leading-tight font-extrabold text-forest-800 shadow-[0_3px_0_var(--color-forest-200)] ring-2 ring-forest-200 dark:bg-linen-900 dark:text-forest-300 dark:shadow-[0_3px_0_var(--color-forest-900)] dark:ring-forest-800">
                  <span aria-hidden>{c.emoji}</span>
                  {c.win}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
