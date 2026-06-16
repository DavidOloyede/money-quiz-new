/**
 * Activity events ingest. The client batches small events; we stamp them with
 * the JWT-derived user id. Props are expected to carry no financial details
 * (enforced on the client) — we just store what we're given.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/middleware'
import { db, schema } from '../db/client'

const bodySchema = z.object({
  events: z
    .array(
      z.object({
        session_id: z.string().min(1),
        name: z.string().min(1).max(120),
        props: z.record(z.unknown()).default({}),
        client_ts: z.string().datetime().optional(),
      }),
    )
    .max(100),
})

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/events', { preHandler: requireUser }, async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      await reply.code(400).send({ error: 'Invalid events payload.' })
      return
    }
    const { events } = parsed.data
    if (events.length === 0) return { ok: true }

    const userId = req.user!.id
    await db.insert(schema.activityEvents).values(
      events.map((e) => ({
        userId,
        sessionId: e.session_id,
        name: e.name,
        props: e.props,
        clientTs: e.client_ts ? new Date(e.client_ts) : new Date(),
      })),
    )
    return { ok: true }
  })
}
