import { z } from 'zod';
import {
  articleSchema,
  articleSummarySchema,
  playbackSchema,
  visitSchema,
} from '@/shared/contracts/reading';

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  body?: unknown,
  method = 'POST',
) {
  const response = await fetch(`/api/v1/${path}`, {
    signal,
    cache: 'no-store',
    credentials: 'same-origin',
    ...(body !== undefined && {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.object({ message: z.string() }) }).safeParse(payload);
    throw new Error(
      error.success ? error.data.error.message : 'The workspace could not load. Please try again.',
    );
  }
  return z.object({ data: schema }).parse(payload).data;
}

export const readingApi = {
  list: (signal: AbortSignal) => request('articles', z.array(articleSummarySchema), signal),
  async open(id: string, operationId: string, signal: AbortSignal) {
    const article = await request(`articles/${id}`, articleSchema, signal);
    const visit = await request(
      `articles/${id}/visit`,
      visitSchema,
      signal,
      { operationId },
      'PUT',
    );
    return { ...article, lastVisitedAt: visit.lastVisitedAt };
  },
  play: (articleId: string, signal: AbortSignal) =>
    request('media/playback', playbackSchema, signal, { kind: 'article', articleId }),
};
