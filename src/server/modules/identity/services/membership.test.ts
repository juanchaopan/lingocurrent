import { describe, it, expect, vi } from 'vitest';
import { requireMember } from './membership';

describe('membership authorization', () => {
  it('rejects anonymous callers without looking up a client-provided owner', async () => {
    const find = vi.fn();
    await expect(requireMember({ find }, null)).rejects.toMatchObject({ status: 401 });
    expect(find).not.toHaveBeenCalled();
  });
  it('rejects unknown and revoked identities and rechecks the next request', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'member', status: 'revoked' })
      .mockResolvedValueOnce({ id: 'member', status: 'active' });
    await expect(requireMember({ find }, 'clerk-id')).rejects.toMatchObject({ status: 403 });
    await expect(requireMember({ find }, 'clerk-id')).rejects.toMatchObject({ status: 403 });
    await expect(requireMember({ find }, 'clerk-id')).resolves.toEqual({ id: 'member' });
    expect(find).toHaveBeenCalledTimes(3);
  });
});
