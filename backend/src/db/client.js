import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../env.js';

const url = env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);

const client = postgres(url, {
  max: env.NODE_ENV === 'production' ? 10 : 5,
  ssl: isLocal ? false : 'require',
  // Supabase transaction pooler (port 6543) does not support prepared statements.
  prepare: !url.includes(':6543'),
});

export const db = drizzle(client, { schema });
