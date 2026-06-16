/**
 * Request authentication. `requireUser` verifies the bearer token, ensures a
 * profile row exists (get-or-create), and attaches the resolved user to the
 * request. Every data route derives the user id from HERE — never from the
 * request body — so a client can't act as another user. `requireAdmin` adds a
 * role check on top.
 */
import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { env } from '../env'
import { verifyToken } from './verify'

export interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization
  if (!h) return null
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m ? m[1] : null
}

/** Verify, then load-or-create the profile, then stash req.user. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = bearer(req)
  if (!token) {
    await reply.code(401).send({ error: 'Sign in required.' })
    return
  }

  let claims
  try {
    claims = await verifyToken(token)
  } catch {
    await reply.code(401).send({ error: 'Invalid or expired session.' })
    return
  }

  const existing = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, claims.sub))
    .limit(1)

  let profile = existing[0]
  if (!profile) {
    const role = claims.email && claims.email === env.ADMIN_EMAIL ? 'admin' : 'user'
    const inserted = await db
      .insert(schema.profiles)
      .values({ id: claims.sub, email: claims.email, role })
      .onConflictDoNothing()
      .returning()
    profile =
      inserted[0] ??
      (
        await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, claims.sub))
          .limit(1)
      )[0]
  }

  req.user = {
    id: profile.id,
    email: profile.email,
    role: profile.role === 'admin' ? 'admin' : 'user',
  }
}

/** requireUser + admin role. Use as the only preHandler on admin routes. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireUser(req, reply)
  if (reply.sent) return
  if (req.user?.role !== 'admin') {
    await reply.code(403).send({ error: 'Admin only.' })
  }
}
