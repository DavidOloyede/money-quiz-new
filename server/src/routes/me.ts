/** GET /api/me — the signed-in user's full profile. */
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { requireUser } from '../auth/middleware'
import { db, schema } from '../db/client'

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/me', { preHandler: requireUser }, async (req) => {
    const rows = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.user!.id))
      .limit(1)
    const p = rows[0]
    return {
      id: p.id,
      email: p.email,
      display_name: p.displayName,
      role: p.role,
      created_at: p.createdAt,
    }
  })
}
