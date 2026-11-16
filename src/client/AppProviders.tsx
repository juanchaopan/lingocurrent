'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(
    () => () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    [queryClient],
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
