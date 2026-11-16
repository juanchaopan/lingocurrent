import { appendFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const base =
  'https://console.neon.tech/api/v2/projects/' +
  encodeURIComponent(process.env.NEON_PROJECT_ID) +
  '/branches/' +
  encodeURIComponent(process.env.NEON_BRANCH_ID);
const headers = {
  Authorization: 'Bearer ' + process.env.NEON_API_KEY,
  'Content-Type': 'application/json',
};
let storage;
for (let attempt = 0; attempt < 30; attempt++) {
  const response = await fetch(base + '/storage', { headers, signal: AbortSignal.timeout(10000) });
  if (response.ok) {
    storage = await response.json();
    if (storage.enabled && storage.s3_endpoint) break;
  }
  if ([401, 403].includes(response.status))
    throw new Error('Preview storage authorization failed.');
  await setTimeout(2000);
}
if (!storage?.enabled || !storage.s3_endpoint)
  throw new Error('Preview storage is not ready; no staging/production fallback is allowed.');
const response = await fetch(base + '/credentials', {
  method: 'POST',
  headers,
  body: JSON.stringify({ scopes: ['storage:read', 'storage:write'], principal_type: 'user' }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error('Could not create branch-scoped storage credentials.');
const credential = await response.json();
const values = {
  S3_ENDPOINT: storage.s3_endpoint,
  S3_REGION: storage.region,
  S3_ACCESS_KEY_ID: credential.token_id,
  S3_SECRET_ACCESS_KEY: credential.s3_secret_access_key,
};
for (const [name, value] of Object.entries(values)) {
  if (typeof value !== 'string' || !value || /[\r\n]/.test(value))
    throw new Error('Invalid preview storage binding.');
  process.stdout.write('::add-mask::' + value + '\n');
  appendFileSync(process.env.GITHUB_ENV, name + '=' + value + '\n');
}
