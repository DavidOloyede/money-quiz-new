/**
 * Map Drizzle rows (camelCase) to the snake_case JSON the clients consume.
 * Keeping the wire format snake_case matches the rest of the API and the
 * frontend's existing types.
 */
import type { schema } from './client'

type Profile = typeof schema.profiles.$inferSelect
type Ticket = typeof schema.supportTickets.$inferSelect
type Message = typeof schema.ticketMessages.$inferSelect
type Event = typeof schema.activityEvents.$inferSelect

export const serializeProfile = (p: Profile) => ({
  id: p.id,
  email: p.email,
  display_name: p.displayName,
  role: p.role,
  created_at: p.createdAt,
})

export const serializeTicket = (t: Ticket) => ({
  id: t.id,
  user_id: t.userId,
  subject: t.subject,
  body: t.body,
  category: t.category,
  status: t.status,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
})

export const serializeMessage = (m: Message) => ({
  id: m.id,
  ticket_id: m.ticketId,
  author_id: m.authorId,
  body: m.body,
  created_at: m.createdAt,
})

export const serializeEvent = (e: Event) => ({
  id: e.id,
  user_id: e.userId,
  session_id: e.sessionId,
  name: e.name,
  props: e.props,
  client_ts: e.clientTs,
  created_at: e.createdAt,
})
