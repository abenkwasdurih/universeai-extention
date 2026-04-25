import { pgTable, serial, varchar, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

export const sharedSessions = pgTable('shared_sessions', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 255 }).notNull().default('Uncategorized'),
  siteName: varchar('site_name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  encryptedCookies: text('encrypted_cookies').notNull(),
  uiConfig: jsonb('ui_config'), // e.g. { hiddenSelectors: ['.premium-banner', '#billing'] }
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const extensionUsers = pgTable('extension_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  iconUrl: varchar('icon_url', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
