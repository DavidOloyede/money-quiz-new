/**
 * Database schema (Drizzle). Plain tables — per-user access is enforced in the
 * API routes (every query filters by the JWT-derived user id), not by RLS.
 *
 * `user_id` is the Supabase auth user id (the JWT `sub`). There is deliberately
 * no DB foreign key to auth.users: it keeps this schema self-contained and a
 * future migration off Supabase Auth painless.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Cloud mirror of the app's localStorage slices (one row per user + key). */
export const userSlices = pgTable(
  'user_slices',
  {
    userId: uuid('user_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    rev: integer('rev').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
)

/** Bank connections. access_token_enc is AES-256-GCM ciphertext, never plaintext. */
export const plaidItems = pgTable(
  'plaid_items',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    institution: text('institution').notNull().default('Bank'),
    accountType: text('account_type').notNull().default('bank'), // 'bank' | 'credit'
    accessTokenEnc: text('access_token_enc'),
    isMock: boolean('is_mock').notNull().default(false),
    cursor: text('cursor'),
    transactions: jsonb('transactions').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('plaid_items_user').on(t.userId)],
)

/** Product analytics + domain events. Props never carry financial details. */
export const activityEvents = pgTable(
  'activity_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id').notNull(),
    sessionId: text('session_id').notNull(),
    name: text('name').notNull(),
    props: jsonb('props').notNull().default({}),
    clientTs: timestamp('client_ts', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_created').on(t.createdAt),
    index('events_user').on(t.userId, t.createdAt),
  ],
)

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    category: text('category'),
    status: text('status').notNull().default('open'), // open|in_progress|resolved|closed
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tickets_status').on(t.status, t.createdAt)],
)

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id').notNull(),
    authorId: uuid('author_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ticket_messages_ticket').on(t.ticketId, t.createdAt)],
)
