/**
 * Multi-tenant Plaid backend. Ported from the former Deno Edge Function.
 *
 * TENANCY RULE: the user id always comes from req.user (the verified JWT),
 * never the request body, and every plaid_items query goes through the
 * `items` helper which requires it. A client cannot read or sync another
 * user's bank items. Plaid secrets and access tokens never leave this server.
 */
import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '../auth/middleware'
import { db, schema } from '../db/client'
import { env, PLAID_MODE } from '../env'
import { decryptToken, encryptToken } from '../plaid/crypto'
import {
  mockTransactions,
  plaid,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  type PlaidTxn,
} from '../plaid/client'
import { randomUUID } from 'node:crypto'

type ItemRow = typeof schema.plaidItems.$inferSelect

function summary(item: ItemRow) {
  const txns = (item.transactions ?? {}) as Record<string, PlaidTxn>
  return {
    id: item.id,
    institution: item.institution,
    accountType: item.accountType,
    kind: 'plaid' as const,
    mock: item.isMock,
    count: Object.keys(txns).length,
  }
}

/** Per-user item store — every method is scoped to a user id. */
const items = {
  get: (userId: string, id: string) =>
    db
      .select()
      .from(schema.plaidItems)
      .where(and(eq(schema.plaidItems.userId, userId), eq(schema.plaidItems.id, id)))
      .limit(1)
      .then((r) => r[0] ?? null),
  list: (userId: string) =>
    db.select().from(schema.plaidItems).where(eq(schema.plaidItems.userId, userId)),
  remove: (userId: string, id: string) =>
    db
      .delete(schema.plaidItems)
      .where(and(eq(schema.plaidItems.userId, userId), eq(schema.plaidItems.id, id))),
}

export async function plaidRoutes(app: FastifyInstance): Promise<void> {
  // Health is public (the client's ConnectBank polls it before sign-in).
  app.get('/api/plaid/health', async () => ({ mode: PLAID_MODE, env: env.PLAID_ENV }))

  app.register(async (scoped) => {
    scoped.addHook('preHandler', requireUser)

    scoped.post('/api/plaid/create_link_token', async (req) => {
      const userId = req.user!.id
      if (PLAID_MODE === 'mock') return { link_token: `mock-link-${randomUUID()}`, mode: 'mock' }
      const r = await plaid('/link/token/create', {
        user: { client_user_id: userId },
        client_name: 'Money Quiz',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
      })
      return { link_token: r.link_token, mode: 'plaid' }
    })

    scoped.post('/api/plaid/mock_connect', async (req, reply) => {
      if (PLAID_MODE !== 'mock') {
        await reply.code(400).send({ error: 'mock_connect is only available in mock mode' })
        return
      }
      const body = (req.body ?? {}) as { institution?: string; accountType?: string }
      const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
      const id = `mock-${randomUUID().slice(0, 8)}`
      const [row] = await db
        .insert(schema.plaidItems)
        .values({
          id,
          userId: req.user!.id,
          institution: body.institution?.trim() || 'Sandbox Bank',
          accountType,
          isMock: true,
          transactions: mockTransactions(accountType),
        })
        .returning()
      return { item: summary(row) }
    })

    scoped.post('/api/plaid/exchange_public_token', async (req, reply) => {
      const body = (req.body ?? {}) as { public_token?: string; institution?: string; accountType?: string }
      if (!body.public_token) {
        await reply.code(400).send({ error: 'public_token required' })
        return
      }
      if (!env.PLAID_TOKEN_KEY) {
        await reply.code(500).send({ error: 'PLAID_TOKEN_KEY is not set' })
        return
      }
      const accountType = body.accountType === 'credit' ? 'credit' : 'bank'
      const r = await plaid('/item/public_token/exchange', { public_token: body.public_token })
      const [row] = await db
        .insert(schema.plaidItems)
        .values({
          id: r.item_id as string,
          userId: req.user!.id,
          institution: body.institution?.trim() || 'Bank',
          accountType,
          accessTokenEnc: encryptToken(r.access_token as string, env.PLAID_TOKEN_KEY),
          isMock: false,
          transactions: {},
        })
        .onConflictDoUpdate({
          target: schema.plaidItems.id,
          set: { accessTokenEnc: encryptToken(r.access_token as string, env.PLAID_TOKEN_KEY) },
        })
        .returning()
      return { item: summary(row) }
    })

    scoped.post('/api/plaid/sync', async (req, reply) => {
      const body = (req.body ?? {}) as { itemId?: string }
      if (!body.itemId) {
        await reply.code(400).send({ error: 'itemId required' })
        return
      }
      const item = await items.get(req.user!.id, body.itemId)
      if (!item) {
        await reply.code(404).send({ error: 'unknown item' })
        return
      }
      const txns = { ...((item.transactions ?? {}) as Record<string, PlaidTxn>) }

      if (!item.isMock) {
        if (!item.accessTokenEnc || !env.PLAID_TOKEN_KEY) {
          await reply.code(500).send({ error: 'item has no access token' })
          return
        }
        const accessToken = decryptToken(item.accessTokenEnc, env.PLAID_TOKEN_KEY)
        let cursor = item.cursor
        let hasMore = true
        while (hasMore) {
          const r = await plaid('/transactions/sync', {
            access_token: accessToken,
            cursor: cursor || undefined,
          })
          for (const t of (r.added as PlaidTxn[]) ?? []) txns[t.transaction_id] = t
          for (const t of (r.modified as PlaidTxn[]) ?? []) txns[t.transaction_id] = t
          for (const t of (r.removed as { transaction_id: string }[]) ?? []) delete txns[t.transaction_id]
          cursor = r.next_cursor as string
          hasMore = Boolean(r.has_more)
        }
        await db
          .update(schema.plaidItems)
          .set({ transactions: txns, cursor, updatedAt: new Date() })
          .where(and(eq(schema.plaidItems.userId, req.user!.id), eq(schema.plaidItems.id, item.id)))
      }

      return { item: summary({ ...item, transactions: txns }), transactions: Object.values(txns) }
    })

    scoped.get('/api/plaid/items', async (req) => ({
      items: (await items.list(req.user!.id)).map(summary),
    }))

    scoped.delete('/api/plaid/items/:id', async (req) => {
      const id = (req.params as { id: string }).id
      const item = await items.get(req.user!.id, id)
      try {
        if (item && !item.isMock && item.accessTokenEnc && env.PLAID_TOKEN_KEY) {
          const accessToken = decryptToken(item.accessTokenEnc, env.PLAID_TOKEN_KEY)
          await plaid('/item/remove', { access_token: accessToken })
        }
      } catch {
        // best-effort; remove our record regardless
      }
      await items.remove(req.user!.id, id)
      return { ok: true }
    })
  })
}
