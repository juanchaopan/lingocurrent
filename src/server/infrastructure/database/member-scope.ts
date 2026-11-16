import 'server-only';
import { and, eq } from 'drizzle-orm';
import { members } from './identity-schema.ts';
import { articles } from './content-schema.ts';
import { mediaAssets } from './media-schema.ts';
import { requireMember } from '../../modules/identity/services/membership.ts';
import { articleService } from '../../modules/content/services/articles.ts';
import { readingService } from '../../modules/reading/services/visits.ts';
import { mediaService } from '../../modules/media/services/playback.ts';
import { articleRepository } from './article-repository.ts';
import { visitRepository } from './visit-repository.ts';
import type { Database } from './connection.ts';

export function memberScope(db: Database) {
  return async function run<T>(
    clerkId: string,
    action: (services: {
      member: { id: string };
      content: ReturnType<typeof articleService>;
      reading: ReturnType<typeof readingService>;
      media: ReturnType<typeof mediaService>;
    }) => Promise<T>,
  ) {
    return db.transaction(async (tx) => {
      const member = await requireMember(
        {
          async find(id) {
            const [row] = await tx
              .select()
              .from(members)
              .where(eq(members.clerkUserId, id))
              .for('update');
            return row ?? null;
          },
        },
        clerkId,
      );
      return action({
        member,
        content: articleService(articleRepository(tx)),
        reading: readingService(visitRepository(tx)),
        media: mediaService({
          async asset(articleId) {
            const [row] = await tx
              .select({
                objectKey: mediaAssets.objectKey,
                objectVersion: mediaAssets.objectVersion,
              })
              .from(mediaAssets)
              .innerJoin(articles, eq(articles.currentAssetId, mediaAssets.id))
              .where(
                and(
                  eq(articles.id, articleId),
                  eq(articles.state, 'ready'),
                  eq(mediaAssets.state, 'ready'),
                ),
              );
            return row ?? null;
          },
        }),
      });
    });
  };
}
