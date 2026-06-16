/**
 * Support tickets. Users create and read their own tickets and post messages;
 * ownership is checked against the JWT user on every route.
 */
import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireUser } from '../auth/middleware'
import { db, schema } from '../db/client'
import { serializeMessage, serializeTicket } from '../db/serialize'

const newTicket = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  category: z.string().max(40).optional(),
})

const newMessage = z.object({ body: z.string().min(1).max(5000) })

/** Returns the ticket if it belongs to the user (or null). */
async function ownTicket(userId: string, ticketId: string) {
  const rows = await db
    .select()
    .from(schema.supportTickets)
    .where(and(eq(schema.supportTickets.id, ticketId), eq(schema.supportTickets.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function ticketRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scoped) => {
    scoped.addHook('preHandler', requireUser)

    scoped.get('/api/tickets', async (req) => {
      const rows = await db
        .select()
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.userId, req.user!.id))
        .orderBy(desc(schema.supportTickets.updatedAt))
      return { tickets: rows.map(serializeTicket) }
    })

    scoped.post('/api/tickets', async (req, reply) => {
      const parsed = newTicket.safeParse(req.body)
      if (!parsed.success) {
        await reply.code(400).send({ error: 'Subject and description are required.' })
        return
      }
      const [row] = await db
        .insert(schema.supportTickets)
        .values({ ...parsed.data, userId: req.user!.id })
        .returning()
      return { ticket: serializeTicket(row) }
    })

    scoped.get('/api/tickets/:id/messages', async (req, reply) => {
      const ticketId = (req.params as { id: string }).id
      if (!(await ownTicket(req.user!.id, ticketId))) {
        await reply.code(404).send({ error: 'Ticket not found.' })
        return
      }
      const rows = await db
        .select()
        .from(schema.ticketMessages)
        .where(eq(schema.ticketMessages.ticketId, ticketId))
        .orderBy(asc(schema.ticketMessages.createdAt))
      return { messages: rows.map(serializeMessage) }
    })

    scoped.post('/api/tickets/:id/messages', async (req, reply) => {
      const ticketId = (req.params as { id: string }).id
      if (!(await ownTicket(req.user!.id, ticketId))) {
        await reply.code(404).send({ error: 'Ticket not found.' })
        return
      }
      const parsed = newMessage.safeParse(req.body)
      if (!parsed.success) {
        await reply.code(400).send({ error: 'Message body required.' })
        return
      }
      const [row] = await db
        .insert(schema.ticketMessages)
        .values({ ticketId, authorId: req.user!.id, body: parsed.data.body })
        .returning()
      // Bump the parent so it sorts to the top of the user's list.
      await db
        .update(schema.supportTickets)
        .set({ updatedAt: new Date() })
        .where(eq(schema.supportTickets.id, ticketId))
      return { message: serializeMessage(row) }
    })
  })
}
