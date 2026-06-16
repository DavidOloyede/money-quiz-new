/**
 * Admin panel data. Every route is behind requireAdmin (role === 'admin').
 * Admins can read users, the activity log, and all support tickets, and can
 * answer tickets — but there is deliberately no route exposing user_slices,
 * so admins never see anyone's financial data.
 */
import type { FastifyInstance } from 'fastify'
import { and, asc, count, countDistinct, desc, eq, gte, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '../auth/middleware'
import { db, schema } from '../db/client'
import { serializeEvent, serializeMessage, serializeProfile, serializeTicket } from '../db/serialize'

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
})
const replySchema = z.object({ body: z.string().min(1).max(5000) })

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scoped) => {
    scoped.addHook('preHandler', requireAdmin)

    scoped.get('/api/admin/users', async () => {
      const rows = await db
        .select()
        .from(schema.profiles)
        .orderBy(desc(schema.profiles.createdAt))
      return { users: rows.map(serializeProfile) }
    })

    scoped.get('/api/admin/metrics', async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600_000)
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000)
      const [users] = await db.select({ n: count() }).from(schema.profiles)
      const [dau] = await db
        .select({ n: countDistinct(schema.activityEvents.userId) })
        .from(schema.activityEvents)
        .where(gte(schema.activityEvents.createdAt, dayAgo))
      const [wau] = await db
        .select({ n: countDistinct(schema.activityEvents.userId) })
        .from(schema.activityEvents)
        .where(gte(schema.activityEvents.createdAt, weekAgo))
      const [open] = await db
        .select({ n: count() })
        .from(schema.supportTickets)
        .where(sql`${schema.supportTickets.status} in ('open','in_progress')`)
      const [events24h] = await db
        .select({ n: count() })
        .from(schema.activityEvents)
        .where(gte(schema.activityEvents.createdAt, dayAgo))
      return {
        users: users.n,
        dau: dau.n,
        wau: wau.n,
        open_tickets: open.n,
        events_24h: events24h.n,
      }
    })

    scoped.get('/api/admin/events', async (req) => {
      const q = req.query as { user?: string; name?: string; limit?: string; offset?: string }
      const limit = Math.min(Number(q.limit) || 100, 200)
      const offset = Number(q.offset) || 0
      const filters = []
      if (q.user) filters.push(eq(schema.activityEvents.userId, q.user))
      if (q.name) filters.push(ilike(schema.activityEvents.name, `${q.name}%`))
      const rows = await db
        .select()
        .from(schema.activityEvents)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(schema.activityEvents.createdAt))
        .limit(limit)
        .offset(offset)
      return { events: rows.map(serializeEvent) }
    })

    scoped.get('/api/admin/tickets', async () => {
      const rows = await db
        .select()
        .from(schema.supportTickets)
        .orderBy(desc(schema.supportTickets.updatedAt))
      return { tickets: rows.map(serializeTicket) }
    })

    scoped.get('/api/admin/tickets/:id/messages', async (req) => {
      const ticketId = (req.params as { id: string }).id
      const rows = await db
        .select()
        .from(schema.ticketMessages)
        .where(eq(schema.ticketMessages.ticketId, ticketId))
        .orderBy(asc(schema.ticketMessages.createdAt))
      return { messages: rows.map(serializeMessage) }
    })

    scoped.patch('/api/admin/tickets/:id', async (req, reply) => {
      const ticketId = (req.params as { id: string }).id
      const parsed = statusSchema.safeParse(req.body)
      if (!parsed.success) {
        await reply.code(400).send({ error: 'Invalid status.' })
        return
      }
      await db
        .update(schema.supportTickets)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(schema.supportTickets.id, ticketId))
      return { ok: true }
    })

    scoped.post('/api/admin/tickets/:id/messages', async (req, reply) => {
      const ticketId = (req.params as { id: string }).id
      const parsed = replySchema.safeParse(req.body)
      if (!parsed.success) {
        await reply.code(400).send({ error: 'Message body required.' })
        return
      }
      const [row] = await db
        .insert(schema.ticketMessages)
        .values({ ticketId, authorId: req.user!.id, body: parsed.data.body })
        .returning()
      await db
        .update(schema.supportTickets)
        .set({ updatedAt: new Date() })
        .where(eq(schema.supportTickets.id, ticketId))
      return { message: serializeMessage(row) }
    })
  })
}
