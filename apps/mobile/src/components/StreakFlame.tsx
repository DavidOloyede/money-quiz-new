/**
 * The small streak flame, the twin of the web's StreakFlame (docs/DESIGN.md),
 * drawn instead of the 🔥 emoji: coral with a honey core once today has
 * counted, faded and grey until then. `size` is its height; set it beside a
 * line of text in a row (an Svg can't sit inside a Text).
 */
import Svg, { Path } from 'react-native-svg'
import { FLAME_ICON_ASPECT, FLAME_ICON_PATHS, FLAME_ICON_VIEWBOX } from '@moneyquiz/core/lib/streak'
import { coral, honey, linen } from '@moneyquiz/core/theme'

export function StreakFlame({ lit = true, size = 16 }: { lit?: boolean; size?: number }) {
  return (
    <Svg width={size * FLAME_ICON_ASPECT} height={size} viewBox={FLAME_ICON_VIEWBOX} style={{ opacity: lit ? 1 : 0.5 }}>
      <Path
        d={FLAME_ICON_PATHS.body}
        fill={lit ? coral['400'] : linen['400']}
        stroke={lit ? coral['700'] : linen['600']}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d={FLAME_ICON_PATHS.core} fill={lit ? honey['300'] : linen['200']} />
    </Svg>
  )
}
