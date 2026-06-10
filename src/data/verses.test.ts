import { describe, expect, it } from 'vitest'
import { verseForDay, VERSES } from './verses'

describe('VERSES', () => {
  it('has a healthy rotation of complete, unique verses', () => {
    expect(VERSES.length).toBeGreaterThanOrEqual(40)
    const refs = VERSES.map((v) => v.reference)
    expect(new Set(refs).size).toBe(refs.length)
    for (const v of VERSES) {
      expect(v.text.trim()).toBeTruthy()
      expect(v.reference.trim()).toBeTruthy()
    }
  })
})

describe('verseForDay', () => {
  it('is deterministic for a given date and stable across the day', () => {
    const morning = verseForDay(new Date(2026, 5, 9, 0, 1))
    const night = verseForDay(new Date(2026, 5, 9, 23, 59))
    expect(morning).toBe(night)
  })

  it('changes from one day to the next', () => {
    const today = verseForDay(new Date(2026, 5, 9))
    const tomorrow = verseForDay(new Date(2026, 5, 10))
    expect(today.reference).not.toBe(tomorrow.reference)
  })

  it('cycles through the whole list', () => {
    const seen = new Set<string>()
    for (let i = 0; i < VERSES.length; i++) {
      seen.add(verseForDay(new Date(2026, 0, 1 + i)).reference)
    }
    expect(seen.size).toBe(VERSES.length)
  })
})
