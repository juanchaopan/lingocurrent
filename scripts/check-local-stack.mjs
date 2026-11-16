import { setTimeout } from 'node:timers/promises';

const upstreams = new Set();
for (let request = 0; request < 12; request++) {
  const response = await fetch('http://127.0.0.1:3000/api/health', { cache: 'no-store' });
  if (!response.ok) throw new Error('The local proxy did not return a healthy app.');
  const health = await response.json();
  if (health.status !== 'ok' || health.service !== 'lingocurrent')
    throw new Error('Unexpected health contract.');
  const upstream = response.headers.get('x-local-upstream');
  if (!upstream) throw new Error('The proxy did not identify the upstream replica.');
  upstreams.add(upstream);
  await setTimeout(100);
}
if (upstreams.size !== 2)
  throw new Error('Expected exactly two app replicas, received ' + upstreams.size);
const bucket = await fetch('http://127.0.0.1:9000/lingocurrent-local', { method: 'HEAD' });
if (!bucket.ok) throw new Error('The local S3 fixture bucket is unavailable.');
console.log('Verified two healthy app replicas, proxy balancing, and the S3 fixture bucket.');
