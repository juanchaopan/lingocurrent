import { ApplicationError } from '../../shared/contracts/errors.ts';
import type { articleService } from '../modules/content/services/articles.ts';
import type { readingService } from '../modules/reading/services/visits.ts';
import type { mediaService, PlaybackAsset } from '../modules/media/services/playback.ts';

export type MemberServices = {
  member: { id: string };
  content: ReturnType<typeof articleService>;
  reading: ReturnType<typeof readingService>;
  media: ReturnType<typeof mediaService>;
};
type Dependencies = {
  session: () => Promise<string | null>;
  run: <T>(clerkId: string, action: (services: MemberServices) => Promise<T>) => Promise<T>;
  sign: (asset: PlaybackAsset) => Promise<{ url: string; expiresAt: string }>;
};
export function createWorkspace({ session, run, sign }: Dependencies) {
  async function authorized<T>(action: (services: MemberServices) => Promise<T>) {
    const clerkId = await session();
    if (!clerkId) throw new ApplicationError('UNAUTHENTICATED', 'Sign in to continue.', 401);
    return run(clerkId, action);
  }
  return {
    me: () => authorized(async ({ member }) => member),
    list: () => authorized(({ member, content }) => content.list(member.id)),
    article: (id: string) => authorized(({ member, content }) => content.find(member.id, id)),
    visit: (id: string, operationId: string) =>
      authorized(async ({ member, content, reading }) => {
        await content.find(member.id, id);
        return reading.visit(member.id, id, operationId);
      }),
    async play(id: string) {
      const asset = await authorized(({ media }) => media.asset(id));
      return sign(asset);
    },
  };
}
