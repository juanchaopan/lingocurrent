import 'server-only';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { channels, articles, articleSentences, sourceItems } from './content-schema.ts';
import { mediaAssets } from './media-schema.ts';
import type { Database } from './connection.ts';

export const fixtureSchema = z.strictObject({
  title: z.string().min(1),
  body: z.string().min(1),
  feedUrl: z.url(),
  sourceUrl: z.url(),
  articleId: z.uuid(),
});

export function waveDuration(audio: Buffer) {
  if (audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('Fixture audio must be WAV.');
  let byteRate = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= audio.length;) {
    const size = audio.readUInt32LE(offset + 4);
    const kind = audio.toString('ascii', offset, offset + 4);
    if (offset + 8 + size > audio.length) throw new Error('Truncated fixture audio.');
    if (kind === 'fmt ' && size >= 16) byteRate = audio.readUInt32LE(offset + 16);
    if (kind === 'data') dataBytes += size;
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || !dataBytes) throw new Error('Fixture audio is incomplete.');
  return Math.ceil((dataBytes / byteRate) * 1000);
}

export async function saveFixture(
  db: Database,
  input: unknown,
  asset: {
    objectKey: string;
    objectVersion: string;
    checksum: string;
    byteSize: number;
    durationMs: number;
  },
) {
  const fixture = fixtureSchema.parse(input);
  return db.transaction(async (tx) => {
    const [channel] = await tx.select().from(channels).where(eq(channels.feedUrl, fixture.feedUrl));
    if (!channel || channel.enabled) throw new Error('Import the disabled fixture channel first.');
    const [media] = await tx
      .insert(mediaAssets)
      .values({ ...asset, state: 'ready' })
      .onConflictDoUpdate({
        target: [mediaAssets.objectKey, mediaAssets.objectVersion],
        set: {
          state: 'ready',
          durationMs: asset.durationMs,
          checksum: asset.checksum,
          byteSize: asset.byteSize,
        },
      })
      .returning();
    const externalKeyHash = createHash('sha256').update(fixture.sourceUrl).digest('hex');
    const [item] = await tx
      .insert(sourceItems)
      .values({ sourceId: channel.sourceId, externalKeyHash })
      .onConflictDoUpdate({
        target: [sourceItems.sourceId, sourceItems.externalKeyHash],
        set: { externalKeyHash },
      })
      .returning();
    const values = {
      id: fixture.articleId,
      channelId: channel.id,
      sourceItemId: item.id,
      sourceUrl: fixture.sourceUrl,
      title: fixture.title,
      categorySnapshot: channel.category,
      bodyText: fixture.body,
      bodyHash: createHash('sha256').update(fixture.body).digest('hex'),
      state: 'ready' as const,
      currentAssetId: media.id,
      publishedAt: new Date(),
    };
    await tx
      .insert(articles)
      .values(values)
      .onConflictDoUpdate({ target: articles.id, set: values });
    await tx.delete(articleSentences).where(eq(articleSentences.articleId, fixture.articleId));
    await tx.insert(articleSentences).values({
      articleId: fixture.articleId,
      sentenceIndex: 0,
      paragraphIndex: 0,
      text: fixture.body,
      bodyStart: 0,
      bodyEnd: fixture.body.length,
      startMs: 0,
      endMs: asset.durationMs,
    });
    return { articleId: fixture.articleId, durationMs: asset.durationMs };
  });
}
