import { sql } from 'drizzle-orm';
import { pgTable, uuid, primaryKey, index, text, check } from 'drizzle-orm/pg-core';
import { instant } from './columns.ts';
import { members } from './identity-schema.ts';
import { articles } from './content-schema.ts';

export const visits = pgTable(
  'visits',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => members.id),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    firstOpenedAt: instant('first_opened_at').notNull().defaultNow(),
    lastOpenedAt: instant('last_opened_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.articleId] }),
    index('visit_order').on(t.ownerId, t.lastOpenedAt, t.articleId),
  ],
);

export const mutationReceipts = pgTable(
  'mutation_receipts',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => members.id),
    operationId: uuid('operation_id').notNull(),
    kind: text('kind').notNull(),
    requestHash: text('request_hash').notNull(),
    state: text('state', { enum: ['claimed', 'committed', 'unknown'] }).notNull(),
    leaseUntil: instant('lease_until'),
    fence: text('fence'),
    resultResourceId: uuid('result_resource_id'),
    expiresAt: instant('expires_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.operationId] }),
    index('receipt_expiry').on(t.expiresAt),
    check('receipt_state', sql`${t.state} in ('claimed', 'committed', 'unknown')`),
  ],
);
