/**
 * Typed environment for the Node API. Loads server/.env, then validates.
 * Everything bank/auth-sensitive lives here, never in the frontend bundle.
 */
import { config } from 'dotenv'
import { z } from 'zod'

config()

const schema = z.object({
  // Postgres connection string (Supabase-hosted, or any Postgres).
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase project — used ONLY to verify auth JWTs (login is still Supabase).
  SUPABASE_URL: z.string().url().optional(),
  // Legacy HS256 JWT secret (Settings → API → JWT Secret). Optional when the
  // project uses asymmetric keys (we verify via JWKS instead).
  SUPABASE_JWT_SECRET: z.string().optional(),

  // The seed admin account (granted role=admin on first sign-in).
  ADMIN_EMAIL: z.string().email().default('doloyede00@gmail.com'),

  // Plaid (optional — unset ⇒ mock mode with realistic fake data).
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.string().default('sandbox'),
  PLAID_PRODUCTS: z.string().default('transactions'),
  PLAID_COUNTRY_CODES: z.string().default('US'),
  // 32-byte base64 key for AES-256-GCM encryption of Plaid access tokens.
  PLAID_TOKEN_KEY: z.string().optional(),

  PORT: z.coerce.number().default(8787),
  // Comma-separated allowlist for CORS (only needed for split-origin deploys).
  CORS_ORIGINS: z.string().optional(),
  // Serve the built frontend (dist/) from this server in production.
  SERVE_STATIC: z.coerce.boolean().default(false),
  SENTRY_DSN: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('[money-quiz] Invalid server environment:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export const PLAID_MODE: 'plaid' | 'mock' =
  env.PLAID_CLIENT_ID && env.PLAID_SECRET ? 'plaid' : 'mock'
