import { afterEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useReadingWorkspace } from './useReadingWorkspace';
import { readingApi } from './workspace';

vi.mock('./workspace', () => ({ readingApi: { list: vi.fn(), open: vi.fn(), play: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

it('opens a deep-linked article again with a fresh operation when the page reloads', async () => {
  vi.mocked(readingApi.list).mockResolvedValue([]);
  const open = vi.mocked(readingApi.open).mockRejectedValue(new Error('Test save.'));
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const first = renderHook(() => useReadingWorkspace('user-a', 'article-id'), { wrapper });
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  first.unmount();
  const second = renderHook(() => useReadingWorkspace('user-a', 'article-id'), { wrapper });
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  expect(open.mock.calls.map(([id]) => id)).toEqual(['article-id', 'article-id']);
  expect(open.mock.calls[0][1]).not.toBe(open.mock.calls[1][1]);
  second.unmount();
  client.clear();
});

it('keeps the same operation ID on a save retry and refreshes visits on returning', async () => {
  const list = vi.mocked(readingApi.list).mockResolvedValue([]);
  const open = vi
    .mocked(readingApi.open)
    .mockRejectedValueOnce(new Error('Save failed.'))
    .mockResolvedValueOnce({
      id: 'article',
      title: 'A small beginning',
      source: { id: 'source', name: 'Fixture' },
      category: 'Practice',
      body: 'Test.',
      collectedAt: '2026-11-16T12:00:00Z',
      lastVisitedAt: '2026-11-16T13:00:00Z',
      durationMs: 1000,
      sentences: [],
    });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useReadingWorkspace('user-a'), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.onOpen('article'));
  await waitFor(() => expect(result.current.error).toBe('Save failed.'));
  expect(result.current.article).toBeUndefined();
  act(() => result.current.onRetry());
  await waitFor(() => expect(result.current.article?.lastVisitedAt).toBe('2026-11-16T13:00:00Z'));
  expect(open.mock.calls[0][1]).toBe(open.mock.calls[1][1]);
  expect(open.mock.calls[0][1]).toMatch(/^[a-f0-9-]{36}$/);
  const calls = list.mock.calls.length;
  act(() => result.current.onClose());
  await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(calls));
  expect(result.current.article).toBeUndefined();
  unmount();
  client.clear();
});
