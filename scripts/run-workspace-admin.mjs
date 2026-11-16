import { spawnSync } from 'node:child_process';

const allowed = new Set(['seed-fixture', 'channels-preview', 'channels-apply', 'grant', 'revoke']);
if (!allowed.has(process.env.OPERATION)) throw new Error('Unknown admin operation.');
if (!/^fixtures\/[A-Za-z0-9/_-]+\.json$/.test(process.env.MANIFEST ?? ''))
  throw new Error('Use a reviewed fixtures JSON path.');
if (process.env.OPERATION === 'seed-fixture' && process.env.WORKSPACE_ENV !== 'staging')
  throw new Error('Fixture seeding is staging-only.');
function run(...args) {
  const result = spawnSync(
    process.execPath,
    ['--conditions=react-server', 'scripts/workspace-admin.mjs', ...args],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
switch (process.env.OPERATION) {
  case 'seed-fixture':
    run('channels', 'fixtures/channels.json', '--apply');
    run('fixture');
    break;
  case 'channels-preview':
    run('channels', process.env.MANIFEST);
    break;
  case 'channels-apply':
    run('channels', process.env.MANIFEST);
    run('channels', process.env.MANIFEST, '--apply');
    break;
  default:
    run(process.env.OPERATION, process.env.CLERK_USER_ID ?? '');
}
