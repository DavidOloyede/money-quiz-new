import { describe, expect, it } from 'vitest'
import { isOpenDoor, parsePath, pathFor, pathForView, titleFor, viewRoute, type View } from './routes'

const VIEWS: View[] = ['import', 'dashboard', 'yearly', 'quiz', 'settings', 'account', 'admin']

describe('parsePath / pathFor', () => {
  it('round-trips every screen', () => {
    for (const v of VIEWS) expect(parsePath(pathForView(v))).toEqual(viewRoute(v))
  })

  it('reads the root as the home (landing) page', () => {
    expect(parsePath('/')).toEqual({ kind: 'home' })
    expect(parsePath('')).toEqual({ kind: 'home' })
    expect(pathFor({ kind: 'home' })).toBe('/')
  })

  it('ignores case and trailing slashes', () => {
    expect(parsePath('/Quiz/')).toEqual(viewRoute('quiz'))
    expect(parsePath('/DASHBOARD')).toEqual(viewRoute('dashboard'))
  })

  it('gives sign-in and sign-up their own addresses', () => {
    expect(parsePath('/signin')).toEqual(viewRoute('account', 'signin'))
    expect(parsePath('/signup')).toEqual(viewRoute('account', 'signup'))
    expect(parsePath('/login')).toEqual(viewRoute('account', 'signin'))
    expect(pathFor(viewRoute('account', 'signup'))).toBe('/signup')
    expect(pathFor(viewRoute('account', 'signin'))).toBe('/signin')
    expect(pathFor(viewRoute('account'))).toBe('/account')
  })

  it('accepts /year-sheet for the Year Sheet', () => {
    expect(parsePath('/year-sheet')).toEqual(viewRoute('yearly'))
    expect(pathFor(viewRoute('yearly'))).toBe('/year')
  })

  it('keeps an unknown address as a not-found route', () => {
    expect(parsePath('/nope')).toEqual({ kind: 'notFound', path: '/nope' })
    expect(pathFor(parsePath('/nope'))).toBe('/nope')
  })
})

describe('isOpenDoor', () => {
  it('lets a new visitor reach the landing and its own buttons only', () => {
    expect(isOpenDoor({ kind: 'home' })).toBe(true)
    expect(isOpenDoor(viewRoute('import'))).toBe(true)
    expect(isOpenDoor(viewRoute('account', 'signup'))).toBe(true)
    expect(isOpenDoor(viewRoute('quiz'))).toBe(false)
    expect(isOpenDoor(viewRoute('dashboard'))).toBe(false)
    expect(isOpenDoor(viewRoute('admin'))).toBe(false)
  })
})

describe('titleFor', () => {
  it('names the screen in the tab', () => {
    expect(titleFor(viewRoute('quiz'))).toBe('Quiz · Manna Money')
    expect(titleFor(viewRoute('yearly'))).toBe('Year Sheet · Manna Money')
    expect(titleFor(viewRoute('account', 'signup'))).toBe('Create an account · Manna Money')
    expect(titleFor({ kind: 'notFound', path: '/x' })).toBe('Page not found · Manna Money')
    expect(titleFor({ kind: 'home' })).toMatch(/^Manna Money/)
  })
})
