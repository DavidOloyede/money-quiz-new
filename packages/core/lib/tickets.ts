/**
 * Client for the support-ticket routes. Tickets are per-user (the API scopes
 * every query to the signed-in user); admins answer from the web admin panel.
 * Platform-neutral so the phone's Support card and future surfaces share it.
 */
import { api } from './api'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Ticket {
  id: string
  user_id: string
  subject: string
  body: string
  category: string | null
  status: TicketStatus
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
}

export const TICKET_CATEGORIES = ['Bug', 'Question', 'Feature request', 'Bank connection', 'Other']

export const ticketsApi = {
  list: () => api.get<{ tickets: Ticket[] }>('/tickets'),
  create: (subject: string, body: string, category: string) =>
    api.post<{ ticket: Ticket }>('/tickets', { subject, body, category }),
  messages: (ticketId: string) =>
    api.get<{ messages: TicketMessage[] }>(`/tickets/${encodeURIComponent(ticketId)}/messages`),
  reply: (ticketId: string, body: string) =>
    api.post<{ message: TicketMessage }>(`/tickets/${encodeURIComponent(ticketId)}/messages`, {
      body,
    }),
}
