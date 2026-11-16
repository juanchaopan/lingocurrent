import { z } from 'zod';

export const resourceId = z.uuid();
export const visitInput = z.strictObject({ operationId: resourceId });
export const playbackInput = z.strictObject({ kind: z.literal('article'), articleId: resourceId });
export const memberSchema = z.object({ id: resourceId });
export const sentenceSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1),
  paragraphIndex: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
});
export const articleSummarySchema = z.object({
  id: resourceId,
  title: z.string(),
  source: z.object({ id: resourceId, name: z.string() }),
  category: z.string(),
  collectedAt: z.iso.datetime(),
  lastVisitedAt: z.iso.datetime().nullable(),
});
export const articleSchema = articleSummarySchema.extend({
  body: z.string(),
  durationMs: z.number().int().positive(),
  sentences: z.array(sentenceSchema).min(1),
});
export const visitSchema = z.object({ lastVisitedAt: z.iso.datetime() });
export const playbackSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type ArticleSummary = z.infer<typeof articleSummarySchema>;
export type Article = z.infer<typeof articleSchema>;
