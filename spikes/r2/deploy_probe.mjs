import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import path from 'node:path';

if (process.platform !== 'linux' || process.env.CI !== 'true') {
  throw new Error('Run through the reviewed branch workflow on Linux.');
}
const cloud = path.resolve('spikes/r2/cloud');
const reportRoot = path.resolve('.ai-review-context/r2-output');
mkdirSync(path.join(cloud, '.vercel'), { recursive: true });
mkdirSync(reportRoot, { recursive: true });
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_ORG_ID;
const project = process.env.VERCEL_PROJECT_ID;
if (!token || !team || !project) throw new Error('Staging deployment configuration is missing.');
writeFileSync(
  path.join(cloud, '.vercel/project.json'),
  JSON.stringify({ orgId: team, projectId: project }),
);

async function api(endpoint) {
  const result = await fetch('https://api.vercel.com' + endpoint, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(30000),
  });
  if (!result.ok) throw new Error('Vercel metadata request returned ' + result.status);
  return result.json();
}

function cli(args) {
  const childEnvironment = { ...process.env };
  delete childEnvironment.OPENAI_API_KEY;
  const result = spawnSync('pnpm', ['dlx', 'vercel@65.16.0', ...args, '--token', token], {
    cwd: cloud,
    env: childEnvironment,
    encoding: 'utf8',
    maxBuffer: 10_000_000,
  });
  if (result.status !== 0) {
    let diagnostic = result.stderr ?? '';
    for (const value of [token, process.env.OPENAI_API_KEY]) {
      if (value) diagnostic = diagnostic.replaceAll(value, '[redacted]');
    }
    process.stderr.write(diagnostic);
    throw new Error('Vercel CLI operation failed.');
  }
  return result.stdout;
}

function sizes(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((sum, item) => {
    const filename = path.join(directory, item.name);
    return sum + (item.isDirectory() ? sizes(filename) : statSync(filename).size);
  }, 0);
}

if (process.argv[2] === 'cleanup') {
  const completed = path.join(reportRoot, 'deployment.json');
  const pending = path.join(reportRoot, 'pending-deployment.json');
  if (!existsSync(completed) && !existsSync(pending)) process.exit(0);
  const record = JSON.parse(readFileSync(existsSync(completed) ? completed : pending, 'utf8'));
  const identifier = record.id ?? new URL(record.url).hostname;
  const remote = await api(`/v13/deployments/${identifier}?teamId=${team}`);
  if (
    remote.projectId !== project ||
    remote.target === 'production' ||
    remote.meta?.r2ProbeSha !== process.env.GITHUB_SHA
  ) {
    throw new Error('Cleanup ownership check failed.');
  }
  const result = await fetch(`https://api.vercel.com/v13/deployments/${remote.id}?teamId=${team}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!result.ok) throw new Error('Probe cleanup failed: ' + result.status);
  console.log('Deleted the matching nonproduction probe deployment.');
  process.exit(0);
}

const account = await api('/v2/teams/' + team);
if (account.billing?.plan !== 'hobby')
  throw new Error('Actual account is not Hobby; inspect before claiming Hobby evidence.');
// Build without the shared model credential. This also exposes the actual function footprint.
cli(['build', '--yes', '--target', 'preview']);
const functionRoot = path.join(cloud, '.vercel/output/functions');
if (!existsSync(functionRoot)) throw new Error('No Python function was built.');
const functionBytes = sizes(functionRoot);
writeFileSync(
  path.join(reportRoot, 'build.json'),
  JSON.stringify(
    {
      engine: process.env.PROBE_ENGINE,
      plan: account.billing.plan,
      total_function_output_bytes: functionBytes,
      note: 'Actual local Vercel build output, including function config. Provider deployment acceptance is separate.',
    },
    null,
    2,
  ) + '\n',
);
const ownerKey = JSON.parse(readFileSync('spikes/r2/owner-public-key.json', 'utf8')).ed25519;
const args = [
  'deploy',
  '--prebuilt',
  '--yes',
  '--meta',
  'r2ProbeSha=' + process.env.GITHUB_SHA,
  '--env',
  'PROBE_ENGINE=' + process.env.PROBE_ENGINE,
  '--env',
  'PROBE_OWNER_PUBLIC_KEY=' + ownerKey,
  '--env',
  'PROBE_RUNNER_PUBLIC_KEY=' + process.env.PROBE_RUNNER_PUBLIC_KEY,
];
if (process.env.PROBE_ENGINE === 'openai') {
  if (!process.env.OPENAI_API_KEY) throw new Error('Shared model credential missing.');
  args.push('--env', 'OPENAI_API_KEY=' + process.env.OPENAI_API_KEY);
}
const stdout = cli(args);
const url = stdout.match(/https:\/\/[^\s]+\.vercel\.app/g)?.at(-1);
if (!url) throw new Error('CLI returned no deployment URL.');
writeFileSync(
  path.join(reportRoot, 'pending-deployment.json'),
  JSON.stringify({ url, sha: process.env.GITHUB_SHA }) + '\n',
);
const deployment = await api(`/v13/deployments/${new URL(url).hostname}?teamId=${team}`);
if (deployment.target === 'production' || deployment.projectId !== project)
  throw new Error('Unexpected deployment target.');
const record = {
  id: deployment.id,
  url,
  target: deployment.target,
  ready_state: deployment.readyState,
  sha: process.env.GITHUB_SHA,
  engine: process.env.PROBE_ENGINE,
  plan: account.billing.plan,
};
writeFileSync(path.join(reportRoot, 'deployment.json'), JSON.stringify(record, null, 2) + '\n');
appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
console.log(url);
