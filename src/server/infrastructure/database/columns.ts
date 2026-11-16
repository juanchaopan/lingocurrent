import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().defaultRandom();
export const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
