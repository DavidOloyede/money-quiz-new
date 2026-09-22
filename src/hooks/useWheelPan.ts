import { useEffect, type RefObject } from 'react'

/**
 * Lets a wide-but-short scroll container be panned sideways with a plain
 * mouse wheel. Browsers only map the wheel to horizontal scroll when Shift is
 * held, so a table that overflows horizontally but not vertically can't be
 * reached by wheel alone. This translates the wheel's vertical delta into
 * horizontal movement, but only while the pointer is over the container (wheel
 * events fire on the element under the cursor) and only when there's no
 * vertical scrolling to consume the gesture first. While panning, the wheel
 * belongs entirely to the container — including at either end of the travel,
 * so running out of table never spills over into scrolling the page behind it.
 */

/** Firefox reports wheel deltas in lines rather than pixels; roughly a row. */
const LINE_HEIGHT = 16

export function useWheelPan(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      // A trackpad's own sideways swipe already scrolls natively.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (el.scrollHeight > el.clientHeight) return
      if (el.scrollWidth <= el.clientWidth) return

      e.preventDefault()
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])
}
