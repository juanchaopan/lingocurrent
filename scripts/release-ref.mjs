import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
let sha = process.env.CI_SHA;
if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
  const tag = process.env.RELEASE_TAG ?? '';
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error('An existing vX.Y.Z tag is required.');
  sha = git('rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}');
  git('merge-base', '--is-ancestor', sha, 'origin/main');
  const url = new URL(
    'https://api.github.com/repos/' +
      process.env.GITHUB_REPOSITORY +
      '/actions/workflows/ci.yml/runs',
  );
  url.searchParams.set('head_sha', sha);
  url.searchParams.set('status', 'success');
  url.searchParams.set('event', 'push');
  const response = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + process.env.GH_TOKEN,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Could not verify release CI.');
  const runs = await response.json();
  if (!runs.workflow_runs?.some((run) => run.head_branch === 'main')) {
    throw new Error('The tagged commit must have successful push CI on main.');
  }
}
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('A validated commit SHA is required.');
appendFileSync(process.env.GITHUB_OUTPUT, 'sha=' + sha + '\n');
