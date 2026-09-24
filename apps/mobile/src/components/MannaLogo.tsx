/**
 * The Manna Money mark, the same drawing as the web's MannaLogo: three
 * flakes falling into a bowl on a forest tile. Colors come from the shared
 * theme ramps, so it matches the web exactly.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { forest, honey } from '@moneyquiz/core/theme'

export function MannaLogo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" accessibilityLabel="Manna Money">
      <Rect width={32} height={32} rx={9} fill={forest['700']} />
      <Circle cx={10.6} cy={8.4} r={1.6} fill={honey['200']} />
      <Circle cx={21.4} cy={8.4} r={1.6} fill={honey['200']} />
      <Circle cx={16} cy={12.6} r={2.1} fill={honey['400']} />
      <Path
        d="M6.5 16.4c0 5.3 4.1 9 9.5 9s9.5-3.7 9.5-9Z"
        stroke={honey['400']}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M11.5 28.8h9" stroke={honey['400']} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}
