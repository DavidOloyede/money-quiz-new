import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, beaconPost, configureApi, isCloudEnabled } from './api'

interface Call {
  url: string
  init: RequestInit
}

const calls: Call[] = []

function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

let nextResponse = respond(200, { ok: true })

beforeEach(() => {
  calls.length = 0
  nextResponse = respond(200, { ok: true })
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(nextResponse)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  // config is module state; put the safe local-only defaults back
  configureApi({ baseUrl: '/api', getToken: async () => null, cloudEnabled: false })
})

describe('configureApi defaults', () => {
  it('is local-only until a platform configures it', async () => {
    expect(isCloudEnabled()).toBe(false)
    await api.get('/me')
    expect(calls[0].url).toBe('/api/me')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('merges partial config over the defaults', async () => {
    configureApi({ cloudEnabled: true })
    expect(isCloudEnabled()).toBe(true)
    await api.get('/me')
    expect(calls[0].url).toBe('/api/me') // baseUrl untouched by the partial
  })

  it('uses the configured base URL and token getter', async () => {
    configureApi({
      baseUrl: 'https://api.example.test/api',
      getToken: async () => 'jwt-123',
      cloudEnabled: true,
    })
    await api.post('/sync', { slices: [] })
    expect(calls[0].url).toBe('https://api.example.test/api/sync')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt-123')
    expect(headers['Content-Type']).toBe('application/json')
  })
})

describe('request handling', () => {
  it('throws ApiError with the server message on non-2xx', async () => {
    nextResponse = respond(403, { error: 'Admin only' })
    const err = await api.get('/admin/users').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(403)
    expect((err as ApiError).message).toBe('Admin only')
  })

  it('omits Content-Type on bodyless requests', async () => {
    await api.post('/plaid/create_link_token')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()
  })
})

describe('beaconPost', () => {
  it('drops the send when there is no token', () => {
    beaconPost('/events', null, { events: [] })
    expect(calls).toHaveLength(0)
  })

  it('sends keepalive with the passed token against the configured base', () => {
    configureApi({ baseUrl: 'https://api.example.test/api' })
    beaconPost('/events', 'jwt-9', { events: [] })
    expect(calls[0].url).toBe('https://api.example.test/api/events')
    expect(calls[0].init.keepalive).toBe(true)
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt-9')
  })
})
