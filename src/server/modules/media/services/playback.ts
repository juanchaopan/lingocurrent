import { ApplicationError } from '../../../../shared/contracts/errors.ts';

export type PlaybackAsset = { objectKey: string; objectVersion: string };
export type MediaRepository = { asset: (articleId: string) => Promise<PlaybackAsset | null> };
export function mediaService(repository: MediaRepository) {
  return {
    async asset(articleId: string) {
      const asset = await repository.asset(articleId);
      if (!asset) throw new ApplicationError('NOT_FOUND', 'Audio not found.', 404);
      return asset;
    },
  };
}
