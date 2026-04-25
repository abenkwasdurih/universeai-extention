import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Will fallback to a dummy string if not provided, just to avoid crashing during build
const sql = neon(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost/postgres');
export const db = drizzle(sql, { schema });
