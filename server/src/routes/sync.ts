/**
 * Cloud mirror of the client's localStorage slices. The user id always comes
 * from the verified JWT (req.user), never the body, so one account can't write
 * another's slices.
 */
import type { FastifyInstance } from 'fastify'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireUser } from '../auth/middleware'
import { db, schema } from '../db/client'

const sliceSchema = z.object({
  slices: z.array(z.object({ key: z.string().min(1), value: z.unknown() })).max(100),
})

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  // Pull every slice for the user.
  app.get('/api/sync', { preHandler: requireUser }, async (req) => {
    const rows = await db
      .select({ key: schema.userSlices.key, value: schema.userSlices.value })
      .from(schema.userSlices)
      .where(eq(schema.userSlices.userId, req.user!.id))
    return { slices: rows }
  })

  // Upsert a batch of slices (bumps rev + updated_at on conflict).
  app.post('/api/sync', { preHandler: requireUser }, async (req, reply) => {
    const parsed = sliceSchema.safeParse(req.body)
    if (!parsed.success) {
      await reply.code(400).send({ error: 'Invalid sync payload.' })
      return
    }
    const { slices } = parsed.data
    if (slices.length === 0) return { ok: true }

    const userId = req.user!.id
    await db
      .insert(schema.userSlices)
      .values(slices.map((s) => ({ userId, key: s.key, value: s.value })))
      .onConflictDoUpdate({
        target: [schema.userSlices.userId, schema.userSlices.key],
        set: {
          value: sql`excluded.value`,
          rev: sql`${schema.userSlices.rev} + 1`,
          updatedAt: sql`now()`,
        },
      })
    return { ok: true }
  })

  // Wipe all the user's slices ("Clear all data").
  app.delete('/api/sync', { preHandler: requireUser }, async (req) => {
    await db.delete(schema.userSlices).where(eq(schema.userSlices.userId, req.user!.id))
    return { ok: true }
  })

  // Delete one slice (kept for symmetry; not used by the client yet).
  app.delete('/api/sync/:key', { preHandler: requireUser }, async (req) => {
    const key = (req.params as { key: string }).key
    await db
      .delete(schema.userSlices)
      .where(and(eq(schema.userSlices.userId, req.user!.id), eq(schema.userSlices.key, key)))
    return { ok: true }
  })
}
