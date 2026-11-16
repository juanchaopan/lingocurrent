import 'server-only';
import { and, eq, desc } from 'drizzle-orm';
import { articles, articleSentences, channels, sources } from './content-schema.ts';
import { visits } from './reading-schema.ts';
import { mediaAssets } from './media-schema.ts';
import { articleSchema, type ArticleSummary } from '../../../shared/contracts/reading.ts';
import type { Transaction } from './connection.ts';

export function articleRepository(tx: Transaction) {
  const select = (ownerId: string) =>
    tx
      .select({
        article: articles,
        source: { id: sources.id, name: sources.name },
        lastVisitedAt: visits.lastOpenedAt,
        durationMs: mediaAssets.durationMs,
      })
      .from(articles)
      .innerJoin(channels, eq(channels.id, articles.channelId))
      .innerJoin(sources, eq(sources.id, channels.sourceId))
      .innerJoin(
        mediaAssets,
        and(eq(mediaAssets.id, articles.currentAssetId), eq(mediaAssets.state, 'ready')),
      )
      .leftJoin(visits, and(eq(visits.articleId, articles.id), eq(visits.ownerId, ownerId)));
  const summary = (row: Awaited<ReturnType<typeof select>>[number]): ArticleSummary => ({
    id: row.article.id,
    title: row.article.title,
    source: row.source,
    category: row.article.categorySnapshot,
    collectedAt: row.article.collectedAt.toISOString(),
    lastVisitedAt: row.lastVisitedAt?.toISOString() ?? null,
  });
  return {
    async list(ownerId: string) {
      const rows = await select(ownerId)
        .where(eq(articles.state, 'ready'))
        .orderBy(desc(articles.collectedAt), desc(articles.id));
      return rows.map(summary);
    },
    async find(ownerId: string, id: string) {
      const [row] = await select(ownerId).where(
        and(eq(articles.id, id), eq(articles.state, 'ready')),
      );
      if (!row) return null;
      const sentences = await tx
        .select({
          index: articleSentences.sentenceIndex,
          paragraphIndex: articleSentences.paragraphIndex,
          text: articleSentences.text,
          startMs: articleSentences.startMs,
          endMs: articleSentences.endMs,
        })
        .from(articleSentences)
        .where(eq(articleSentences.articleId, id))
        .orderBy(articleSentences.sentenceIndex);
      return articleSchema.parse({
        ...summary(row),
        body: row.article.bodyText,
        durationMs: row.durationMs,
        sentences,
      });
    },
  };
}
