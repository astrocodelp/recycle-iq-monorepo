import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

const isNeon = (url: string) => /\.neon\.tech|\.neon\.build/.test(url);

let cached: Db | undefined;

/**
 * Lazily created database client.
 * - Neon URLs use the serverless HTTP driver (fast cold starts on Vercel).
 * - Anything else (local Docker, CI) uses node-postgres.
 * Both expose the same Drizzle query API; avoid interactive transactions in app code.
 */
export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  cached = isNeon(url)
    ? (drizzleNeon({ client: neon(url), schema }) as unknown as Db)
    : drizzlePg({ client: new pg.Pool({ connectionString: url, max: 5 }), schema });
  return cached;
}

/** A dedicated node-postgres connection for scripts (migrate, seed). Works against Neon too. */
export function scriptDb(): { db: Db; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  return { db: drizzlePg({ client: pool, schema }), close: () => pool.end() };
}
