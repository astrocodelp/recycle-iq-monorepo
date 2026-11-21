import './env';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { scriptDb, unpooledDatabaseUrl } from './client';

// `--if-configured`: used in the Vercel build so a build without a database (e.g. a fork) still passes.
if (process.argv.includes('--if-configured') && !unpooledDatabaseUrl()) {
  console.log('DATABASE_URL not set: skipping migrations');
  process.exit(0);
}

const { db, close } = scriptDb();
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
console.log('migrations applied');
await close();
