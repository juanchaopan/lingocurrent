import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

export function connectDatabase(url: string) {
  const client = postgres(url, { max: 3, prepare: false, connect_timeout: 10, idle_timeout: 20 });
  return { client, db: drizzle(client) };
}
export type Database = ReturnType<typeof connectDatabase>['db'];
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
