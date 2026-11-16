import { it, expect, vi } from 'vitest';
import { createWorkspace, type MemberServices } from './workspace-core';

it('takes visit ownership only from the checked session membership', async () => {
  const services = {
    member: { id: 'owner-a' },
    content: { find: vi.fn().mockResolvedValue({ id: 'article' }), list: vi.fn() },
    reading: { visit: vi.fn().mockResolvedValue({ lastVisitedAt: 'now' }) },
    media: { asset: vi.fn() },
  } satisfies MemberServices;
  const run = vi.fn(async (_id, action) => action(services));
  const workspace = createWorkspace({ session: async () => 'clerk-a', run, sign: vi.fn() });
  await workspace.visit('article', 'operation');
  expect(run).toHaveBeenCalledWith('clerk-a', expect.any(Function));
  expect(services.reading.visit).toHaveBeenCalledWith('owner-a', 'article', 'operation');
});

it('does not sign private media for an unauthenticated caller', async () => {
  const sign = vi.fn();
  const run = vi.fn();
  const workspace = createWorkspace({ session: async () => null, run, sign });
  await expect(workspace.play('article')).rejects.toMatchObject({ status: 401 });
  expect(run).not.toHaveBeenCalled();
  expect(sign).not.toHaveBeenCalled();
});
