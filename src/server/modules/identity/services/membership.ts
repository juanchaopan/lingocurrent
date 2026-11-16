import { ApplicationError } from '../../../../shared/contracts/errors.ts';
import type { MemberRepository } from '../repositories/members.ts';

export async function requireMember(repository: MemberRepository, clerkUserId: string | null) {
  if (!clerkUserId) throw new ApplicationError('UNAUTHENTICATED', 'Sign in to continue.', 401);
  const member = await repository.find(clerkUserId);
  if (!member || member.status !== 'active') {
    throw new ApplicationError('NOT_A_MEMBER', 'An active invitation is required.', 403);
  }
  return { id: member.id };
}
