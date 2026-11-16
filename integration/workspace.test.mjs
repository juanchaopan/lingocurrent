import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connectDatabase } from '../src/server/infrastructure/database/connection.ts';
import { importChannels } from '../src/server/infrastructure/database/channel-import.ts';
import { saveFixture, waveDuration } from '../src/server/infrastructure/database/fixture.ts';
import { memberScope } from '../src/server/infrastructure/database/member-scope.ts';
import { members } from '../src/server/infrastructure/database/identity-schema.ts';
import {
  sources,
  channels,
  channelSchedules,
  articles,
} from '../src/server/infrastructure/database/content-schema.ts';
import { visits, mutationReceipts } from '../src/server/infrastructure/database/reading-schema.ts';
import { apiResponse, requireSameOrigin } from '../src/server/application/http.ts';

test('database authorization, transactions and fixture lifecycle', async (t) => {
  assert.equal(
    process.env.TEST_DATABASE_IS_DISPOSABLE,
    'true',
    'Use a disposable test database only.',
  );
  assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL is required.');
  const { db, client } = connectDatabase(process.env.TEST_DATABASE_URL);
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    const manifest = JSON.parse(await readFile('fixtures/channels.json', 'utf8'));
    const fixture = JSON.parse(await readFile('fixtures/reading.json', 'utf8'));
    await t.test('preview is read-only; repeated imports preserve identities', async () => {
      await importChannels(db, manifest, false);
      assert.equal((await db.select().from(sources)).length, 0);
      await importChannels(db, manifest, true);
      const before = await db.select().from(channelSchedules);
      await importChannels(db, manifest, true);
      assert.deepEqual(await db.select().from(channelSchedules), before);
      assert.equal((await db.select().from(channels)).length, 1);
      assert.equal(before[0].enabled, false);
    });
    await t.test('a conflict rolls back the entire manifest', async () => {
      const invalid = structuredClone(manifest);
      invalid.sources[0].name = 'Conflicting source';
      await assert.rejects(importChannels(db, invalid, true), /reassigned/);
      assert.equal((await db.select().from(sources)).length, 1);
    });
    await t.test('changing an origin cannot leave retained feeds outside it', async () => {
      const invalid = structuredClone(manifest);
      invalid.sources[0].allowedOrigin = 'https://other.example.org';
      invalid.sources[0].channels[0].feedUrl = 'https://other.example.org/feed';
      await assert.rejects(importChannels(db, invalid, true), /retained channels/);
      assert.equal((await db.select().from(sources))[0].allowedOrigin, 'https://example.org');
    });
    const durationMs = waveDuration(await readFile('fixtures/reading.wav'));
    assert.ok(durationMs > 500);
    await saveFixture(db, fixture, {
      objectKey: 'fixture.wav',
      objectVersion: 'null',
      checksum: 'test',
      byteSize: 100,
      durationMs,
    });
    const [alice, bob] = await db
      .insert(members)
      .values([
        { clerkUserId: 'user_testalice', status: 'active' },
        { clerkUserId: 'user_testbob', status: 'active' },
      ])
      .returning();
    const run = memberScope(db);
    await t.test('concurrent retries write one visit and one receipt', async () => {
      const operationId = randomUUID();
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          run(alice.clerkUserId, ({ member, reading }) =>
            reading.visit(member.id, fixture.articleId, operationId),
          ),
        ),
      );
      assert.ok(responses.every((value) => value.lastVisitedAt === responses[0].lastVisitedAt));
      assert.equal((await db.select().from(visits)).length, 1);
      assert.equal((await db.select().from(mutationReceipts)).length, 1);
    });
    await t.test('another member never receives the first member visit', async () => {
      const aliceArticles = await run(alice.clerkUserId, ({ member, content }) =>
        content.list(member.id),
      );
      const bobArticles = await run(bob.clerkUserId, ({ member, content }) =>
        content.list(member.id),
      );
      assert.ok(aliceArticles[0].lastVisitedAt);
      assert.equal(bobArticles[0].lastVisitedAt, null);
      await run(bob.clerkUserId, ({ member, reading }) =>
        reading.visit(member.id, fixture.articleId, randomUUID()),
      );
      assert.equal((await db.select().from(visits)).length, 2);
    });
    await t.test('new visits remove the owners expired technical receipts', async () => {
      const expiredId = randomUUID();
      await db.insert(mutationReceipts).values({
        ownerId: bob.id,
        operationId: expiredId,
        kind: 'visit',
        requestHash: fixture.articleId,
        state: 'committed',
        expiresAt: new Date(0),
      });
      await run(bob.clerkUserId, ({ member, reading }) =>
        reading.visit(member.id, fixture.articleId, randomUUID()),
      );
      assert.equal(
        (
          await db
            .select()
            .from(mutationReceipts)
            .where(eq(mutationReceipts.operationId, expiredId))
        ).length,
        0,
      );
    });
    await t.test('revocation and unknown identities fail closed', async () => {
      await db.update(members).set({ status: 'revoked' }).where(eq(members.id, alice.id));
      await assert.rejects(
        run(alice.clerkUserId, async () => 'must not run'),
        { status: 403 },
      );
      await assert.rejects(
        run('user_unknown', async () => 'must not run'),
        { status: 403 },
      );
    });
    await t.test('deleting an article cascades only its visits and sentences', async () => {
      await db.delete(articles).where(eq(articles.id, fixture.articleId));
      assert.equal((await db.select().from(visits)).length, 0);
      assert.equal((await db.select().from(members)).length, 2);
    });
    await t.test(
      'private errors conceal database credentials and reject cross-site writes',
      async () => {
        const response = await apiResponse(async () => {
          throw new Error('postgres://secret');
        });
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.ok(!(await response.text()).includes('postgres://secret'));
        assert.throws(
          () =>
            requireSameOrigin(
              new Request('https://app.example/api', {
                headers: { Origin: 'https://attacker.example' },
              }),
            ),
          { status: 403 },
        );
      },
    );
  } finally {
    await client.end();
  }
});
