import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingPanel } from './ReadingPanel';

const actions = () => ({ onOpen: vi.fn(), onClose: vi.fn(), onRetry: vi.fn(), onPlay: vi.fn() });
it('opens the selected article and reports the saved visit', async () => {
  const handlers = actions();
  render(
    <ReadingPanel
      {...handlers}
      articles={[
        {
          id: 'article-a',
          title: 'A small beginning',
          source: { id: 'source', name: 'LingoCurrent' },
          category: 'Practice',
          collectedAt: '2026-11-16T12:00:00Z',
          lastVisitedAt: '2026-11-16T13:00:00Z',
        },
      ]}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'A small beginning' }));
  expect(handlers.onOpen).toHaveBeenCalledWith('article-a');
  expect(screen.getByText(/Last visited/)).toBeVisible();
});
it('offers a retry without claiming a failed operation succeeded', async () => {
  const handlers = actions();
  render(<ReadingPanel {...handlers} articles={[]} error="Unable to save visit." />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save visit.');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(handlers.onRetry).toHaveBeenCalledOnce();
  expect(screen.queryByText(/Last visited/)).not.toBeInTheDocument();
});
