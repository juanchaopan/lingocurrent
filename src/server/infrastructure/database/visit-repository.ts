import 'server-only';
import { and, eq, lte, sql } from 'drizzle-orm';
import { ApplicationError } from '../../../shared/contracts/errors.ts';
import { articles } from './content-schema.ts';
import { mutationReceipts, visits } from './reading-schema.ts';
import type { Transaction } from './connection.ts';

export function visitRepository(tx: Transaction) {
  return {
    async visit(ownerId: string, articleId: string, operationId: string) {
      const [article] = await tx
        .select({ id: articles.id })
        .from(articles)
        .where(and(eq(articles.id, articleId), eq(articles.state, 'ready')))
        .for('key share');
      if (!article) throw new ApplicationError('NOT_FOUND', 'Article not found.', 404);
      await tx
        .delete(mutationReceipts)
        .where(
          and(eq(mutationReceipts.ownerId, ownerId), lte(mutationReceipts.expiresAt, sql`now()`)),
        );
      // The owner lock serializes visit operations with revocation and duplicate receipts.
      const key = and(
        eq(mutationReceipts.ownerId, ownerId),
        eq(mutationReceipts.operationId, operationId),
      );
      const [receipt] = await tx.select().from(mutationReceipts).where(key);
      if (receipt && receipt.expiresAt > new Date()) {
        if (receipt.kind !== 'visit' || receipt.requestHash !== articleId) {
          throw new ApplicationError(
            'OPERATION_MISMATCH',
            'Operation ID was used for another request.',
            409,
          );
        }
        const [saved] = await tx
          .select()
          .from(visits)
          .where(and(eq(visits.ownerId, ownerId), eq(visits.articleId, articleId)));
        if (saved) return { lastVisitedAt: saved.lastOpenedAt.toISOString() };
      }
      const [saved] = await tx
        .insert(visits)
        .values({ ownerId, articleId })
        .onConflictDoUpdate({
          target: [visits.ownerId, visits.articleId],
          set: { lastOpenedAt: sql`clock_timestamp()` },
        })
        .returning();
      await tx
        .insert(mutationReceipts)
        .values({
          ownerId,
          operationId,
          kind: 'visit',
          requestHash: articleId,
          state: 'committed',
          resultResourceId: articleId,
          expiresAt: sql`now() + interval '24 hours'`,
        })
        .onConflictDoUpdate({
          target: [mutationReceipts.ownerId, mutationReceipts.operationId],
          set: {
            kind: 'visit',
            requestHash: articleId,
            state: 'committed',
            resultResourceId: articleId,
            expiresAt: sql`now() + interval '24 hours'`,
          },
        });
      return { lastVisitedAt: saved.lastOpenedAt.toISOString() };
    },
  };
}
