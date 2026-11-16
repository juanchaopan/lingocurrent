import { afterEach, expect, it, vi } from 'vitest';
import { readingApi } from './workspace';

afterEach(() => vi.unstubAllGlobals());

it('never claims a visit was saved when the API refuses access', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { message: 'An active invitation is required.' } }), {
      status: 403,
    }),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(readingApi.open('id', 'operation', new AbortController().signal)).rejects.toThrow(
    'An active invitation is required.',
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('rejects an invalid successful server response', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ title: 'Missing required fields' }] })),
      ),
  );
  await expect(readingApi.list(new AbortController().signal)).rejects.toThrow();
});
