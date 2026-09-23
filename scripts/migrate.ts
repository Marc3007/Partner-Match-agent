/**
 * Idempotent schema migration -- run manually (`npx tsx scripts/migrate.ts`)
 * against DATABASE_URL. Safe to re-run: every statement in db/schema.sql
 * uses IF NOT EXISTS. No ORM/migration framework: the schema is small and
 * stable enough that a single reviewable SQL file is clearer than a chain
 * of generated migration diffs.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Point it at any Postgres instance (Vercel Postgres, Neon, Supabase, local, ...).');
    process.exit(1);
  }
  const pool = new Pool({ connectionString });
  const sql = readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
