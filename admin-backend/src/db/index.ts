import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost/postgres';

// Configure TLS based on URL. Self-hosted PostgreSQL typically has no TLS,
// while managed services (Neon, Supabase) require it.
const needsSSL = /sslmode=require|neon\.tech|supabase\.co/.test(connectionString);

const client = postgres(connectionString, {
  ssl: needsSSL ? 'require' : false,
  max: 10, // connection pool size
});

export const db = drizzle(client, { schema });
