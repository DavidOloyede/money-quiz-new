/**
 * Draws one illustrated person from the shared cast in packages/core — the
 * phone's twin of the web's people/Person.tsx, mapping the same plain shapes
 * (lib/people.ts) onto react-native-svg, so both apps show the very same
 * characters. Motion (a sway, a cheer) is applied by the parent view.
 */
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'
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
  if (s.kind === 'circle') return <Circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />
  if (s.kind === 'ellipse') return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />
  return <Path d={s.d} {...paint} />
}

export function Person({ spec, pose = 'smile', width = 72 }: { spec: PersonSpec; pose?: Pose; width?: number }) {
  const parts = personShapes(spec, pose)
  const height = (width * PERSON_VIEWBOX.height) / PERSON_VIEWBOX.width
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${PERSON_VIEWBOX.width} ${PERSON_VIEWBOX.height}`} accessible={false}>
      {[parts.armLeft, parts.armRight, parts.body, parts.head].map((group, g) => (
        <G key={g}>
          {group.map((s, i) => (
            <ShapeEl key={i} s={s} />
          ))}
        </G>
      ))}
    </Svg>
  )
}
