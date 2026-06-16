/**
 * Verify Supabase-issued auth JWTs. Newer projects sign asymmetrically and
 * expose a JWKS endpoint; older ones use a shared HS256 secret. We try JWKS
 * first (when SUPABASE_URL is set) and fall back to the HS256 secret.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../env'

export interface AuthClaims {
  sub: string
  email: string
}

const jwks = env.SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null

const hsKey = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null

export async function verifyToken(token: string): Promise<AuthClaims> {
  let payload: Record<string, unknown> | undefined

  if (jwks) {
    try {
      const res = await jwtVerify(token, jwks)
      payload = res.payload as Record<string, unknown>
    } catch {
      // Project may be on the legacy HS256 secret — fall through.
    }
  }
  if (!payload && hsKey) {
    const res = await jwtVerify(token, hsKey)
    payload = res.payload as Record<string, unknown>
  }
  if (!payload) throw new Error('No JWT verification method configured')

  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  const email = typeof payload.email === 'string' ? payload.email : ''
  if (!sub) throw new Error('Token missing subject')
  return { sub, email }
}
