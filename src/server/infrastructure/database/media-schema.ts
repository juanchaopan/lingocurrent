import { bigint, integer, pgTable, text, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { id, instant } from './columns.ts';

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: id(),
    objectKey: text('object_key').notNull(),
    objectVersion: text('object_version').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    durationMs: integer('duration_ms'),
    firstCreatedAt: instant('first_created_at').notNull().defaultNow(),
    checksum: text('checksum').notNull(),
    state: text('state', { enum: ['staging', 'ready', 'retiring'] }).notNull(),
    retireAttempts: integer('retire_attempts').notNull().default(0),
    retryAt: instant('retry_at'),
  },
  (t) => [
    unique().on(t.objectKey, t.objectVersion),
    check('asset_size', sql`${t.byteSize} > 0`),
    check('asset_duration', sql`${t.durationMs} is null or ${t.durationMs} > 0`),
    check('asset_state', sql`${t.state} in ('staging', 'ready', 'retiring')`),
  ],
);
