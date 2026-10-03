/**
 * Draws one illustrated person (or a small row of them) from the shared cast
 * in packages/core: the shapes come from lib/people.ts, so the web and the
 * phone show the very same characters. Arms, body and head are separate
 * groups (person-arm-l / -r / -body / -head) so CSS can wave or nod them.
 */
import type { CSSProperties } from 'react'
import { PERSON_VIEWBOX, personShapes, type PersonSpec, type Pose, type Shape } from '@moneyquiz/core/lib/people'

function ShapeEl({ s }: { s: Shape }) {
  const paint = {
    // An unfilled SVG shape would default to black; strokes-only stay hollow.
    fill: s.fill ?? 'none',
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    opacity: s.opacity,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (s.kind === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />
  if (s.kind === 'ellipse') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />
  return <path d={s.d} {...paint} />
}

const group = (shapes: Shape[], className: string) => (
  <g className={className}>
    {shapes.map((s, i) => (
      <ShapeEl key={i} s={s} />
    ))}
  </g>
)

export function Person({
  spec,
  pose = 'smile',
  className = '',
  style,
}: {
  spec: PersonSpec
  pose?: Pose
  className?: string
  style?: CSSProperties
}) {
  const parts = personShapes(spec, pose)
  return (
    <svg
      viewBox={`0 0 ${PERSON_VIEWBOX.width} ${PERSON_VIEWBOX.height}`}
      className={className}
      style={style}
      aria-hidden
    >
      {group(parts.armLeft, 'person-arm-l')}
      {group(parts.armRight, 'person-arm-r')}
      {group(parts.body, 'person-body')}
      {group(parts.head, 'person-head')}
    </svg>
  )
}
