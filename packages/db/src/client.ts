import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

const isNeon = (url: string) => /\.neon\.tech|\.neon\.build/.test(url);

/**
 * Connection strings. The Vercel/Neon integration names them DATABASE_URL and DATABASE_URL_UNPOOLED,
 * or POSTGRES_URL / POSTGRES_URL_NON_POOLING, and adds a prefix when one is chosen at connect time
 * (e.g. NEON_DATABASE_URL). Accept all of these so a deploy works however Neon was connected.
 */
function findEnv(exact: string[], suffixes: string[]): string | undefined {
  for (const k of exact) if (process.env[k]) return process.env[k];
  for (const [k, v] of Object.entries(process.env)) if (v && suffixes.some((s) => k.endsWith(s))) return v;
  return undefined;
}
export function databaseUrl(): string | undefined {
  return findEnv(['DATABASE_URL', 'POSTGRES_URL'], ['_DATABASE_URL', '_POSTGRES_URL']);
}
export function unpooledDatabaseUrl(): string | undefined {
  return (
    findEnv(['DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'], ['_DATABASE_URL_UNPOOLED', '_POSTGRES_URL_NON_POOLING']) ??
    databaseUrl()
  );
}

let cached: Db | undefined;

/**
 * Lazily created database client.
 * - Neon URLs use the serverless HTTP driver (fast cold starts on Vercel).
 * - Anything else (local Docker, CI) uses node-postgres.
 * Both expose the same Drizzle query API; avoid interactive transactions in app code.
 */
export function getDb(): Db {
  if (cached) return cached;
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  cached = isNeon(url)
    ? (drizzleNeon({ client: neon(url), schema }) as unknown as Db)
    : drizzlePg({ client: new pg.Pool({ connectionString: url, max: 5 }), schema });
  return cached;
}

/** A dedicated node-postgres connection for scripts (migrate, seed). Works against Neon too. */
export function scriptDb(): { db: Db; close: () => Promise<void> } {
  const url = unpooledDatabaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set.');
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  return { db: drizzlePg({ client: pool, schema }), close: () => pool.end() };
}
