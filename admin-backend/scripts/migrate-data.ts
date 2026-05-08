/**
 * One-time migration script: copy data from Neon -> Self-hosted Postgres.
 *
 * Usage:
 *   npx tsx scripts/migrate-data.ts
 *
 * Requires env vars (set in .env.migration or shell):
 *   SOURCE_DATABASE_URL  - Neon connection string
 *   TARGET_DATABASE_URL  - Coolify Postgres external connection string
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Error: SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be set in .env.migration');
  process.exit(1);
}

const source = postgres(SOURCE_URL, { ssl: 'require' });
const target = postgres(TARGET_URL, {
  ssl: /sslmode=require|neon\.tech|supabase\.co/.test(TARGET_URL) ? 'require' : false,
});

async function migrateTable(tableName: string) {
  console.log(`\nMigrating table: ${tableName}`);

  // 1. Read all rows from source
  const rows = await source.unsafe(`SELECT * FROM ${tableName}`);
  console.log(`  Found ${rows.length} rows in source`);

  if (rows.length === 0) return;

  // 2. Clear target table (optional - remove if you want to append)
  await target.unsafe(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
  console.log(`  Cleared target table`);

  // 3. Insert into target
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(', ');

  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    await target.unsafe(
      `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`,
      values as any,
    );
  }

  console.log(`  Inserted ${rows.length} rows into target`);

  // 4. Reset sequence for tables with serial id
  if (columns.includes('id')) {
    await target.unsafe(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1)) FROM ${tableName}`,
    );
    console.log(`  Reset id sequence`);
  }
}

async function main() {
  console.log('Starting data migration...');
  console.log(`Source: ${SOURCE_URL!.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`Target: ${TARGET_URL!.replace(/:[^:@]+@/, ':***@')}`);

  try {
    // Order matters for foreign keys (none in this schema, but just in case)
    await migrateTable('categories');
    await migrateTable('extension_users');
    await migrateTable('shared_sessions');

    console.log('\n✓ Migration completed successfully');
  } catch (err) {
    console.error('\n✗ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await source.end();
    await target.end();
  }
}

main();
