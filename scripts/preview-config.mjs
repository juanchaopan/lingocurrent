for (const name of [
  'NEON_PROJECT_ID',
  'NEON_SEED_BRANCH',
  'S3_BUCKET',
  'VERCEL_PROJECT_ID',
  'VERCEL_ORG_ID',
  'NEON_API_KEY',
  'VERCEL_TOKEN',
]) {
  if (!process.env[name])
    throw new Error(name + ' must be configured; no default preview parent is allowed.');
}
