import { spawnSync } from 'node:child_process';

if (process.platform === 'win32')
  throw new Error('Deploy from the reviewed GitHub Actions workflow.');

const keys = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'SCHEDULE_ENABLED',
];
for (const name of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'DATABASE_URL']) {
  if (!process.env[name]) throw new Error(name + ' must be configured before deployment.');
}
const args = ['dlx', 'vercel@65.16.0', 'deploy', '--yes', '--token', process.env.VERCEL_TOKEN];
if (process.env.PREVIEW_PR) {
  if (!/^[1-9]\d*$/.test(process.env.PREVIEW_PR)) throw new Error('Invalid preview PR number.');
  args.push(
    '--meta',
    'lingocurrentPr=' + process.env.PREVIEW_PR,
    '--meta',
    'lingocurrentRepository=' + process.env.GITHUB_REPOSITORY,
  );
} else {
  args.push('--prod');
}
for (const key of keys) {
  if (process.env[key])
    args.push('--env', key + '=' + process.env[key], '--build-env', key + '=' + process.env[key]);
}
const result = spawnSync('pnpm', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
