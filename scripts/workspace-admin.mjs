import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { connectDatabase } from '../src/server/infrastructure/database/connection.ts';
import { importChannels } from '../src/server/infrastructure/database/channel-import.ts';
import {
  fixtureSchema,
  saveFixture,
  waveDuration,
} from '../src/server/infrastructure/database/fixture.ts';
import { members } from '../src/server/infrastructure/database/identity-schema.ts';
import { storageClient } from '../src/server/infrastructure/storage.ts';

async function fixture(db) {
  if (process.env.WORKSPACE_ENV !== 'staging' && process.env.WORKSPACE_ENV !== 'local')
    throw new Error('Fixtures are allowed only in staging or local.');
  const input = fixtureSchema.parse(JSON.parse(await readFile('fixtures/reading.json', 'utf8')));
  const audio = await readFile('fixtures/reading.wav');
  const checksum = createHash('sha256').update(audio).digest('hex');
  const durationMs = waveDuration(audio);
  const objectKey = `fixtures/${checksum}.wav`;
  const client = storageClient();
  try {
    const saved = await ensureAudio(client, objectKey, audio);
    return await saveFixture(db, input, {
      objectKey,
      objectVersion: saved.VersionId ?? 'null',
      checksum,
      byteSize: audio.length,
      durationMs,
    });
  } finally {
    client.destroy();
  }
}

async function ensureAudio(client, objectKey, audio) {
  const location = { Bucket: process.env.S3_BUCKET, Key: objectKey };
  try {
    const saved = await client.send(new HeadObjectCommand(location));
    if (saved.ContentLength !== audio.length) throw new Error('Fixture object size mismatch.');
    return saved;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404) throw error;
  }
  return client.send(new PutObjectCommand({ ...location, Body: audio, ContentType: 'audio/wav' }));
}

async function member(db, clerkUserId, status) {
  if (!/^user_[A-Za-z0-9]+$/.test(clerkUserId ?? ''))
    throw new Error('Supply a Clerk user ID, never an email or password.');
  if (status === 'revoked') {
    const rows = await db
      .update(members)
      .set({ status })
      .where(eq(members.clerkUserId, clerkUserId))
      .returning({ id: members.id });
    if (!rows.length) throw new Error('Member does not exist.');
  } else {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Clerk user could not be verified in this environment.');
    await db
      .insert(members)
      .values({ clerkUserId, status })
      .onConflictDoUpdate({ target: members.clerkUserId, set: { status } });
  }
  return { status };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const [command, arg, flag] = process.argv.slice(2);
  const { client, db } = connectDatabase(process.env.DATABASE_URL);
  try {
    if (command === 'channels')
      return await importChannels(db, JSON.parse(await readFile(arg, 'utf8')), flag === '--apply');
    if (command === 'fixture') return await fixture(db);
    if (command === 'grant') return await member(db, arg, 'active');
    if (command === 'revoke') return await member(db, arg, 'revoked');
    throw new Error(
      'Use channels <file> [--apply], fixture, grant <Clerk user ID>, or revoke <Clerk user ID>.',
    );
  } finally {
    await client.end();
  }
}

try {
  console.log(JSON.stringify(await main(), null, 2));
} catch {
  console.error(
    'Workspace admin failed. Check the command, validated input, environment and provider status; no credentials are logged.',
  );
  process.exitCode = 1;
}
