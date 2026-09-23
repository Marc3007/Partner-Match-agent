import { Pool } from 'pg';

/**
 * Portable to any Postgres provider (Vercel Postgres/Neon, Supabase,
 * Railway, self-hosted, local dev) via a single DATABASE_URL connection
 * string -- deliberately not tied to one vendor's proprietary serverless
 * driver, so switching providers later is a config change, not a rewrite.
 *
 * A module-level singleton pool, reused across warm serverless invocations
 * on the same instance (Vercel keeps a function instance warm between
 * requests) and safe to recreate on cold start. `max: 1` keeps each
 * function instance's own connection footprint small, since Postgres has a
 * hard connection limit and a serverless deployment can scale to many
 * concurrent instances -- for meaningfully higher traffic, a pooler
 * (PgBouncer, or the provider's built-in pooling endpoint) is the next
 * step, not a bigger `max` here.
 */
let pool: Pool | null = null;

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ connectionString, max: 1, idleTimeoutMillis: 10_000 });
  }
  return pool;
}

/**
 * True when a database is actually configured. Every caller that logs or
 * reads demand-signal data must check this and degrade gracefully (skip
 * logging, or show "no database configured" in the admin dashboard) rather
 * than throw -- analytics must never be able to break the core matching
 * product, and the app must keep working before a database is provisioned.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
