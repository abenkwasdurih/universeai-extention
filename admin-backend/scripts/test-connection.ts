/**
 * Test connection to source and target databases.
 * Usage: npx tsx scripts/test-connection.ts
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

async function testConnection(label: string, url: string | undefined) {
  if (!url) {
    console.log(`✗ ${label}: URL not set`);
    return;
  }

  const masked = url.replace(/:[^:@]+@/, ':***@');
  console.log(`\nTesting ${label}: ${masked}`);

  const sql = postgres(url, {
    ssl: /sslmode=require|neon\.tech|supabase\.co/.test(url) ? 'require' : false,
    connect_timeout: 10,
  });

  try {
    const [row] = await sql`SELECT version() as version, current_database() as db`;
    console.log(`  ✓ Connected`);
    console.log(`  Database: ${row.db}`);
    console.log(`  Version: ${String(row.version).substring(0, 60)}...`);
  } catch (err: any) {
    console.log(`  ✗ Failed: ${err.message}`);
  } finally {
    await sql.end();
  }
}

(async () => {
  await testConnection('SOURCE (Neon)', process.env.SOURCE_DATABASE_URL);
  await testConnection('TARGET (Coolify)', process.env.TARGET_DATABASE_URL);
})();
