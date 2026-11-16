import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  unique,
  primaryKey,
  index,
  check,
  customType,
} from 'drizzle-orm/pg-core';
import { id, instant } from './columns.ts';
import { mediaAssets } from './media-schema.ts';

const bytes = customType<{ data: Buffer }>({ dataType: () => 'bytea' });
export const sourceIcons = pgTable(
  'source_icons',
  {
    id: id(),
    bytes: bytes('bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    checksum: text('checksum').notNull().unique(),
  },
  (t) => [check('icon_size', sql`${t.byteSize} between 1 and 65536`)],
);
export const sources = pgTable(
  'sources',
  {
    id: id(),
    name: text('name').notNull().unique(),
    allowedOrigin: text('allowed_origin').notNull(),
    iconId: uuid('icon_id').references(() => sourceIcons.id),
    termsReviewedAt: instant('terms_reviewed_at'),
    enabled: boolean('enabled').notNull().default(false),
  },
  (t) => [check('source_terms', sql`not ${t.enabled} or ${t.termsReviewedAt} is not null`)],
);
export const channels = pgTable('channels', {
  id: id(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  name: text('name').notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  category: text('category').notNull(),
  timezone: text('timezone').notNull(),
  enabled: boolean('enabled').notNull().default(false),
});
export const channelSchedules = pgTable(
  'channel_schedules',
  {
    id: id(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id),
    localTime: text('local_time').notNull(),
    targetCount: integer('target_count').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    nextRunAt: instant('next_run_at'),
  },
  (t) => [
    unique().on(t.channelId, t.localTime),
    index('schedule_due').on(t.enabled, t.nextRunAt),
    check('schedule_count', sql`${t.targetCount} > 0`),
    check('schedule_time', sql`${t.localTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  ],
);
export const sourceItems = pgTable(
  'source_items',
  {
    id: id(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    externalKeyHash: text('external_key_hash').notNull(),
    firstSeenAt: instant('first_seen_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.sourceId, t.externalKeyHash)],
);
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });
export const articles = pgTable(
  'articles',
  {
    id: id(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id),
    sourceItemId: uuid('source_item_id')
      .notNull()
      .unique()
      .references(() => sourceItems.id),
    sourceUrl: text('source_url').notNull(),
    title: text('title').notNull(),
    categorySnapshot: text('category_snapshot').notNull(),
    collectedAt: instant('collected_at').notNull().defaultNow(),
    publishedAt: instant('published_at'),
    bodyHash: text('body_hash').notNull(),
    bodyText: text('body_text').notNull(),
    bodyFts: tsvector('body_fts').generatedAlwaysAs(sql`to_tsvector('english', body_text)`),
    state: text('state', { enum: ['preparing', 'ready'] }).notNull(),
    currentAssetId: uuid('current_asset_id').references(() => mediaAssets.id),
  },
  (t) => [
    index('article_order').on(t.state, t.collectedAt, t.id),
    index('article_search').using('gin', t.bodyFts),
    check('article_state', sql`${t.state} in ('preparing', 'ready')`),
    check(
      'article_ready',
      sql`${t.state} <> 'ready' or (${t.currentAssetId} is not null and ${t.publishedAt} is not null)`,
    ),
  ],
);
export const articleSentences = pgTable(
  'article_sentences',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    sentenceIndex: integer('sentence_index').notNull(),
    paragraphIndex: integer('paragraph_index').notNull(),
    text: text('text').notNull(),
    bodyStart: integer('body_start').notNull(),
    bodyEnd: integer('body_end').notNull(),
    startMs: integer('start_ms'),
    endMs: integer('end_ms'),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.sentenceIndex] }),
    check(
      'sentence_range',
      sql`${t.sentenceIndex} >= 0 and ${t.paragraphIndex} >= 0 and ${t.bodyStart} >= 0 and ${t.bodyEnd} > ${t.bodyStart}`,
    ),
    check(
      'sentence_time',
      sql`(${t.startMs} is null and ${t.endMs} is null) or (${t.startMs} >= 0 and ${t.endMs} > ${t.startMs})`,
    ),
  ],
);
