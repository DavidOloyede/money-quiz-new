/**
 * Omer on the phone, the twin of the web's Omer (docs/DESIGN.md "Omer, the
 * mascot"): core's drawing (lib/omer.ts) rendered by react-native-svg, so
 * both apps draw the very same Omer. When the commissioned art arrives it
 * swaps in here, behind the same props. Below 64pt an outfit gives way to
 * plain Omer in his `pose`.
 *
 * He pops in, then plays his pose's or outfit's own move from the design
 * guide (core lib/omerMotion.ts, the same keyframes the web plays): the wave
 * rocks from the shoulder, the Coach does reps, the Hero's cape ripples. His
 * move loops for as long as he's on screen. SvgXml can't animate inside a
 * drawing, so a moving Omer is core's rig stacked in layers: still markup in
 * SvgXml layers, each moving part an Animated.View turning about its pivot,
 * and the cape's outline tweened as an animated path. Reduce motion (or
 * `motion="still"`) shows the one still drawing.
 *
 * In dark mode a faint cream rim (an iOS layer shadow, which follows the
 * drawing's own edge) keeps his ink outline from vanishing into a dark card.
 */
import { memo, useEffect, useMemo, type ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { G, Path, SvgXml } from 'react-native-svg'
import { omerSvg, type OmerOutfit, type OmerPose } from '@moneyquiz/core/lib/omer'
import {
  CAPE_ORDER,
  CAPE_SHAPES,
  CAPE_TIMES,
  fullFrame,
  isGroup,
  moveRuns,
  OMER_ENTRANCE_MS,
  OMER_MOVES,
  omerRig,
  type OmerMove,
  type OmerNode,
  type OmerPart,
} from '@moneyquiz/core/lib/omerMotion'
import { linen } from '@moneyquiz/core/theme'
import { useAppTheme } from '@/theme'

/** 'move' (the default) plays his move; 'none' only pops him in; 'still' doesn't move at all. */
export type OmerMotion = 'move' | 'none' | 'still'

export function Omer({
  pose = 'idle',
  outfit,
  size = 120,
  motion = 'move',
  label,
  style,
}: {
  pose?: OmerPose
  outfit?: OmerOutfit
  size?: number
  motion?: OmerMotion
  /** Read aloud by VoiceOver when he carries meaning; leave unset when he's decoration. */
  label?: string
  style?: ViewStyle
}) {
  const reduce = useReducedMotion()
  const { theme } = useAppTheme()
  const still = reduce || motion === 'still'
  const moving = !still && motion === 'move'
  const rig = useMemo(() => (moving ? omerRig({ pose, outfit, size }) : null), [moving, pose, outfit, size])
  const xml = useMemo(() => (moving ? '' : omerSvg({ pose, outfit, size })), [moving, pose, outfit, size])
  const enter = useSharedValue(still ? 1 : 0)

  useEffect(() => {
    if (still) return
    // The reward overshoot (DESIGN.md), so he lands with a little bounce.
    enter.value = withTiming(1, { duration: OMER_ENTRANCE_MS, easing: Easing.bezier(0.34, 1.56, 0.64, 1) })
  }, [still, enter])

  const popIn = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.7),
    transform: [{ translateY: (1 - enter.value) * size * 0.1 }, { scale: 0.6 + 0.4 * enter.value }],
  }))

  const unit = size / 200
  return (
    <Animated.View
      pointerEvents="none"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
      style={[
        { width: size, height: size, transformOrigin: 'bottom' },
        theme === 'dark' && { shadowColor: linen['300'], shadowOpacity: 0.6, shadowRadius: 1.5, shadowOffset: { width: 0, height: 0 } },
        style,
        popIn,
      ]}
    >
      {rig ? (
        <View style={{ position: 'absolute', left: -PAD * unit, top: -PAD * unit, width: CANVAS * unit, height: CANVAS * unit }}>
          <Layers nodes={rig} unit={unit} />
        </View>
      ) : (
        <SvgXml xml={xml} width={size} height={size} />
      )}
    </Animated.View>
  )
}

/* Every layer draws on one canvas a little bigger than Omer's 200-unit grid,
   so a spark or a raised prop just past the edge isn't clipped. */
const PAD = 24
const CANVAS = 200 + 2 * PAD
const VIEWBOX = `${-PAD} ${-PAD} ${CANVAS} ${CANVAS}`

/**
 * The rig in drawing order: runs of still markup become one SvgXml layer each,
 * moving parts their own animated layer. `wrap` carries the drawing's open
 * <g …> tags (a body group, a stroke group) around the markup inside them.
 */
function Layers({ nodes, unit, wrap = [] }: { nodes: readonly OmerNode[]; unit: number; wrap?: readonly string[] }) {
  const out: ReactNode[] = []
  let markup = ''
  const flush = () => {
    if (!markup) return
    out.push(<StillLayer key={out.length} markup={wrap.join('') + markup + '</g>'.repeat(wrap.length)} unit={unit} />)
    markup = ''
  }
  for (const n of nodes) {
    if (typeof n === 'string') {
      markup += n
      continue
    }
    flush()
    if (isGroup(n)) out.push(<Layers key={out.length} nodes={n.children} unit={unit} wrap={[...wrap, n.open]} />)
    else if (n.move === 'cape') out.push(<CapeLayer key={out.length} part={n} wrap={wrap} unit={unit} />)
    else
      out.push(
        <MovingPart key={out.length} part={n} unit={unit}>
          <Layers nodes={n.children} unit={unit} wrap={wrap} />
        </MovingPart>,
      )
  }
  flush()
  return <>{out}</>
}

const StillLayer = memo(function StillLayer({ markup, unit }: { markup: string; unit: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">${markup}</svg>`
  return <SvgXml xml={xml} width={CANVAS * unit} height={CANVAS * unit} style={StyleSheet.absoluteFill} />
})

/** Milliseconds into a move: after his entrance and the part's own delay, looping (or once, for an entrance). */
function useMoveClock(move: OmerMove, delay: number): SharedValue<number> {
  const { ms } = OMER_MOVES[move]
  const runs = moveRuns(move)
  const clock = useSharedValue(0)
  useEffect(() => {
    // A negative begin starts part-way through a cycle, like the web's negative
    // delay, so staggered parts (the sparkles, the Z's) stay out of step.
    const begin = OMER_ENTRANCE_MS + delay * 1000
    const linear = { easing: Easing.linear }
    if (!Number.isFinite(runs)) {
      const skip = Math.max(0, -begin) % ms
      const lap = withSequence(withTiming(0, { duration: 0 }), withTiming(ms, { duration: ms, ...linear }))
      clock.value = skip
      clock.value = withDelay(Math.max(0, begin), withSequence(withTiming(ms, { duration: ms - skip, ...linear }), withRepeat(lap, -1, false)))
    } else {
      const total = runs * ms
      const skip = Math.min(total, Math.max(0, -begin))
      clock.value = skip
      clock.value = withDelay(Math.max(0, begin), withTiming(total, { duration: total - skip, ...linear }))
    }
    return () => cancelAnimation(clock)
  }, [clock, ms, runs, delay])
  return clock
}

/** How far through its cycle a move is, 0 to 1; held at 1 once an entrance has played. */
function cycleAt(clock: number, ms: number, runs: number): number {
  'worklet'
  if (runs !== Infinity && clock >= runs * ms) return 1
  return (clock % ms) / ms
}

/** A CSS-style cubic-bézier, solved for x (Newton's method, then halving as a fallback). */
function bezier(e: readonly number[], x: number): number {
  'worklet'
  if (x <= 0) return 0
  if (x >= 1) return 1
  const cx = 3 * e[0]
  const bx = 3 * (e[2] - e[0]) - cx
  const ax = 1 - cx - bx
  const cy = 3 * e[1]
  const by = 3 * (e[3] - e[1]) - cy
  const ay = 1 - cy - by
  let t = x
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x
    if (Math.abs(err) < 1e-5) break
    const slope = (3 * ax * t + 2 * bx) * t + cx
    if (Math.abs(slope) < 1e-6) break
    t -= err / slope
  }
  if (Math.abs(((ax * t + bx) * t + cx) * t - x) > 1e-4) {
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24; i++) {
      const v = ((ax * t + bx) * t + cx) * t
      if (Math.abs(v - x) < 1e-5) break
      if (v < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
  }
  return ((ay * t + by) * t + cy) * t
}

/** Which stretch of a keyframe list `p` falls in, and how far along it (eased). */
function segmentAt(times: readonly number[], eases: readonly (readonly number[])[], p: number): [number, number] {
  'worklet'
  let i = 0
  while (i < times.length - 2 && p > times[i + 1]) i++
  const span = times[i + 1] - times[i]
  return [i, bezier(eases[i], span > 0 ? (p - times[i]) / span : 1)]
}

function MovingPart({ part, unit, children }: { part: OmerPart; unit: number; children: ReactNode }) {
  const spec = OMER_MOVES[part.move]
  const runs = moveRuns(part.move)
  const clock = useMoveClock(part.move, part.delay)
  const { frames, times, eases } = useMemo(
    () => ({
      frames: spec.frames.map(fullFrame),
      times: spec.frames.map((f) => f.at),
      eases: spec.frames.map((f) => [...(f.ease ?? spec.ease)]),
    }),
    [spec],
  )
  const { ms } = spec
  const moved = useAnimatedStyle(() => {
    const [i, k] = segmentAt(times, eases, cycleAt(clock.value, ms, runs))
    const a = frames[i]
    const b = frames[i + 1]
    const mix = (from: number, to: number) => from + (to - from) * k
    return {
      opacity: mix(a.opacity, b.opacity),
      transform: [
        { translateX: mix(a.x, b.x) * unit },
        { translateY: mix(a.y, b.y) * unit },
        { rotate: `${mix(a.rotate, b.rotate)}deg` },
        { scaleX: mix(a.sx, b.sx) },
        { scaleY: mix(a.sy, b.sy) },
        { skewX: `${mix(a.skewX, b.skewX)}deg` },
      ],
    }
  })
  const pivot = { transformOrigin: [(part.origin[0] + PAD) * unit, (part.origin[1] + PAD) * unit, 0] }
  return <Animated.View style={[StyleSheet.absoluteFill, pivot, moved]}>{children}</Animated.View>
}

const AnimatedPath = Animated.createAnimatedComponent(Path)
const NUMBER = /-?\d*\.?\d+/g

/** A path element's own attributes (fill, stroke…) as react-native-svg props. */
function pathProps(el: string): Record<string, string> {
  const props: Record<string, string> = {}
  for (const [, key, value] of el.matchAll(/([a-z-]+)="([^"]*)"/g))
    if (key !== 'd') props[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value
  return props
}

/** One of the cape's outlines, tweened between CAPE_SHAPES on the move's clock. */
function useMorph(shapes: readonly string[], clock: SharedValue<number>) {
  const spec = OMER_MOVES.cape
  const runs = moveRuns('cape')
  const { numbers, pieces, eases } = useMemo(
    () => ({
      numbers: CAPE_ORDER.map((i) => shapes[i].match(NUMBER)!.map(Number)),
      pieces: shapes[0].split(NUMBER),
      eases: CAPE_TIMES.map(() => [...spec.ease]),
    }),
    [shapes, spec],
  )
  const times = CAPE_TIMES as readonly number[]
  const { ms } = spec
  return useAnimatedProps(() => {
    const [i, k] = segmentAt(times, eases, cycleAt(clock.value, ms, runs))
    const a = numbers[i]
    const b = numbers[i + 1]
    let d = pieces[0]
    for (let j = 0; j < a.length; j++) d += (a[j] + (b[j] - a[j]) * k).toFixed(2) + pieces[j + 1]
    return { d }
  })
}

/** The Hero's cape, rippling in the wind inside his (transformed) body group. */
function CapeLayer({ part, wrap, unit }: { part: OmerPart; wrap: readonly string[]; unit: number }) {
  const clock = useMoveClock('cape', part.delay)
  const cape = useMorph(CAPE_SHAPES.cape, clock)
  const folds = useMorph(CAPE_SHAPES.folds, clock)
  const markup = part.children.filter((c): c is string => typeof c === 'string').join('')
  const [capeEl, foldsEl] = markup.match(/<path[^>]*\/>/g) ?? []
  const transform = wrap
    .map((open) => open.match(/transform="([^"]+)"/)?.[1])
    .filter(Boolean)
    .join(' ')
  return (
    <Svg width={CANVAS * unit} height={CANVAS * unit} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
      <G transform={transform || undefined}>
        <AnimatedPath {...pathProps(capeEl ?? '')} d={CAPE_SHAPES.cape[0]} animatedProps={cape} />
        <AnimatedPath {...pathProps(foldsEl ?? '')} d={CAPE_SHAPES.folds[0]} animatedProps={folds} />
      </G>
    </Svg>
  )
}
