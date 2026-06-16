/** Drizzle + postgres.js connection, shared across routes. */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// Supabase's pooled connection works with prepare: false.
const queryClient = postgres(env.DATABASE_URL, { prepare: false })

export const db = drizzle(queryClient, { schema })
export { schema }
