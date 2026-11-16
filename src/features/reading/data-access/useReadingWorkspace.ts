import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { readingApi } from './workspace';

export function useReadingWorkspace(userId: string, initialArticleId?: string) {
  const [selection, setSelection] = useState<{ id: string; operationId: string } | undefined>(() =>
    initialArticleId ? { id: initialArticleId, operationId: crypto.randomUUID() } : undefined,
  );
  const [wantsAudio, setWantsAudio] = useState(false);
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['member', userId, 'articles'],
    queryFn: ({ signal }) => readingApi.list(signal),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ['member', userId, 'article', selection?.id, selection?.operationId],
    queryFn: ({ signal }) => readingApi.open(selection!.id, selection!.operationId, signal),
    enabled: Boolean(selection),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const audio = useQuery({
    queryKey: ['member', userId, 'audio', selection?.id],
    queryFn: ({ signal }) => readingApi.play(selection!.id, signal),
    enabled: wantsAudio && Boolean(detail.data),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const onClose = () => {
    setSelection(undefined);
    setWantsAudio(false);
    void queryClient.invalidateQueries({ queryKey: ['member', userId, 'articles'] });
  };
  const onRetry = () => {
    void list.refetch();
    if (selection) void detail.refetch();
    if (wantsAudio) void audio.refetch();
  };
  const state = viewState(list, detail, audio, Boolean(selection), wantsAudio);
  return {
    ...state,
    onClose,
    onRetry,
    onPlay: () => setWantsAudio(true),
    onOpen: (id: string) => {
      setWantsAudio(false);
      setSelection({ id, operationId: crypto.randomUUID() });
    },
  };
}

type QueryState<T> = { data?: T; error: Error | null; isPending: boolean };
function viewState(
  list: QueryState<Awaited<ReturnType<typeof readingApi.list>>>,
  detail: QueryState<Awaited<ReturnType<typeof readingApi.open>>>,
  audio: QueryState<Awaited<ReturnType<typeof readingApi.play>>> & { isFetching: boolean },
  selected: boolean,
  wantsAudio: boolean,
) {
  const error = [list.error, detail.error, audio.error].find(Boolean)?.message;
  return {
    articles: list.data ?? [],
    article: selected ? detail.data : undefined,
    loading: list.isPending || (selected && detail.isPending),
    error,
    audioUrl: wantsAudio ? audio.data?.url : undefined,
    audioLoading: audio.isFetching,
  };
}
