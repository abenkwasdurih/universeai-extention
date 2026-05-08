/**
 * One-time script: push schema to TARGET database (the new self-hosted one).
 *
 * Usage:
 *   npx tsx scripts/push-schema.ts
 *
 * Requires TARGET_DATABASE_URL in .env.migration
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const TARGET_URL = process.env.TARGET_DATABASE_URL;
if (!TARGET_URL) {
  console.error('TARGET_DATABASE_URL must be set in .env.migration');
  process.exit(1);
}

const sql = postgres(TARGET_URL, {
  ssl: /sslmode=require|neon\.tech|supabase\.co/.test(TARGET_URL) ? 'require' : false,
});

const DDL = `
CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "icon_url" varchar(1000),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "categories_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "extension_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "extension_users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "shared_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" varchar(255) DEFAULT 'Uncategorized' NOT NULL,
  "site_name" varchar(255) NOT NULL,
  "domain" varchar(255) NOT NULL,
  "encrypted_cookies" text NOT NULL,
  "ui_config" jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

async function main() {
  try {
    console.log('Pushing schema to target database...');
    await sql.unsafe(DDL);
    console.log('✓ Schema created successfully');
  } catch (err) {
    console.error('✗ Schema push failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
