const pr = process.env.PREVIEW_PR;
if (!/^[1-9]\d*$/.test(pr ?? '')) throw new Error('A PR number is required.');
for (const name of ['VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_ORG_ID']) {
  if (!process.env[name]) throw new Error(name + ' is required for preview cleanup.');
}
const headers = { Authorization: 'Bearer ' + process.env.VERCEL_TOKEN };
let cursor;
do {
  const url = new URL('https://api.vercel.com/v7/deployments');
  url.searchParams.set('projectId', process.env.VERCEL_PROJECT_ID);
  url.searchParams.set('teamId', process.env.VERCEL_ORG_ID);
  url.searchParams.set('limit', '100');
  if (cursor) url.searchParams.set('until', cursor);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Could not list preview deployments.');
  const data = await response.json();
  for (const deployment of data.deployments) {
    if (
      deployment.target === 'production' ||
      deployment.meta?.lingocurrentPr !== pr ||
      deployment.meta?.lingocurrentRepository !== process.env.GITHUB_REPOSITORY
    )
      continue;
    const target = new URL(
      'https://api.vercel.com/v13/deployments/' + encodeURIComponent(deployment.uid),
    );
    target.searchParams.set('teamId', process.env.VERCEL_ORG_ID);
    const deleted = await fetch(target, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!deleted.ok && deleted.status !== 404)
      throw new Error('Could not delete a PR-owned preview.');
  }
  cursor = data.pagination?.next;
} while (cursor);
