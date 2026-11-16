import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for migrations.');
  process.exit(1);
}
if (!existsSync('drizzle/meta/_journal.json')) {
  console.log('No reviewed migrations have been introduced yet.');
  process.exit(0);
}
const result = spawnSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs', 'migrate'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
