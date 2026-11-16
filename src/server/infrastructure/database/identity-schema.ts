import { pgTable, text, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { id, instant } from './columns.ts';

export const members = pgTable(
  'members',
  {
    id: id(),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    status: text('status', { enum: ['active', 'revoked'] }).notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [check('member_status', sql`${t.status} in ('active', 'revoked')`)],
);
