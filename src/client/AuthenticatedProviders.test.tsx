import { expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { AuthenticatedProviders } from './AuthenticatedProviders';

let userId = 'user-a';
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId, sessionId: `session-${userId}` }) }));

it('destroys the previous personal query cache when the Clerk identity changes', async () => {
  let previous: QueryClient;
  function Probe() {
    const client = useQueryClient();
    if (userId === 'user-a') {
      previous = client;
      client.setQueryData(['private'], 'Alice data');
    }
    return <p>{String(client.getQueryData(['private']) ?? 'Empty')}</p>;
  }
  const { rerender } = render(
    <AuthenticatedProviders>
      <Probe />
    </AuthenticatedProviders>,
  );
  expect(screen.getByText('Alice data')).toBeVisible();
  userId = 'user-b';
  rerender(
    <AuthenticatedProviders>
      <Probe />
    </AuthenticatedProviders>,
  );
  expect(screen.getByText('Empty')).toBeVisible();
  await waitFor(() => expect(previous!.getQueryData(['private'])).toBeUndefined());
});
