export type Member = { id: string; status: 'active' | 'revoked' };
export type MemberRepository = { find: (clerkUserId: string) => Promise<Member | null> };
