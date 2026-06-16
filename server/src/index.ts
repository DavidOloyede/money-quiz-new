/**
 * Money Quiz API — Node.js (Fastify) backend.
 *
 * The single API the web/mobile clients call: cloud sync, Plaid, support
 * tickets, admin, and activity logging, all against PostgreSQL. Authentication
 * is delegated to Supabase Auth; this server only verifies the JWTs it issues.
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env'
import { PlaidError } from './plaid/client'
import { meRoutes } from './routes/me'
import { syncRoutes } from './routes/sync'
import { eventRoutes } from './routes/events'
import { plaidRoutes } from './routes/plaid'
import { ticketRoutes } from './routes/tickets'
import { adminRoutes } from './routes/admin'

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors, {
  origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((s) => s.trim()) : true,
  credentials: true,
})

// Surface Plaid API failures with their upstream status + code.
app.setErrorHandler((err, _req, reply) => {
  if (err instanceof PlaidError) {
    return reply.code(err.status).send({ error: err.message, plaid: err.plaid })
  }
  app.log.error(err)
  const status = (err as { statusCode?: number }).statusCode ?? 500
  return reply.code(status >= 400 ? status : 500).send({ error: 'internal error' })
})

app.get('/api/health', async () => ({ ok: true }))

await app.register(meRoutes)
await app.register(syncRoutes)
await app.register(eventRoutes)
await app.register(plaidRoutes)
await app.register(ticketRoutes)
await app.register(adminRoutes)

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`[money-quiz] API on http://localhost:${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
