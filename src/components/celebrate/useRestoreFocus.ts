/**
 * Hands focus back to whatever had it when a celebration opened ("Next
 * question", say), so Enter and Tab carry on where they left off once it
 * closes. Call it before the overlay moves focus to itself.
 */
import { useEffect } from 'react'

export function useRestoreFocus(): void {
  useEffect(() => {
    const prev = document.activeElement
    return () => {
      if (prev instanceof HTMLElement && prev !== document.body && prev.isConnected) prev.focus({ preventScroll: true })
    }
  }, [])
}
