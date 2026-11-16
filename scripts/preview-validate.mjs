import { appendFileSync } from 'node:fs';

const number = process.env.PR_NUMBER;
const sha = process.env.APPROVED_SHA;
if (!/^[1-9]\d*$/.test(number ?? '') || !/^[a-f0-9]{40}$/.test(sha ?? '')) {
  throw new Error('A PR number and exact reviewed SHA are required.');
}
const response = await fetch(
  'https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/pulls/' + number,
  {
    headers: {
      Authorization: 'Bearer ' + process.env.GH_TOKEN,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(15000),
  },
);
if (!response.ok) throw new Error('Could not verify the PR.');
const pr = await response.json();
if (
  pr.state !== 'open' ||
  pr.head.repo.full_name !== process.env.GITHUB_REPOSITORY ||
  pr.head.sha !== sha
) {
  throw new Error(
    'Only the current, reviewed same-repository PR head can receive testing credentials.',
  );
}
const checks = await fetch(
  'https://api.github.com/repos/' +
    process.env.GITHUB_REPOSITORY +
    '/commits/' +
    sha +
    '/check-runs',
  {
    headers: {
      Authorization: 'Bearer ' + process.env.GH_TOKEN,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(15000),
  },
);
if (
  !checks.ok ||
  !(await checks.json()).check_runs.some(
    (check) => check.name === 'ci' && check.conclusion === 'success',
  )
) {
  throw new Error('The approved head must pass CI first.');
}
appendFileSync(process.env.GITHUB_OUTPUT, 'sha=' + sha + '\n');
